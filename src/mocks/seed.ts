/**
 * Deterministic synthetic data generator.
 *
 * DATA POLICY: names are strictly synthetic ("Carer 12", "Client B7").
 * No real service user or staff data may ever appear here.
 *
 * Seeded PRNG → identical data on every reload, so demos and bug reports
 * are reproducible.
 */
import type { Area, Carer, Client, Me, Visit } from '@/api/types'
import { addDaysIso, todayLondon } from '@/lib/dates'

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20260719)

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

export const AREAS: Area[] = [
  { id: 'area-1', name: 'Barnet' },
  { id: 'area-2', name: 'Enfield' },
  { id: 'area-3', name: 'Haringey' },
]

export const ME: Me = {
  id: 'user-1',
  name: 'Demo Coordinator',
  email: 'coordinator@example.test',
  role: 'coordinator',
  // Scoped to Barnet + Enfield; Haringey exists but is out of scope,
  // proving area filtering works.
  areas: [AREAS[0], AREAS[1]],
}

const CARER_COUNT = 240
const CLIENT_COUNT = 150

export const CARERS: Carer[] = Array.from({ length: CARER_COUNT }, (_, i) => ({
  id: `carer-${i + 1}`,
  name: `Carer ${i + 1}`,
  area_id: AREAS[i % AREAS.length].id,
}))

const CLIENT_PREFIX = ['A', 'B', 'C'] as const

export const CLIENTS: Client[] = Array.from({ length: CLIENT_COUNT }, (_, i) => ({
  id: `client-${i + 1}`,
  name: `Client ${CLIENT_PREFIX[i % 3]}${Math.floor(i / 3) + 1}`,
  area_id: AREAS[i % AREAS.length].id,
}))

// Typical domiciliary call pattern: morning / lunch / tea / bed slots.
const CALL_SLOTS = [
  { start: 7 * 60, jitter: 120 },   // 07:00–09:00 morning
  { start: 12 * 60 + 30, jitter: 60 }, // lunch
  { start: 17 * 60, jitter: 60 },   // tea
  { start: 21 * 60 + 30, jitter: 30 }, // bed
] as const

const DURATIONS = [30, 45, 60] as const

function hhmm(mins: number): string {
  const clamped = ((mins % 1440) + 1440) % 1440
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Generates visits for today−1 .. today+13 (15 days). */
export function generateVisits(): Visit[] {
  const visits: Visit[] = []
  const today = todayLondon()
  let visitSeq = 1

  for (let dayOffset = -1; dayOffset <= 13; dayOffset++) {
    const date = addDaysIso(today, dayOffset)
    for (const client of CLIENTS) {
      // Each client gets 1–4 of the day's slots, stable per client.
      const slotCount = 1 + Math.floor(rand() * 4)
      const slots = [...CALL_SLOTS].sort(() => rand() - 0.5).slice(0, slotCount)
      for (const slot of slots) {
        const startMin = slot.start + Math.floor(rand() * slot.jitter)
        const duration = pick(DURATIONS)
        const overnight = rand() < 0.01
        const finishMin = overnight ? startMin + 8 * 60 : startMin + duration
        const unassigned = rand() < 0.15
        // Assign carers within the client's own area; ~10% of assigned
        // visits are double-up calls needing two carers.
        const areaCarers = CARERS.filter((c) => c.area_id === client.area_id)
        const carerIds: string[] = []
        if (!unassigned) {
          carerIds.push(pick(areaCarers).id)
          if (rand() < 0.1) {
            const second = pick(areaCarers)
            if (!carerIds.includes(second.id)) carerIds.push(second.id)
          }
        }
        visits.push({
          id: `visit-${visitSeq++}`,
          date,
          client_id: client.id,
          time_start: hhmm(startMin),
          time_finish: hhmm(finishMin),
          overnight,
          status: unassigned ? 'unassigned' : 'assigned',
          version: 1,
          carer_ids: carerIds,
        })
      }
    }
  }
  return visits
}
