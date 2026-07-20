import { AlertCircle, Loader2, Save, Trash2, Undo2 } from 'lucide-react'
import type { Carer, ChangeItem, Client, Visit } from '@/api/types'
import { formatDateUK } from '@/lib/dates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Conflict } from './draftStore'

interface DraftTrayProps {
  drafts: ChangeItem[]
  conflicts: Record<string, Conflict>
  visitById: Map<string, Visit>
  carerById: Map<string, Carer>
  clientById: Map<string, Client>
  saving: boolean
  onUndo: (visitId: string) => void
  onDiscardAll: () => void
  onSave: () => void
}

function carerNames(carerById: Map<string, Carer>, ids: string[]): string {
  if (ids.length === 0) return 'Unassigned'
  return ids.map((id) => carerById.get(id)?.name ?? id).join(', ')
}

function describe(item: ChangeItem, carerById: Map<string, Carer>): string {
  switch (item.kind) {
    case 'cancel':
      return 'Cancelled'
    case 'assign':
      return `Assigned to ${carerNames(carerById, item.after.carer_ids)}`
    case 'reassign':
      return `${carerNames(carerById, item.before.carer_ids)} → ${carerNames(carerById, item.after.carer_ids)}`
    case 'time_change':
      return `${item.before.time_start}–${item.before.time_finish} → ${item.after.time_start}–${item.after.time_finish}`
  }
}

/** The "n unsaved changes" tray with the single Save button. */
export function DraftTray({
  drafts,
  conflicts,
  visitById,
  carerById,
  clientById,
  saving,
  onUndo,
  onDiscardAll,
  onSave,
}: DraftTrayProps) {
  if (drafts.length === 0) return null

  const conflictCount = drafts.filter((d) => conflicts[d.visit_id]).length

  return (
    <div className="sticky bottom-4 z-40 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur sm:gap-3 sm:px-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="font-semibold">
            {drafts.length} unsaved change{drafts.length === 1 ? '' : 's'}
            {conflictCount > 0 && (
              <Badge variant="red" className="ml-1">
                {conflictCount} conflict{conflictCount === 1 ? '' : 's'}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          side="top"
          className="max-h-80 w-[min(24rem,calc(100vw-2rem))] overflow-y-auto"
        >
          <ul className="space-y-2">
            {drafts.map((item) => {
              const visit = visitById.get(item.visit_id)
              const client = visit ? clientById.get(visit.client_id) : undefined
              const conflict = conflicts[item.visit_id]
              return (
                <li key={item.visit_id} className="flex items-start gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {client?.name ?? item.visit_id}
                      {visit && (
                        <span className="ml-1 font-normal text-slate-500">
                          {formatDateUK(visit.date)} {item.after.time_start}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600">{describe(item, carerById)}</div>
                    <div className="mt-0.5 flex gap-1">
                      <Badge variant={item.urgency === 'emergency' ? 'red' : 'secondary'}>
                        {item.urgency}
                      </Badge>
                      {conflict && (
                        <Badge variant="red">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          changed by someone else
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Undo change to ${client?.name ?? item.visit_id}`}
                    onClick={() => onUndo(item.visit_id)}
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </li>
              )
            })}
          </ul>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="sm" onClick={onDiscardAll} disabled={saving}>
        <Trash2 className="h-4 w-4" />
        Discard all
      </Button>
      <Button size="sm" onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save
      </Button>
    </div>
  )
}
