import { endOfDay, startOfDay } from '../../../../../utils/calendar'

export type AppuntamentoStat = {
  id: string
  start: Date
  revenue: number
  clientId: string
  treatmentIds: string[]
  minutes: number
}

export type StatRange = {
  from: Date
  to?: Date
}

export type PeriodRevenueMetric = {
  appointments: number
  revenue: number
}

export type OpenRangeSummaryMetrics = {
  today: PeriodRevenueMetric
  weekToDate: PeriodRevenueMetric
  monthToDate: PeriodRevenueMetric
  previousMonthRevenue: number
  currentMonthToEndRevenue: number
}

export type StatsSerie = {
  labels: string[]
  values: number[]
}

const DAY_MS = 24 * 60 * 60 * 1000

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 0, 0, 0, 0)
}

export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate(), 0, 0, 0, 0)
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function startOfWeekMonday(date: Date) {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(startOfDay(date), diff)
}

export function endOfWeekSunday(date: Date) {
  return endOfDay(addDays(startOfWeekMonday(date), 6))
}

export function normalizeRevenue(value: unknown) {
  const next = Number(value)
  if (!Number.isFinite(next)) return 0
  return Math.max(0, Math.round(next * 100) / 100)
}

export function isInRange(date: Date, range: StatRange) {
  const fromMs = range.from.getTime()
  if (date.getTime() < fromMs) return false
  if (!range.to) return true
  return date.getTime() <= range.to.getTime()
}

export function filterByRange(items: AppuntamentoStat[], range: StatRange) {
  return items.filter((item) => isInRange(item.start, range))
}

export function sumRevenue(items: AppuntamentoStat[]) {
  return Math.round(items.reduce((sum, item) => sum + item.revenue, 0) * 100) / 100
}

export function aggregateByRange(items: AppuntamentoStat[], from: Date, to: Date): PeriodRevenueMetric {
  let appointments = 0
  let revenue = 0
  const fromMs = from.getTime()
  const toMs = to.getTime()

  for (const item of items) {
    const time = item.start.getTime()
    if (time < fromMs || time > toMs) continue
    appointments += 1
    revenue += item.revenue
  }

  return {
    appointments,
    revenue: Math.round(revenue * 100) / 100,
  }
}

export function buildOpenRangeSummary(items: AppuntamentoStat[], referenceDate = new Date()): OpenRangeSummaryMetrics {
  const todayStart = startOfDay(referenceDate)
  const todayEnd = endOfDay(referenceDate)
  const weekStart = startOfWeekMonday(referenceDate)
  const monthStart = startOfMonth(referenceDate)
  const prevMonthStart = startOfMonth(addMonths(monthStart, -1))
  const prevMonthEnd = endOfMonth(prevMonthStart)
  const monthEnd = endOfMonth(monthStart)

  return {
    today: aggregateByRange(items, todayStart, todayEnd),
    weekToDate: aggregateByRange(items, weekStart, todayEnd),
    monthToDate: aggregateByRange(items, monthStart, todayEnd),
    previousMonthRevenue: aggregateByRange(items, prevMonthStart, prevMonthEnd).revenue,
    currentMonthToEndRevenue: aggregateByRange(items, monthStart, monthEnd).revenue,
  }
}

export function buildDailyRevenueSeries(items: AppuntamentoStat[], from: Date, to: Date): StatsSerie {
  const normalizedFrom = startOfDay(from)
  const normalizedTo = endOfDay(to)
  const totals = new Map<string, number>()

  for (const item of items) {
    const time = item.start.getTime()
    if (time < normalizedFrom.getTime() || time > normalizedTo.getTime()) continue
    const key = dayKey(item.start)
    totals.set(key, (totals.get(key) ?? 0) + item.revenue)
  }

  const labels: string[] = []
  const values: number[] = []
  for (let cursor = normalizedFrom.getTime(); cursor <= normalizedTo.getTime(); cursor += DAY_MS) {
    const date = new Date(cursor)
    const key = dayKey(date)
    labels.push(
      date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
      }),
    )
    values.push(Math.round((totals.get(key) ?? 0) * 100) / 100)
  }

  return { labels, values }
}

export function buildWeeklyRevenueSeries(items: AppuntamentoStat[], referenceDate = new Date(), weeksCount = 10): StatsSerie {
  const weekStart = startOfWeekMonday(referenceDate)
  const labels: string[] = []
  const values: number[] = []

  for (let offset = weeksCount - 1; offset >= 0; offset -= 1) {
    const start = addDays(weekStart, -(offset * 7))
    const end = endOfDay(addDays(start, 6))
    const metric = aggregateByRange(items, start, end)
    labels.push(`${toDateCompact(start)} - ${toDateCompact(addDays(start, 6))}`)
    values.push(metric.revenue)
  }

  return { labels, values }
}

export function buildMonthlyRevenueSeries(items: AppuntamentoStat[]): StatsSerie {
  if (!items.length) return { labels: [], values: [] }

  const ordered = [...items].sort((a, b) => a.start.getTime() - b.start.getTime())
  const first = ordered[0]?.start
  const last = ordered[ordered.length - 1]?.start
  if (!first || !last) return { labels: [], values: [] }

  const firstMonth = startOfMonth(first)
  const lastMonth = startOfMonth(last)
  const labels: string[] = []
  const values: number[] = []

  for (
    let cursor = firstMonth;
    cursor.getTime() <= lastMonth.getTime();
    cursor = startOfMonth(addMonths(cursor, 1))
  ) {
    const monthStart = cursor
    const monthEnd = endOfMonth(cursor)
    const metric = aggregateByRange(items, monthStart, monthEnd)
    labels.push(
      monthStart.toLocaleDateString('it-IT', {
        month: 'short',
        year: '2-digit',
      }),
    )
    values.push(metric.revenue)
  }

  return { labels, values }
}

export function buildYearlyRevenueSeries(items: AppuntamentoStat[]): StatsSerie {
  if (!items.length) return { labels: [], values: [] }
  const totals = new Map<number, number>()
  for (const item of items) {
    const year = item.start.getFullYear()
    totals.set(year, (totals.get(year) ?? 0) + item.revenue)
  }

  const years = [...totals.keys()].sort((a, b) => a - b)
  return {
    labels: years.map((year) => String(year)),
    values: years.map((year) => Math.round((totals.get(year) ?? 0) * 100) / 100),
  }
}

export function distinctYears(items: AppuntamentoStat[]) {
  return new Set(items.map((item) => item.start.getFullYear()))
}

export function hasAnyValue(values: number[]) {
  return values.some((value) => Math.abs(value) > 0.0001)
}

export function toDateCompact(date: Date) {
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
  })
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

export function formatHoursFromMinutes(minutes: number) {
  const safe = Number.isFinite(minutes) ? Math.max(0, minutes) : 0
  const hours = safe / 60
  return `${hours.toFixed(1)} h`
}

export function formatHoursAndMinutes(minutes: number) {
  const safe = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0
  const hours = Math.floor(safe / 60)
  const rest = safe % 60
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours} h`
  return `${hours} h ${rest} min`
}

function dayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
