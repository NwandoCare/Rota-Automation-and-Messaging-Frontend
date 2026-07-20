/**
 * API contract between this frontend and the Python backend.
 *
 * This file is the single source of truth for request/response shapes.
 * The MSW handlers in src/mocks/ implement exactly these shapes; the
 * Python backend must match them (or this file must be updated in step).
 */

export interface Area {
  id: string
  name: string
}

export interface Me {
  id: string
  name: string
  email: string
  role: 'coordinator' | 'admin'
  areas: Area[]
}

export interface Carer {
  id: string
  name: string
  area_id: string
}

export interface Client {
  id: string
  name: string
  area_id: string
}

export type VisitStatus = 'unassigned' | 'assigned' | 'cancelled'

export interface Visit {
  id: string
  /** YYYY-MM-DD (Europe/London calendar date the visit starts on) */
  date: string
  client_id: string
  /** HH:mm */
  time_start: string
  /** HH:mm — earlier than time_start when overnight is true */
  time_finish: string
  overnight: boolean
  status: VisitStatus
  /** Optimistic-locking version; echoed back on save */
  version: number
  /**
   * Assigned carers — more than one for double-up calls.
   * Empty when unassigned.
   */
  carer_ids: string[]
}

/** GET /dashboard?date=YYYY-MM-DD */
export interface DashboardStats {
  date: string
  carers: number
  clients: number
  scheduled: number
  unscheduled: number
  /** Visits reassigned away from their usual carer (needing/being covered) */
  covers: number
  areas: Area[]
}

/** GET /wallchart?date=YYYY-MM-DD&area=<id|all> */
export interface WallChartData {
  date: string
  carers: Carer[]
  clients: Client[]
  visits: Visit[]
}

export type ChangeKind = 'assign' | 'reassign' | 'time_change' | 'cancel'
export type Urgency = 'emergency' | 'future'

export interface ChangeSnapshot {
  carer_ids: string[]
  time_start: string
  time_finish: string
  status: VisitStatus
}

export interface ChangeItem {
  visit_id: string
  /** The visit version this change was based on */
  version: number
  kind: ChangeKind
  before: ChangeSnapshot
  after: ChangeSnapshot
  urgency: Urgency
}

/** POST /changes — body */
export interface SubmitChangesRequest {
  items: ChangeItem[]
}

export interface ChangeResultItem {
  visit_id: string
  status: 'applied' | 'conflict'
  /** Present on conflict: what the server holds now */
  current_version?: number
  current?: Visit
}

/**
 * POST /changes — response (200 even when some items conflict;
 * change_id is null when nothing was applied)
 */
export interface SubmitChangesResponse {
  change_id: string | null
  results: ChangeResultItem[]
}

export type RecipientKind = 'carer' | 'client'

export type TemplateKey =
  | 'emergency_cancellation'
  | 'emergency_adjustment'
  | 'future_cancellation'
  | 'future_adjustment'

export interface MessagePreviewGroup {
  recipient_kind: RecipientKind
  recipient_id: string
  recipient_name: string
  template: TemplateKey
  /** Values for the template's variable slots; editable by the coordinator */
  variables: Record<string, string>
  /** Visit ids this message covers */
  visit_ids: string[]
}

/** GET /changes/{id}/messages/preview */
export interface MessagePreviewResponse {
  change_id: string
  groups: MessagePreviewGroup[]
}

export interface SendRecipient {
  recipient_kind: RecipientKind
  recipient_id: string
  template: TemplateKey
  variables: Record<string, string>
}

/** POST /changes/{id}/messages/send — body */
export interface SendMessagesRequest {
  recipients: SendRecipient[]
}

export interface SendMessagesResponse {
  sent: number
}
