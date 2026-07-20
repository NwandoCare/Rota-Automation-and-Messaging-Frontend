/**
 * In-memory mutable store behind the MSW handlers. Mutations (saves)
 * persist for the browser session so refetches see the new state,
 * mimicking a real backend.
 */
import type { ChangeItem, Visit } from '@/api/types'
import { AREAS, CARERS, CLIENTS, ME, generateVisits } from './seed'

export interface StoredChangeSet {
  id: string
  items: ChangeItem[]
  saved_at: string
}

interface Db {
  visits: Map<string, Visit>
  changeSets: Map<string, StoredChangeSet>
  /** visit ids whose carer changed in-app (drives the "covers" count) */
  coveredVisitIds: Set<string>
  changeSeq: number
}

function build(): Db {
  return {
    visits: new Map(generateVisits().map((v) => [v.id, v])),
    changeSets: new Map(),
    coveredVisitIds: new Set(),
    changeSeq: 1,
  }
}

export let db: Db = build()

export function resetDb(): void {
  db = build()
}

export const refData = { AREAS, CARERS, CLIENTS, ME }
