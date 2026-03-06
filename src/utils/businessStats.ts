import { asDate } from './date'
import { appointmentEndDate, computeAppointmentDurationMinutes } from './calendar'

type AppointmentLike = {
  date_time: unknown
  client_id?: string
  user_id?: string
  treatment_ids?: string[]
  discount?: number
  extra?: number
  fix_duration?: number
  coupon_id?: string
}

type ClientLike = {
  name: string
  surname: string
}

type TreatmentLike = {
  title: string
  duration?: number
  price?: number
}

type CouponLike = {
  code: string
  title: string
}

type ExpenseLike = {
  type_expense_id: string
  price: number
}

export type CustomerMetric = {
  clientId: string
  label: string
  appointments: number
  minutes: number
  spend: number
}

export function buildCustomerMetrics(
  appointments: AppointmentLike[],
  clientsById: Map<string, ClientLike>,
  treatmentsById: Map<string, TreatmentLike>,
  fallbackDuration: number,
) {
  const map = new Map<string, CustomerMetric>()
  for (const appointment of appointments) {
    const clientId = String(appointment.client_id ?? appointment.user_id ?? '').trim()
    if (!clientId) continue

    const treatmentTotal = (appointment.treatment_ids ?? [])
      .map((id) => treatmentsById.get(id)?.price ?? 0)
      .reduce((sum, value) => sum + value, 0)
    const discount = Number(appointment.discount ?? 0)
    const extra = Number(appointment.extra ?? 0)
    const spend = Math.max(0, treatmentTotal + extra - discount)
    const minutes = computeAppointmentDurationMinutes(appointment, treatmentsById, fallbackDuration)

    const current = map.get(clientId) ?? {
      clientId,
      label: formatClientLabel(clientsById.get(clientId)),
      appointments: 0,
      minutes: 0,
      spend: 0,
    }

    current.appointments += 1
    current.minutes += minutes
    current.spend += spend
    map.set(clientId, current)
  }

  return [...map.values()]
}

export function buildTreatmentUsage(
  appointments: AppointmentLike[],
  treatmentsById: Map<string, TreatmentLike>,
) {
  const usage = new Map<string, { treatmentId: string; label: string; count: number; revenue: number }>()
  for (const appointment of appointments) {
    const ids = appointment.treatment_ids ?? []
    for (const treatmentId of ids) {
      const treatment = treatmentsById.get(treatmentId)
      if (!treatment) continue
      const current = usage.get(treatmentId) ?? {
        treatmentId,
        label: treatment.title,
        count: 0,
        revenue: 0,
      }
      current.count += 1
      current.revenue += Number(treatment.price ?? 0)
      usage.set(treatmentId, current)
    }
  }
  return [...usage.values()]
}

export function buildTypeExpenseCosts(expenses: ExpenseLike[], typeExpenseNames: Map<string, string>) {
  const map = new Map<string, { id: string; label: string; total: number; count: number }>()
  for (const expense of expenses) {
    const typeId = String(expense.type_expense_id ?? '').trim()
    if (!typeId) continue
    const current = map.get(typeId) ?? {
      id: typeId,
      label: typeExpenseNames.get(typeId) ?? 'Tipo sconosciuto',
      total: 0,
      count: 0,
    }
    current.total += Number(expense.price ?? 0)
    current.count += 1
    map.set(typeId, current)
  }
  return [...map.values()]
}

export function buildCouponUsage(appointments: AppointmentLike[], couponsById: Map<string, CouponLike>) {
  const map = new Map<string, { couponId: string; label: string; usage: number }>()
  for (const appointment of appointments) {
    const couponId = String(appointment.coupon_id ?? '').trim()
    if (!couponId) continue
    const coupon = couponsById.get(couponId)
    const current = map.get(couponId) ?? {
      couponId,
      label: coupon ? `${coupon.code} - ${coupon.title}` : couponId,
      usage: 0,
    }
    current.usage += 1
    map.set(couponId, current)
  }
  return [...map.values()]
}

export function buildDailyLoadSeries(
  appointments: AppointmentLike[],
  treatmentsById: Map<string, TreatmentLike>,
  fallbackDuration: number,
) {
  const totals = new Map<string, number>()
  for (const appointment of appointments) {
    const start = asDate(appointment.date_time)
    if (!start) continue
    const end = appointmentEndDate(appointment, treatmentsById, fallbackDuration)
    const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
    totals.set(key, (totals.get(key) ?? 0) + minutes)
  }

  return [...totals.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, minutes]) => ({ day, minutes }))
}

function formatClientLabel(client?: ClientLike) {
  if (!client) return 'Cliente sconosciuto'
  return `${client.name} ${client.surname}`.trim()
}
