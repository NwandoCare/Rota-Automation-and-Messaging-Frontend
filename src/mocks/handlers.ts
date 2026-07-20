/**
 * MSW handlers — the executable specification of the backend API.
 * Response shapes must stay in lockstep with src/api/types.ts.
 */
import { HttpResponse, delay, http } from 'msw'
import type {
  ChangeResultItem,
  DashboardStats,
  MessagePreviewGroup,
  MessagePreviewResponse,
  SendMessagesRequest,
  SendMessagesResponse,
  SubmitChangesRequest,
  SubmitChangesResponse,
  Visit,
  WallChartData,
} from '@/api/types'
import { formatDateUK, todayLondon } from '@/lib/dates'
import { templateFor } from '@/features/messaging/templates'
import { db, refData } from './db'

const OFFICE_PHONE = '020 7946 0000' // synthetic

const myAreaIds = () => new Set(refData.ME.areas.map((a) => a.id))

function realistic() {
  return delay(300 + Math.floor(Math.random() * 300))
}

/**
 * Chaos rule: visits whose numeric id is divisible by 13 get their server
 * version silently bumped on first save, forcing a visible optimistic-lock
 * conflict so the conflict UI can always be demonstrated.
 */
const chaosTriggered = new Set<string>()

function maybeChaosBump(visit: Visit): void {
  const n = Number(visit.id.replace('visit-', ''))
  if (n % 13 === 0 && !chaosTriggered.has(visit.id)) {
    chaosTriggered.add(visit.id)
    visit.version += 1
  }
}

