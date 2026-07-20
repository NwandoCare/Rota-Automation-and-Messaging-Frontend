import type { TemplateKey, Urgency } from '@/api/types'

/**
 * The 2×2 template matrix: (emergency | future) × (cancellation | adjustment).
 * Mirrors the pre-approved WhatsApp template definitions — bodies here are
 * placeholders until Meta approval fixes the final wording. Variable slots
 * ({name}) are the only editable parts, matching WhatsApp template rules.
 */
export interface TemplateDef {
  key: TemplateKey
  label: string
  body: string
  slots: string[]
}

export const TEMPLATES: Record<TemplateKey, TemplateDef> = {
  emergency_cancellation: {
    key: 'emergency_cancellation',
    label: 'Emergency cancellation',
    body:
      'Hello {recipient_name}, urgent update from Nwando Care. ' +
      'The following visit(s) have been CANCELLED: {details}. ' +
      'Please call the office on {office_phone} if you have any questions.',
    slots: ['recipient_name', 'details', 'office_phone'],
  },
  emergency_adjustment: {
    key: 'emergency_adjustment',
    label: 'Emergency adjustment',
    body:
      'Hello {recipient_name}, urgent update from Nwando Care. ' +
      'There has been a change to your schedule: {details}. ' +
      'Please confirm you have received this message, or call the office on {office_phone}.',
    slots: ['recipient_name', 'details', 'office_phone'],
  },
  future_cancellation: {
    key: 'future_cancellation',
    label: 'Future cancellation',
    body:
      'Hello {recipient_name}, this is Nwando Care with an update to an upcoming visit. ' +
      'The following visit(s) will no longer take place: {details}. ' +
      'If anything looks wrong, please call the office on {office_phone}.',
    slots: ['recipient_name', 'details', 'office_phone'],
  },
  future_adjustment: {
    key: 'future_adjustment',
    label: 'Future adjustment',
    body:
      'Hello {recipient_name}, this is Nwando Care with an update to an upcoming visit: {details}. ' +
      'If anything looks wrong, please call the office on {office_phone}.',
    slots: ['recipient_name', 'details', 'office_phone'],
  },
}

export function templateFor(urgency: Urgency, isCancellation: boolean): TemplateKey {
  if (urgency === 'emergency') {
    return isCancellation ? 'emergency_cancellation' : 'emergency_adjustment'
  }
  return isCancellation ? 'future_cancellation' : 'future_adjustment'
}

export function renderTemplate(key: TemplateKey, variables: Record<string, string>): string {
  return TEMPLATES[key].body.replace(/\{(\w+)\}/g, (_, slot: string) => variables[slot] ?? `{${slot}}`)
}
