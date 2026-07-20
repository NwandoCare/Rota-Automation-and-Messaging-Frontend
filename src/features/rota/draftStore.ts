/**
 * Unsaved wall-chart edits. TanStack Query owns all server state; this store
 * owns ONLY the pending delta (plus any save conflicts). The chart renders
 * server data overlaid with these drafts.
 */
import { create } from 'zustand'
import type { ChangeItem, ChangeSnapshot, Visit } from '@/api/types'
import { isEmergency } from '@/lib/dates'

export interface Conflict {
  current_version: number
  current: Visit | null
}

interface DraftState {
  /** One pending change per visit — a new edit to the same visit replaces it */
  drafts: Record<string, ChangeItem>
  conflicts: Record<string, Conflict>
  addDraft: (visit: Visit, after: ChangeSnapshot) => void
  removeDraft: (visitId: string) => void
  clearAll: () => void
  setConflicts: (conflicts: Record<string, Conflict>) => void
}

function snapshotOf(visit: Visit): ChangeSnapshot {
  return {
    carer_ids: [...visit.carer_ids],
    time_start: visit.time_start,
    time_finish: visit.time_finish,
    status: visit.status,
  }
}

function sameCarers(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id))
}

function kindOf(before: ChangeSnapshot, after: ChangeSnapshot): ChangeItem['kind'] {
  if (after.status === 'cancelled') return 'cancel'
  if (!sameCarers(before.carer_ids, after.carer_ids)) {
    return before.carer_ids.length === 0 ? 'assign' : 'reassign'
  }
  return 'time_change'
}

export const useDraftStore = create<DraftState>((set) => ({
  drafts: {},
  conflicts: {},

  addDraft: (visit, after) =>
    set((state) => {
      // Chain from the original server snapshot if this visit already has a
      // draft, so before/after always spans server-state → latest-intent.
      const existing = state.drafts[visit.id]
      const before = existing ? existing.before : snapshotOf(visit)

      const unchanged =
        sameCarers(before.carer_ids, after.carer_ids) &&
        before.time_start === after.time_start &&
        before.time_finish === after.time_finish &&
        before.status === after.status
      if (unchanged) {
        const { [visit.id]: _dropped, ...drafts } = state.drafts
        return { drafts }
      }

      const item: ChangeItem = {
        visit_id: visit.id,
        version: existing ? existing.version : visit.version,
        kind: kindOf(before, after),
        before,
        after,
        urgency: isEmergency(visit.date, after.time_start) ? 'emergency' : 'future',
      }
      return { drafts: { ...state.drafts, [visit.id]: item } }
    }),

  removeDraft: (visitId) =>
    set((state) => {
      const { [visitId]: _dropped, ...drafts } = state.drafts
      const { [visitId]: _c, ...conflicts } = state.conflicts
      return { drafts, conflicts }
    }),

  clearAll: () => set({ drafts: {}, conflicts: {} }),

  setConflicts: (conflicts) => set({ conflicts }),
}))

/** Server visit + pending draft → what the page should display. */
export function applyDraft(visit: Visit, draft: ChangeItem | undefined): Visit {
  if (!draft) return visit
  return {
    ...visit,
    carer_ids: [...draft.after.carer_ids],
    time_start: draft.after.time_start,
    time_finish: draft.after.time_finish,
    status: draft.after.status,
  }
}
