// src/models/Appointment.ts
import { FirestoreModel, type Timestampble } from 'cic-kit'

export interface AppointmentData extends Partial<Timestampble> {
  id: string
  date_time: Date
  user_id: string
  treatment_ids: string[]
  discount?: number
  extra?: number
  fix_duration?: number
  status: string
  notes?: string
  reminded?: boolean
  calendarEvent?: Record<string, unknown>
  updateBy: string
}

export class Appointment extends FirestoreModel<AppointmentData> {
  static collectionName = 'appointments'

  date_time: Date
  user_id: string
  treatment_ids: string[]
  discount?: number
  extra?: number
  fix_duration?: number
  status: string
  notes?: string
  reminded: boolean
  calendarEvent?: Record<string, unknown>
  updateBy: string

  constructor(data: AppointmentData) {
    super(data)
    this.date_time = data.date_time
    this.user_id = data.user_id
    this.treatment_ids = data.treatment_ids
    this.discount = data.discount
    this.extra = data.extra
    this.fix_duration = data.fix_duration
    this.status = data.status
    this.notes = data.notes
    this.reminded = data.reminded ?? false
    this.calendarEvent = data.calendarEvent
    this.updateBy = data.updateBy
  }

  toData(): AppointmentData {
    return {
      id: this.id,
      date_time: this.date_time,
      user_id: this.user_id,
      treatment_ids: this.treatment_ids,
      discount: this.discount,
      extra: this.extra,
      fix_duration: this.fix_duration,
      status: this.status,
      notes: this.notes,
      reminded: this.reminded,
      calendarEvent: this.calendarEvent,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }
}
