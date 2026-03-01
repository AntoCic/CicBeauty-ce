// src/models/Appointment.ts
import { FirestoreModel, type Timestampble } from 'cic-kit'

export interface AppointmentData extends Partial<Timestampble> {
  id: string
  date_time: Date
  end_time?: Date
  user_id?: string
  client_id?: string
  treatment_ids?: string[]
  product_ids?: string[]
  operator_id?: string
  operator_ids?: string[]
  ownerOperatorId?: string
  isPersonal?: boolean
  discount?: number
  extra?: number
  fix_duration?: number
  custom_duration_minutes?: number
  coupon_id?: string
  old_id?: string
  status: string
  notes?: string
  reminded?: boolean
  calendarEvent?: Record<string, unknown>
  googleCalendarEventId?: string
  googleCalendarSyncedAt?: Date
  updateBy: string
}

export class Appointment extends FirestoreModel<AppointmentData> {
  static collectionName = 'appointments'

  date_time: Date
  end_time?: Date
  user_id?: string
  client_id?: string
  treatment_ids?: string[]
  product_ids?: string[]
  operator_id?: string
  operator_ids?: string[]
  ownerOperatorId?: string
  isPersonal: boolean
  discount?: number
  extra?: number
  fix_duration?: number
  custom_duration_minutes?: number
  coupon_id?: string
  old_id?: string
  status: string
  notes?: string
  reminded: boolean
  calendarEvent?: Record<string, unknown>
  googleCalendarEventId?: string
  googleCalendarSyncedAt?: Date
  updateBy: string

  constructor(data: AppointmentData) {
    super(data)
    this.date_time = data.date_time
    this.end_time = data.end_time
    this.user_id = data.user_id
    this.client_id = data.client_id
    this.treatment_ids = Array.isArray(data.treatment_ids) ? data.treatment_ids : []
    this.product_ids = Array.isArray(data.product_ids) ? data.product_ids : []
    this.operator_id = data.operator_id
    this.operator_ids = Array.isArray(data.operator_ids) ? data.operator_ids : []
    this.ownerOperatorId = data.ownerOperatorId
    this.isPersonal = data.isPersonal ?? false
    this.discount = data.discount
    this.extra = data.extra
    this.fix_duration = data.fix_duration
    this.custom_duration_minutes = data.custom_duration_minutes
    this.coupon_id = data.coupon_id
    this.old_id = data.old_id
    this.status = data.status
    this.notes = data.notes
    this.reminded = data.reminded ?? false
    this.calendarEvent = data.calendarEvent
    this.googleCalendarEventId = data.googleCalendarEventId
    this.googleCalendarSyncedAt = data.googleCalendarSyncedAt
    this.updateBy = data.updateBy
  }

  toData(): AppointmentData {
    return {
      id: this.id,
      date_time: this.date_time,
      end_time: this.end_time,
      user_id: this.user_id,
      client_id: this.client_id,
      treatment_ids: this.treatment_ids,
      product_ids: this.product_ids,
      operator_id: this.operator_id,
      operator_ids: this.operator_ids,
      ownerOperatorId: this.ownerOperatorId,
      isPersonal: this.isPersonal,
      discount: this.discount,
      extra: this.extra,
      fix_duration: this.fix_duration,
      custom_duration_minutes: this.custom_duration_minutes,
      coupon_id: this.coupon_id,
      old_id: this.old_id,
      status: this.status,
      notes: this.notes,
      reminded: this.reminded,
      calendarEvent: this.calendarEvent,
      googleCalendarEventId: this.googleCalendarEventId,
      googleCalendarSyncedAt: this.googleCalendarSyncedAt,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }
}
