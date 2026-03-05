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

export interface AppointmentData extends Partial<Timestampble> {
  id: string
  date_time: Timestamp
  user_id?: string
  client_id?: string
  treatment_ids?: string[]
  product_ids?: string[]
  operator_ids?: string[]
  isPersonal?: boolean
  discount?: number
  extra?: number
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
  isPersonal: boolean
  discount?: number
  extra?: number
  fix_duration?: number
  coupon_id?: string
  old_id?: string
  notes?: string
  reminded: boolean
  googleCalendarEventId?: string
  googleCalendarSyncedAt?: Timestamp
  updateBy: string

  constructor(data: AppointmentData) {
    super(data)
    this.date_time = normalizeTimestamp(data.date_time)
    this.user_id = normalizeString(data.user_id) || undefined
    this.client_id = normalizeString(data.client_id) || undefined
    this.treatment_ids = Array.isArray(data.treatment_ids) ? data.treatment_ids.map((item) => normalizeString(item)).filter(Boolean) : []
    this.product_ids = Array.isArray(data.product_ids) ? data.product_ids.map((item) => normalizeString(item)).filter(Boolean) : []
    this.operator_ids = Array.isArray(data.operator_ids) ? data.operator_ids.map((item) => normalizeString(item)).filter(Boolean) : []
    this.isPersonal = Boolean(data.isPersonal)
    this.discount = data.discount
    this.extra = data.extra
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
      isPersonal: this.isPersonal,
      discount: this.discount,
      extra: this.extra,
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
