import { asDate } from './date'

export type CalendarSpecialBadgeKind = 'holiday' | 'recurrence' | 'birthday'

export type CalendarSpecialBadge = {
  id: string
  kind: CalendarSpecialBadgeKind
  label: string
}

type ItalianFixedHoliday = {
  month: number
  day: number
  title: string
  emoji: string
}

type ItalianMoveableHoliday = {
  daysFromEaster: number
  title: string
  emoji: string
}

type HolidayDefinition = {
  title: string
  emoji: string
}

const ITALY_FLAG_EMOJI = '\u{1F1EE}\u{1F1F9}'
const DOVE_EMOJI = '\u{1F54A}\uFE0F'
const BOTTLE_EMOJI = '\u{1F9F4}'
const MEGAPHONE_EMOJI = '\u{1F4E3}'
const SHIELD_EMOJI = '\u{1F6E1}\uFE0F'
const REPEAT_EMOJI = '\u{1F501}'
const BIRTHDAY_EMOJI = '\u{1F382}'

export const ITALIAN_FIXED_HOLIDAYS: ItalianFixedHoliday[] = [
  { month: 1, day: 1, title: 'Capodanno', emoji: ITALY_FLAG_EMOJI },
  { month: 1, day: 6, title: 'Epifania', emoji: ITALY_FLAG_EMOJI },
  { month: 4, day: 25, title: 'Festa della Liberazione', emoji: ITALY_FLAG_EMOJI },
  { month: 5, day: 1, title: 'Festa del Lavoro', emoji: ITALY_FLAG_EMOJI },
  { month: 6, day: 2, title: 'Festa della Repubblica', emoji: ITALY_FLAG_EMOJI },
  { month: 8, day: 15, title: 'Ferragosto', emoji: ITALY_FLAG_EMOJI },
  { month: 11, day: 1, title: 'Ognissanti', emoji: ITALY_FLAG_EMOJI },
  { month: 12, day: 8, title: 'Immacolata Concezione', emoji: ITALY_FLAG_EMOJI },
  { month: 12, day: 25, title: 'Natale', emoji: ITALY_FLAG_EMOJI },
  { month: 12, day: 26, title: 'Santo Stefano', emoji: ITALY_FLAG_EMOJI },
]

const ITALIAN_MOVEABLE_HOLIDAYS: ItalianMoveableHoliday[] = [
  { daysFromEaster: 0, title: 'Pasqua', emoji: DOVE_EMOJI },
  { daysFromEaster: 1, title: "Lunedi dell'Angelo", emoji: DOVE_EMOJI },
]

export type PersonalRecurrenceFrequency =
  | 'weekly'
  | 'every-2-weeks'
  | 'monthly'
  | 'every-2-months'
  | 'every-3-months'
  | 'every-4-months'
  | 'yearly'
  | 'every-2-years'

export type PersonalRecurrenceRule = {
  id: string
  title: string
  emoji: string
  startsOn: string
  recurrence: PersonalRecurrenceFrequency
}

// Frequenze supportate:
// weekly, every-2-weeks, monthly, every-2-months, every-3-months, every-4-months, yearly, every-2-years
export const PERSONAL_RECURRENT_EVENTS: PersonalRecurrenceRule[] = [
  {
    id: 'riordino-cabina',
    title: 'Riordino cabina',
    emoji: BOTTLE_EMOJI,
    startsOn: '2026-01-07',
    recurrence: 'monthly',
  },
  {
    id: 'check-social',
    title: 'Check contenuti social',
    emoji: MEGAPHONE_EMOJI,
    startsOn: '2026-01-09',
    recurrence: 'every-2-weeks',
  },
  {
    id: 'rinnovo-assicurazione',
    title: 'Rinnovo assicurazione',
    emoji: SHIELD_EMOJI,
    startsOn: '2026-02-20',
    recurrence: 'yearly',
  },
]

export type ClientBirthdaySource = {
  id: string
  name?: string
  surname?: string
  birthdate?: string
}

const RECURRENCE_LABELS: Record<PersonalRecurrenceFrequency, string> = {
  weekly: 'settimanale',
  'every-2-weeks': 'ogni 2 settimane',
  monthly: 'mensile',
  'every-2-months': 'ogni 2 mesi',
  'every-3-months': 'ogni 3 mesi',
  'every-4-months': 'ogni 4 mesi',
  yearly: 'annuale',
  'every-2-years': 'ogni 2 anni',
}

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 86_400_000

