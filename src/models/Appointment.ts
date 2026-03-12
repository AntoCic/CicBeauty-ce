import { FirestoreModel, type Timestampble } from 'cic-kit'
import { Timestamp } from 'firebase/firestore'
import { asDate } from '../utils/date'

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeTimestamp(value: unknown, fallback?: Timestamp) {
  if (value instanceof Timestamp) return value
  const nextDate = asDate(value)
  if (nextDate) return Timestamp.fromDate(nextDate)
  return fallback ?? Timestamp.now()
}

function normalizeOptionalTimestamp(value: unknown) {
  if (!value) return undefined
  return normalizeTimestamp(value)
}

function normalizeMoney(value: unknown) {
  const next = Number(value)
  if (!Number.isFinite(next)) return undefined
  return Math.max(0, Math.round(next * 100) / 100)
}

export interface AppointmentData extends Partial<Timestampble> {
  id: string
  date_time: Timestamp
  user_id?: string
  client_id?: string
  treatment_ids?: string[]
  product_ids?: string[]
  operator_ids?: string[]
  personalOwnerId?: string
  isPublic?: boolean
  // Legacy support
  isPersonal?: boolean
  total?: number
  fix_duration?: number
  coupon_id?: string
  old_id?: string
  notes?: string
  reminded?: boolean
  googleCalendarEventId?: string
  googleCalendarSyncedAt?: Timestamp
  updateBy: string
}

export class Appointment extends FirestoreModel<AppointmentData> {
  static collectionName = 'appointments'

  date_time: Timestamp
  user_id?: string
  client_id?: string
  treatment_ids?: string[]
  product_ids?: string[]
  operator_ids?: string[]
  personalOwnerId?: string
  isPublic: boolean
  total?: number
  fix_duration?: number
  coupon_id?: string
  old_id?: string
  notes?: string
  reminded: boolean
  googleCalendarEventId?: string
  googleCalendarSyncedAt?: Timestamp
  updateBy: string

  get isPersonal() {
    return Boolean(this.personalOwnerId)
  }

  // Legacy guard: FirestoreModel may assign incoming fields with Object.assign.
  // isPersonal is derived from personalOwnerId, so setter is intentionally a no-op.
  set isPersonal(_value: boolean | undefined) {}

  constructor(data: AppointmentData) {
    super(data)
    this.date_time = normalizeTimestamp(data.date_time)
    this.user_id = normalizeString(data.user_id) || undefined
    this.client_id = normalizeString(data.client_id) || undefined
    this.treatment_ids = Array.isArray(data.treatment_ids) ? data.treatment_ids.map((item) => normalizeString(item)).filter(Boolean) : []
    this.product_ids = Array.isArray(data.product_ids) ? data.product_ids.map((item) => normalizeString(item)).filter(Boolean) : []
    this.operator_ids = Array.isArray(data.operator_ids) ? data.operator_ids.map((item) => normalizeString(item)).filter(Boolean) : []
    const personalOwnerId = normalizeString(data.personalOwnerId)
    const legacyPersonalOwnerId = Boolean(data.isPersonal)
      ? normalizeString(this.operator_ids[0] ?? data.user_id)
      : ''
    this.personalOwnerId = personalOwnerId || legacyPersonalOwnerId || undefined
    this.isPublic = this.personalOwnerId ? Boolean(data.isPublic) : true
    this.total = normalizeMoney(data.total)
    this.fix_duration = data.fix_duration
    this.coupon_id = normalizeString(data.coupon_id) || undefined
    this.old_id = normalizeString(data.old_id) || undefined
    this.notes = normalizeString(data.notes) || undefined
    this.reminded = Boolean(data.reminded)
    this.googleCalendarEventId = normalizeString(data.googleCalendarEventId) || undefined
    this.googleCalendarSyncedAt = normalizeOptionalTimestamp(data.googleCalendarSyncedAt)
    this.updateBy = normalizeString(data.updateBy) || 'admin'
  }

  toData(): AppointmentData {
    return {
      id: this.id,
      date_time: this.date_time,
      user_id: this.user_id,
      client_id: this.client_id,
      treatment_ids: this.treatment_ids,
      product_ids: this.product_ids,
      operator_ids: this.operator_ids,
      personalOwnerId: this.personalOwnerId,
      isPublic: this.isPublic,
      isPersonal: this.isPersonal,
      total: this.total,
      fix_duration: this.fix_duration,
      coupon_id: this.coupon_id,
      old_id: this.old_id,
      notes: this.notes,
      reminded: this.reminded,
      googleCalendarEventId: this.googleCalendarEventId,
      googleCalendarSyncedAt: this.googleCalendarSyncedAt,
      updateBy: this.updateBy,
      ...this.timestampbleProps(),
    }
  }
}
