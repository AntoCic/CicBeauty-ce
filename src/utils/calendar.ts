import type { AppConfigData } from '../models/AppConfig'
import { asDate } from './date'
type TreatmentDurationLike = { duration?: number }
type AppointmentDurationLike = {
  fix_duration?: number
  treatment_ids?: string[]
}
type AppointmentTimingLike = AppointmentDurationLike & {
  date_time: unknown
}

const MINUTE_MS = 60_000

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

export function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1, 0, 0, 0, 0)
}

export function monthRangeWithPrefetch(reference: Date, prefetchMonths: number) {
  const monthStart = new Date(reference.getFullYear(), reference.getMonth(), 1, 0, 0, 0, 0)
  const start = addMonths(monthStart, -Math.max(0, prefetchMonths))
  const end = addMonths(monthStart, Math.max(0, prefetchMonths) + 2)
  return { start, end }
}

export function toDateTimeLocalValue(date?: Date | null) {
  if (!date) return ''
  const pad = (v: number) => String(v).padStart(2, '0')
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const mi = pad(date.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

export function fromDateTimeLocalValue(value: string) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return undefined
  const next = new Date(normalized)
  if (Number.isNaN(next.getTime())) return undefined
  return next
}

export function parseTimeToMinutes(value: string, fallback = 0) {
  const normalized = String(value ?? '').trim()
  const match = /^(\d{1,2}):(\d{2})$/.exec(normalized)
  if (!match) return fallback
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallback
  return Math.max(0, Math.min(24 * 60 - 1, hours * 60 + minutes))
}

export function minutesToDate(base: Date, minutes: number) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, minutes, 0, 0)
}

export function computeAppointmentDurationMinutes(
  appointment: AppointmentDurationLike,
  treatmentsById: Map<string, TreatmentDurationLike>,
  fallbackMinutes: number,
) {
  const treatmentDuration = (appointment.treatment_ids ?? [])
    .map((id) => treatmentsById.get(id)?.duration ?? 0)
    .filter((v) => Number.isFinite(v))
    .reduce((sum, current) => sum + current, 0)

  const base = treatmentDuration > 0 ? treatmentDuration : fallbackMinutes
  const fixDuration = Number(appointment.fix_duration ?? 0)
  return Math.max(5, base + (Number.isFinite(fixDuration) ? fixDuration : 0))
}

export function appointmentEndDate(
  appointment: AppointmentTimingLike,
  treatmentsById: Map<string, TreatmentDurationLike>,
  fallbackMinutes: number,
) {
  const start = asDate(appointment.date_time)
  if (!start) return new Date()
  const minutes = computeAppointmentDurationMinutes(appointment, treatmentsById, fallbackMinutes)
  return new Date(start.getTime() + minutes * MINUTE_MS)
}

export function isWorkingDay(date: Date, appConfig: AppConfigData) {
  const workingDays = Array.isArray(appConfig.workingDays) && appConfig.workingDays.length
    ? appConfig.workingDays
    : [1, 2, 3, 4, 5, 6]
  return workingDays.includes(date.getDay())
}

export function buildAvailabilitySlots(
  day: Date,
  appointments: Array<{ start: Date; end: Date }>,
  appConfig: AppConfigData,
  durationMinutes: number,
) {
  if (!isWorkingDay(day, appConfig)) return [] as Array<{ start: Date; end: Date }>

  const slotStep = Math.max(5, Number(appConfig.appointmentSlotMinutes || 15))
  const minDuration = Math.max(5, durationMinutes)
  const openMin = parseTimeToMinutes(appConfig.dayStart, 9 * 60)
  const breakStartMin = parseTimeToMinutes(appConfig.breakStart, 13 * 60)
  const breakEndMin = parseTimeToMinutes(appConfig.breakEnd, 14 * 60)
  const closeMin = parseTimeToMinutes(appConfig.dayEnd, 19 * 60)

  const windows = [
    { start: openMin, end: breakStartMin },
    { start: breakEndMin, end: closeMin },
  ].filter((item) => item.end > item.start)

  const busy = appointments
    .map((item) => ({ start: item.start.getTime(), end: item.end.getTime() }))
    .sort((a, b) => a.start - b.start)

  const slots: Array<{ start: Date; end: Date }> = []
  for (const windowPart of windows) {
    for (let minute = windowPart.start; minute + minDuration <= windowPart.end; minute += slotStep) {
      const slotStart = minutesToDate(day, minute)
      const slotEnd = new Date(slotStart.getTime() + minDuration * MINUTE_MS)
      const overlapsBusy = busy.some((item) => slotStart.getTime() < item.end && slotEnd.getTime() > item.start)
      if (!overlapsBusy) {
        slots.push({ start: slotStart, end: slotEnd })
      }
    }
  }

  return slots
}