export const handlers = [
  http.get('/api/me', async () => {
    await realistic()
    return HttpResponse.json(refData.ME)
  }),

  http.get('/api/dashboard', async ({ request }) => {
    await realistic()
    const url = new URL(request.url)
    const date = url.searchParams.get('date') ?? todayLondon()
    const areas = myAreaIds()
    const carers = refData.CARERS.filter((c) => areas.has(c.area_id))
    const clients = refData.CLIENTS.filter((c) => areas.has(c.area_id))
    const clientIds = new Set(clients.map((c) => c.id))
    const dayVisits = [...db.visits.values()].filter(
      (v) => v.date === date && clientIds.has(v.client_id) && v.status !== 'cancelled',
    )
    const body: DashboardStats = {
      date,
      carers: carers.length,
      clients: clients.length,
      scheduled: dayVisits.filter((v) => v.status === 'assigned').length,
      unscheduled: dayVisits.filter((v) => v.status === 'unassigned').length,
      covers: dayVisits.filter((v) => db.coveredVisitIds.has(v.id)).length,
      areas: refData.ME.areas,
    }
    return HttpResponse.json(body)
  }),

  http.get('/api/wallchart', async ({ request }) => {
    await realistic()
    const url = new URL(request.url)
    const date = url.searchParams.get('date') ?? todayLondon()
    const areaParam = url.searchParams.get('area') ?? 'all'
    const scope = myAreaIds()
    const inScope = (areaId: string) =>
      scope.has(areaId) && (areaParam === 'all' || areaId === areaParam)

    const carers = refData.CARERS.filter((c) => inScope(c.area_id))
    const clients = refData.CLIENTS.filter((c) => inScope(c.area_id))
    const clientIds = new Set(clients.map((c) => c.id))
    const visits = [...db.visits.values()].filter(
      (v) => v.date === date && clientIds.has(v.client_id) && v.status !== 'cancelled',
    )
    const body: WallChartData = { date, carers, clients, visits }
    return HttpResponse.json(body)
  }),

  http.get('/api/shifts/unassigned', async ({ request }) => {
    await realistic()
    const url = new URL(request.url)
    const from = url.searchParams.get('from') ?? todayLondon()
    const to = url.searchParams.get('to') ?? from
    const scope = myAreaIds()
    const clientIds = new Set(
      refData.CLIENTS.filter((c) => scope.has(c.area_id)).map((c) => c.id),
    )
    const visits = [...db.visits.values()].filter(
      (v) =>
        v.status === 'unassigned' &&
        v.date >= from &&
        v.date <= to &&
        clientIds.has(v.client_id),
    )
    return HttpResponse.json({ visits })
  }),

  http.post('/api/changes', async ({ request }) => {
    await realistic()
    const { items } = (await request.json()) as SubmitChangesRequest
    const results: ChangeResultItem[] = []
    const applied: typeof items = []

    for (const item of items) {
      const visit = db.visits.get(item.visit_id)
      if (!visit) {
        results.push({ visit_id: item.visit_id, status: 'conflict' })
        continue
      }
      maybeChaosBump(visit)
      if (visit.version !== item.version) {
        results.push({
          visit_id: item.visit_id,
          status: 'conflict',
          current_version: visit.version,
          current: { ...visit },
        })
        continue
      }
      // Apply
      visit.carer_ids = [...item.after.carer_ids]
      visit.time_start = item.after.time_start
      visit.time_finish = item.after.time_finish
      visit.status = item.after.status
      visit.version += 1
      if (item.kind === 'reassign' || item.kind === 'assign') {
        db.coveredVisitIds.add(visit.id)
      }
      applied.push(item)
      results.push({ visit_id: item.visit_id, status: 'applied' })
    }

    let changeId: string | null = null
    if (applied.length > 0) {
      changeId = `change-${db.changeSeq++}`
      db.changeSets.set(changeId, {
        id: changeId,
        items: applied,
        saved_at: new Date().toISOString(),
      })
    }
    const body: SubmitChangesResponse = { change_id: changeId, results }
    return HttpResponse.json(body)
  }),

  http.get('/api/changes/:id/messages/preview', async ({ params }) => {
    await realistic()
    const changeSet = db.changeSets.get(params.id as string)
    if (!changeSet) {
      return HttpResponse.json({ error: 'not found' }, { status: 404 })
    }

    const carerById = new Map(refData.CARERS.map((c) => [c.id, c]))
    const clientById = new Map(refData.CLIENTS.map((c) => [c.id, c]))

    // Group change items per affected recipient. A carer gaining, losing or
    // moving shifts gets ONE message covering all their changes; same for
    // each affected client.
    interface Bucket {
      kind: 'carer' | 'client'
      id: string
      name: string
      lines: string[]
      visitIds: string[]
      anyEmergency: boolean
      allCancellations: boolean
    }
    const buckets = new Map<string, Bucket>()

    const bucketFor = (kind: 'carer' | 'client', id: string, name: string): Bucket => {
      const key = `${kind}:${id}`
      let b = buckets.get(key)
      if (!b) {
        b = { kind, id, name, lines: [], visitIds: [], anyEmergency: false, allCancellations: true }
        buckets.set(key, b)
      }
      return b
    }

    for (const item of changeSet.items) {
      const visit = db.visits.get(item.visit_id)
      if (!visit) continue
      const client = clientById.get(visit.client_id)
      const when = `${formatDateUK(visit.date)} ${item.after.time_start}–${item.after.time_finish}`
      const isCancel = item.kind === 'cancel'

      const touch = (b: Bucket, line: string) => {
        b.lines.push(line)
        b.visitIds.push(visit.id)
        if (item.urgency === 'emergency') b.anyEmergency = true
        if (!isCancel) b.allCancellations = false
      }

      // Affected carers: anyone in the before or after set. Double-up calls
      // mean several carers can gain, lose, or keep the same visit.
      const beforeIds = new Set(item.before.carer_ids)
      const afterIds = new Set(item.after.carer_ids)
      for (const carerId of new Set([...beforeIds, ...afterIds])) {
        const carer = carerById.get(carerId)
        if (!carer) continue
        const clientName = client?.name ?? 'client'
        let line: string
        if (isCancel) {
          line = `visit for ${clientName} on ${when} cancelled`
        } else if (afterIds.has(carerId) && !beforeIds.has(carerId)) {
          line = `you are now covering ${clientName} on ${when}`
        } else if (!afterIds.has(carerId)) {
          line = `you are no longer covering ${clientName} on ${when}`
        } else {
          line = `your visit for ${clientName} has moved to ${when}`
        }
        touch(bucketFor('carer', carer.id, carer.name), line)
      }

      if (client) {
        const newCarerNames = item.after.carer_ids
          .map((id) => carerById.get(id)?.name)
          .filter(Boolean) as string[]
        const line = isCancel
          ? `your visit on ${when} has been cancelled`
          : `your visit on ${when} will be covered by ${
              newCarerNames.length > 0
                ? newCarerNames.join(' and ')
                : 'a carer to be confirmed'
            }`
        touch(bucketFor('client', client.id, client.name), line)
      }
    }

    const groups: MessagePreviewGroup[] = [...buckets.values()].map((b) => ({
      recipient_kind: b.kind,
      recipient_id: b.id,
      recipient_name: b.name,
      template: templateFor(b.anyEmergency ? 'emergency' : 'future', b.allCancellations),
      variables: {
        recipient_name: b.name,
        details: b.lines.join('; '),
        office_phone: OFFICE_PHONE,
      },
      visit_ids: b.visitIds,
    }))

    const body: MessagePreviewResponse = { change_id: changeSet.id, groups }
    return HttpResponse.json(body)
  }),

  http.post('/api/changes/:id/messages/send', async ({ request }) => {
    await realistic()
    const { recipients } = (await request.json()) as SendMessagesRequest
    // A real backend queues WhatsApp sends here; the mock just confirms.
    const body: SendMessagesResponse = { sent: recipients.length }
    return HttpResponse.json(body)
  }),
]
