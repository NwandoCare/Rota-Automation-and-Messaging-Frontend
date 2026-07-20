import { format } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

export const LONDON = 'Europe/London'

/** Hours before a visit's start below which a change counts as an emergency. */
export const EMERGENCY_THRESHOLD_HOURS = 48

/** "2026-07-19" + "07:30" (Europe/London wall time) → UTC Date */
export function visitStartUtc(date: string, timeStart: string): Date {
  return fromZonedTime(`${date}T${timeStart}:00`, LONDON)
}

export function isEmergency(date: string, timeStart: string, now: Date = new Date()): boolean {
  const start = visitStartUtc(date, timeStart)
  const hoursAway = (start.getTime() - now.getTime()) / 3_600_000
  return hoursAway < EMERGENCY_THRESHOLD_HOURS
}

/** "2026-07-19" → "19/07/2026" */
export function formatDateUK(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

/** Today's calendar date in Europe/London as YYYY-MM-DD */
export function todayLondon(now: Date = new Date()): string {
  return format(toZonedTime(now, LONDON), 'yyyy-MM-dd')
}

/** "07:30" → 450 */
export function minutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

/** Long UK form for headers, e.g. "Saturday 19 July 2026" */
export function formatDateLongUK(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return format(new Date(y, m - 1, d), 'EEEE d MMMM yyyy')
}
