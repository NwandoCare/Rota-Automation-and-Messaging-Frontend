import { AlertCircle, Ban, Undo2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Carer, ChangeSnapshot, Visit } from '@/api/types'
import { minutesSinceMidnight } from '@/lib/dates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Conflict } from './draftStore'

interface ShiftRowProps {
  /** Untouched server visit (carries version + before-state) */
  serverVisit: Visit
  /** Server visit with any pending draft applied — what the row displays */
  effective: Visit
  /** Shown in the unassigned panel where rows span multiple clients */
  clientName?: string
  carers: Carer[]
  isDraft: boolean
  conflict: Conflict | undefined
  onChange: (serverVisit: Visit, after: ChangeSnapshot) => void
  onUndo: (visitId: string) => void
}

/**
 * One editable shift: time inputs, the assigned-carer list (double-up calls
 * can have two or more carers), and cancel/undo.
 */
export function ShiftRow({
  serverVisit,
  effective,
  clientName,
  carers,
  isDraft,
  conflict,
  onChange,
  onUndo,
}: ShiftRowProps) {
  const cancelled = effective.status === 'cancelled'
  const carerById = new Map(carers.map((c) => [c.id, c]))
  const assignable = carers.filter((c) => !effective.carer_ids.includes(c.id))

  const change = (patch: Partial<ChangeSnapshot>) => {
    const after: ChangeSnapshot = {
      carer_ids: [...effective.carer_ids],
      time_start: effective.time_start,
      time_finish: effective.time_finish,
      status: effective.status,
      ...patch,
    }
    // Warn-and-confirm rather than hard-block (coordinators may be mid-edit),
    // but an inverted range on a non-overnight visit is almost always a typo.
    if (
      !effective.overnight &&
      minutesSinceMidnight(after.time_finish) <= minutesSinceMidnight(after.time_start)
    ) {
      toast.warning('Finish time is not after the start time — check this shift before saving.')
    }
    onChange(serverVisit, after)
  }

  const setCarers = (carerIds: string[]) => {
    change({
      carer_ids: carerIds,
      status: carerIds.length === 0 ? 'unassigned' : 'assigned',
    })
  }

  const addCarer = (carerId: string) => {
    if (carerId && !effective.carer_ids.includes(carerId)) {
      setCarers([...effective.carer_ids, carerId])
    }
  }

  const removeCarer = (carerId: string) => {
    setCarers(effective.carer_ids.filter((id) => id !== carerId))
  }

  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border px-3 py-2.5',
        isDraft ? 'border-amber-400 border-dashed bg-amber-50/60' : 'border-slate-200 bg-white',
        conflict && 'border-solid border-red-500 bg-red-50/60',
        cancelled && 'opacity-70',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {clientName && (
          <span className="min-w-20 truncate text-sm font-medium" title={clientName}>
            {clientName}
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <Input
            type="time"
            aria-label="Start time"
            value={effective.time_start}
            disabled={cancelled}
            onChange={(e) => e.target.value && change({ time_start: e.target.value })}
            className="w-27"
          />
          <span className="text-slate-400">–</span>
          <Input
            type="time"
            aria-label="Finish time"
            value={effective.time_finish}
            disabled={cancelled}
            onChange={(e) => e.target.value && change({ time_finish: e.target.value })}
            className="w-27"
          />
          {effective.overnight && (
            <Badge variant="secondary" title="Finishes the next day">
              overnight
            </Badge>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {cancelled && <Badge variant="red">cancelled</Badge>}
          {conflict && (
            <Badge variant="red" title="This shift was changed by someone else since you loaded it">
              <AlertCircle className="mr-1 h-3 w-3" />
              edited elsewhere
            </Badge>
          )}
          {isDraft && !conflict && <Badge variant="amber">unsaved</Badge>}
          {isDraft ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUndo(serverVisit.id)}
              aria-label="Undo this change"
            >
              <Undo2 className="h-4 w-4" />
              Undo
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-700 hover:bg-red-50"
              onClick={() => change({ status: 'cancelled' })}
              aria-label="Cancel this visit"
            >
              <Ban className="h-4 w-4" />
              <span className="hidden sm:inline">Cancel visit</span>
            </Button>
          )}
        </div>
      </div>

      {!cancelled && (
        <div className="flex flex-wrap items-center gap-1.5">
          {effective.carer_ids.length === 0 && (
            <Badge variant="amber" className="border border-amber-300">
              Unassigned
            </Badge>
          )}
          {effective.carer_ids.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-brand-100 py-0.5 pr-1 pl-2.5 text-xs font-medium text-brand-900"
            >
              {carerById.get(id)?.name ?? id}
              <button
                type="button"
                aria-label={`Remove ${carerById.get(id)?.name ?? id} from this shift`}
                onClick={() => removeCarer(id)}
                className="rounded-full p-0.5 hover:bg-brand-500 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <select
            aria-label="Add carer"
            value=""
            onChange={(e) => addCarer(e.target.value)}
            className="h-7 rounded-full border border-dashed border-slate-400 bg-white px-2 text-xs text-slate-600 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          >
            <option value="">+ Add carer</option>
            {assignable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