export function getCalendarSpecialBadges(
  date: Date,
  clients: readonly ClientBirthdaySource[],
): CalendarSpecialBadge[] {
  const safeDate = toDateOnly(date)
  const dayKey = dayKeyForDate(safeDate)
  const badges: CalendarSpecialBadge[] = []

  const holiday = findItalianHoliday(safeDate)
  if (holiday) {
    badges.push({
      id: `holiday-${dayKey}`,
      kind: 'holiday',
      label: `${holiday.emoji} ${holiday.title}`,
    })
  }

  for (const recurrence of PERSONAL_RECURRENT_EVENTS) {
    if (!matchesPersonalRecurrence(safeDate, recurrence)) continue
    const frequencyLabel = RECURRENCE_LABELS[recurrence.recurrence]
    badges.push({
      id: `recurrence-${recurrence.id}-${dayKey}`,
      kind: 'recurrence',
      label: `${recurrence.emoji || REPEAT_EMOJI} ${recurrence.title} (${frequencyLabel})`,
    })
  }

  for (const client of clients) {
    if (!isClientBirthdayOnDate(client.birthdate, safeDate)) continue
    const fullName = formatClientName(client)
    badges.push({
      id: `birthday-${client.id}-${dayKey}`,
      kind: 'birthday',
      label: `${BIRTHDAY_EMOJI} Compleanno ${fullName}`,
    })
  }

  return badges
}

function dayKeyForDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0)
}

function parseDateOnly(value: unknown) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return undefined

  const match = DATE_ONLY_REGEX.exec(normalized)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const parsed = new Date(year, month - 1, day, 12, 0, 0, 0)
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return undefined
    }
    return parsed
  }

  const parsed = asDate(normalized)
  if (!parsed) return undefined
  return toDateOnly(parsed)
}

function daySerial(date: Date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS)
}

function dayDiff(from: Date, to: Date) {
  return daySerial(to) - daySerial(from)
}

function monthDiff(from: Date, to: Date) {
  const yearPart = (to.getFullYear() - from.getFullYear()) * 12
  return yearPart + (to.getMonth() - from.getMonth())
}

function sameMonthAndDay(a: Date, b: Date) {
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function findItalianHoliday(date: Date): HolidayDefinition | undefined {
  const fixedHoliday = ITALIAN_FIXED_HOLIDAYS.find(
    (holiday) => holiday.month === date.getMonth() + 1 && holiday.day === date.getDate(),
  )
  if (fixedHoliday) {
    return fixedHoliday
  }

  const easter = easterSunday(date.getFullYear())
  for (const holiday of ITALIAN_MOVEABLE_HOLIDAYS) {
    const candidate = new Date(easter)
    candidate.setDate(candidate.getDate() + holiday.daysFromEaster)
    if (sameMonthAndDay(candidate, date)) {
      return holiday
    }
  }

  return undefined
}

function easterSunday(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

function recurrenceStepMonths(frequency: PersonalRecurrenceFrequency) {
  switch (frequency) {
    case 'monthly':
      return 1
    case 'every-2-months':
      return 2
    case 'every-3-months':
      return 3
    case 'every-4-months':
      return 4
    default:
      return undefined
  }
}

function recurrenceStepYears(frequency: PersonalRecurrenceFrequency) {
  switch (frequency) {
    case 'yearly':
      return 1
    case 'every-2-years':
      return 2
    default:
      return undefined
  }
}

function matchesPersonalRecurrence(date: Date, recurrence: PersonalRecurrenceRule) {
  const anchorDate = parseDateOnly(recurrence.startsOn)
  if (!anchorDate) return false

  const diffDays = dayDiff(anchorDate, date)
  if (diffDays < 0) return false

  if (recurrence.recurrence === 'weekly') {
    return diffDays % 7 === 0
  }
  if (recurrence.recurrence === 'every-2-weeks') {
    return diffDays % 14 === 0
  }

  const monthlyStep = recurrenceStepMonths(recurrence.recurrence)
  if (monthlyStep) {
    if (date.getDate() !== anchorDate.getDate()) return false
    const diffMonths = monthDiff(anchorDate, date)
    return diffMonths >= 0 && diffMonths % monthlyStep === 0
  }

  const yearlyStep = recurrenceStepYears(recurrence.recurrence)
  if (yearlyStep) {
    if (!sameMonthAndDay(anchorDate, date)) return false
    const diffYears = date.getFullYear() - anchorDate.getFullYear()
    return diffYears >= 0 && diffYears % yearlyStep === 0
  }

  return false
}

function isClientBirthdayOnDate(rawBirthdate: unknown, date: Date) {
  const birthdate = parseDateOnly(rawBirthdate)
  if (!birthdate) return false
  return sameMonthAndDay(birthdate, date)
}

function formatClientName(client: ClientBirthdaySource) {
  const firstName = String(client.name ?? '').trim()
  const surname = String(client.surname ?? '').trim()
  const fullName = `${firstName} ${surname}`.trim()
  return fullName || 'Cliente'
}