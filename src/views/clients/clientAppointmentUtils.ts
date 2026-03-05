import { asDate } from '../../utils/date'

export type AppointmentLike = {
  id: string
  date_time: unknown
  status?: string
  client_id?: string
  user_id?: string
}

export type ClientAppointmentSummary = {
  previous?: AppointmentLike
  next?: AppointmentLike
  hasTodayAppointment: boolean
  ordered: AppointmentLike[]
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfTomorrow(date: Date) {
  const next = startOfDay(date)
  next.setDate(next.getDate() + 1)
  return next
}

export function appointmentClientId(appointment: AppointmentLike) {
  return String(appointment.client_id ?? appointment.user_id ?? '').trim()
}

export function compareByDateAsc(a: AppointmentLike, b: AppointmentLike) {
  const aTime = asDate(a.date_time)?.getTime() ?? 0
  const bTime = asDate(b.date_time)?.getTime() ?? 0
  return aTime - bTime
}

export function compareByDateDesc(a: AppointmentLike, b: AppointmentLike) {
  return compareByDateAsc(b, a)
}

export function buildClientAppointmentSummary(appointments: AppointmentLike[], now = new Date()): ClientAppointmentSummary {
  const todayStart = startOfDay(now)
  const tomorrowStart = startOfTomorrow(now)
  const nowTime = now.getTime()

  const ordered = [...appointments].sort(compareByDateDesc)

  let previous: AppointmentLike | undefined
  let next: AppointmentLike | undefined
  let hasTodayAppointment = false

  for (const appointment of appointments) {
    const date = asDate(appointment.date_time)
    if (!date) continue
    const time = date.getTime()

    if (time >= todayStart.getTime() && time < tomorrowStart.getTime()) {
      hasTodayAppointment = true
    }

    if (time < nowTime) {
      if (!previous || time > (asDate(previous.date_time)?.getTime() ?? 0)) {
        previous = appointment
      }
      continue
    }

    if (time >= tomorrowStart.getTime()) {
      if (!next || time < (asDate(next.date_time)?.getTime() ?? Number.MAX_SAFE_INTEGER)) {
        next = appointment
      }
    }
  }

  return {
    previous,
    next,
    hasTodayAppointment,
    ordered,
  }
}
