import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import type { ChangeSnapshot, Visit } from '@/api/types'
import { useMe, useSubmitChanges, useWallChart } from '@/api/hooks'
import { formatDateLongUK, minutesSinceMidnight, todayLondon } from '@/lib/dates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MessagingModal } from '@/features/messaging/MessagingModal'
import { DraftTray } from './DraftTray'
import { ShiftRow } from './ShiftRow'
import { applyDraft, useDraftStore, type Conflict } from './draftStore'

const selectClass =
  'mt-1 block h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none'

export function RotaPage() {
  const [params, setParams] = useSearchParams()
  const date = params.get('date') ?? todayLondon()
  const area = params.get('area') ?? 'all'
  const highlightUnassigned = params.get('filter') === 'unassigned'

  const { data: me } = useMe()
  const { data, isLoading, isError } = useWallChart(date, area)

  const drafts = useDraftStore((s) => s.drafts)
  const conflicts = useDraftStore((s) => s.conflicts)
  const addDraft = useDraftStore((s) => s.addDraft)
  const removeDraft = useDraftStore((s) => s.removeDraft)
  const clearAll = useDraftStore((s) => s.clearAll)
  const setConflicts = useDraftStore((s) => s.setConflicts)

  const submit = useSubmitChanges()

  const [clientId, setClientId] = useState('')
  const [messagingChangeId, setMessagingChangeId] = useState<string | null>(null)

  const clients = useMemo(
    () =>
      [...(data?.clients ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      ),
    [data],
  )
  const carers = useMemo(
    () =>
      [...(data?.carers ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      ),
    [data],
  )
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])
  const carerById = useMemo(() => new Map(carers.map((c) => [c.id, c])), [carers])
  const serverVisitById = useMemo(
    () => new Map((data?.visits ?? []).map((v) => [v.id, v])),
    [data],
  )

  // Selected client may fall out of scope when the area filter changes.
  useEffect(() => {
    if (clientId && data && !clientById.has(clientId)) setClientId('')
  }, [clientId, data, clientById])

  const byTime = (a: Visit, b: Visit) =>
    minutesSinceMidnight(a.time_start) - minutesSinceMidnight(b.time_start)

  /** Server visits + pending drafts, as displayed. */
  const effectiveById = useMemo(() => {
    const m = new Map<string, Visit>()
    for (const v of data?.visits ?? []) m.set(v.id, applyDraft(v, drafts[v.id]))
    return m
  }, [data, drafts])

  const unassignedVisits = useMemo(
    () =>
      [...effectiveById.values()]
        .filter((v) => v.status === 'unassigned' && v.carer_ids.length === 0)
        .sort(byTime),
    [effectiveById],
  )

  const clientVisits = useMemo(
    () =>
      clientId
        ? [...effectiveById.values()].filter((v) => v.client_id === clientId).sort(byTime)
        : [],
    [effectiveById, clientId],
  )

  const handleChange = (serverVisit: Visit, after: ChangeSnapshot) => {
    addDraft(serverVisit, after)
  }

  const handleSave = () => {
    const items = Object.values(drafts)
    if (items.length === 0) return
    submit.mutate(
      { items },
      {
        onSuccess: ({ change_id, results }) => {
          const newConflicts: Record<string, Conflict> = {}
          let appliedCount = 0
          for (const r of results) {
            if (r.status === 'applied') {
              removeDraft(r.visit_id)
              appliedCount++
            } else {
              newConflicts[r.visit_id] = {
                current_version: r.current_version ?? -1,
                current: r.current ?? null,
              }
            }
          }
          setConflicts(newConflicts)
          const conflictCount = Object.keys(newConflicts).length
          if (conflictCount > 0) {
            toast.warning(
              `${conflictCount} change${conflictCount === 1 ? ' was' : 's were'} not saved — someone else edited ${conflictCount === 1 ? 'that shift' : 'those shifts'}. Undo and re-apply on the refreshed data.`,
            )
          }
          if (appliedCount > 0) {
            toast.success(`${appliedCount} change${appliedCount === 1 ? '' : 's'} saved.`)
          }
          if (change_id) {
            setMessagingChangeId(change_id)
          }
        },
        onError: () => toast.error('Save failed — please try again.'),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Rota</h1>
          <p className="text-sm text-slate-500">{formatDateLongUK(date)}</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-end">
          <label className="text-sm text-slate-600">
            Date
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                params.set('date', e.target.value)
                setParams(params, { replace: true })
              }}
              className="mt-1 w-full sm:w-40"
            />
          </label>
          <label className="text-sm text-slate-600">
            Area
            <select
              value={area}
              onChange={(e) => {
                params.set('area', e.target.value)
                setParams(params, { replace: true })
              }}
              className={selectClass}
            >
              <option value="all">All my areas</option>
              {me?.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Client
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={`${selectClass} min-w-44`}
            >
              <option value="">— Select a client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load the rota. Check your connection and try again.
        </p>
      )}
      {isLoading && <p className="text-sm text-slate-400">Loading rota…</p>}

      {data && (
        <>
          <Card className={highlightUnassigned ? 'ring-2 ring-amber-400' : undefined}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <TriangleAlert className="h-4 w-4 text-amber-600" />
                Unassigned shifts ({unassignedVisits.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {unassignedVisits.length === 0 && (
                <p className="py-2 text-sm text-slate-500">
                  Every shift on {formatDateLongUK(date)} has a carer. 🎉
                </p>
              )}
              {unassignedVisits.map((v) => (
                <ShiftRow
                  key={v.id}
                  serverVisit={serverVisitById.get(v.id) ?? v}
                  effective={v}
                  clientName={clientById.get(v.client_id)?.name ?? v.client_id}
                  carers={carers}
                  isDraft={v.id in drafts}
                  conflict={conflicts[v.id]}
                  onChange={handleChange}
                  onUndo={removeDraft}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>
                {clientId
                  ? `Shifts for ${clientById.get(clientId)?.name ?? clientId}`
                  : 'Client shifts'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!clientId && (
                <p className="py-2 text-sm text-slate-500">
                  Pick a client from the dropdown above to view and edit their shifts for the day.
                </p>
              )}
              {clientId && clientVisits.length === 0 && (
                <p className="py-2 text-sm text-slate-500">
                  No shifts for this client on {formatDateLongUK(date)}.
                </p>
              )}
              {clientVisits.map((v) => (
                <ShiftRow
                  key={v.id}
                  serverVisit={serverVisitById.get(v.id) ?? v}
                  effective={v}
                  carers={carers}
                  isDraft={v.id in drafts}
                  conflict={conflicts[v.id]}
                  onChange={handleChange}
                  onUndo={removeDraft}
                />
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <DraftTray
        drafts={Object.values(drafts)}
        conflicts={conflicts}
        visitById={serverVisitById}
        carerById={carerById}
        clientById={clientById}
        saving={submit.isPending}
        onUndo={removeDraft}
        onDiscardAll={clearAll}
        onSave={handleSave}
      />

      <MessagingModal changeId={messagingChangeId} onClose={() => setMessagingChangeId(null)} />
    </div>
  )
}
