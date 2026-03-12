import { FirestoreModel, type Timestampble } from 'cic-kit'
import {
  CALENDAR_RECURRENCE_CATEGORIES,
  CALENDAR_RECURRENCE_FREQUENCIES,
  type CalendarRecurrenceCategory,
  type CalendarRecurrenceFrequency,
} from '../utils/calendarSpecialDays'

export interface CalendarRecurrenceData extends Partial<Timestampble> {
  id: string
  title: string
  emoji: string
  startsOn: string
  recurrence: CalendarRecurrenceFrequency
  category: CalendarRecurrenceCategory
  active: boolean
  updateBy: string
}

const DEFAULT_RECURRENCE_FREQUENCY: CalendarRecurrenceFrequency = 'yearly'
const DEFAULT_RECURRENCE_CATEGORY: CalendarRecurrenceCategory = 'general'

function isCalendarRecurrenceFrequency(value: unknown): value is CalendarRecurrenceFrequency {
  return CALENDAR_RECURRENCE_FREQUENCIES.includes(value as CalendarRecurrenceFrequency)
}

function isCalendarRecurrenceCategory(value: unknown): value is CalendarRecurrenceCategory {
  return CALENDAR_RECURRENCE_CATEGORIES.includes(value as CalendarRecurrenceCategory)
}

function normalizeRecurrenceFrequency(value: unknown): CalendarRecurrenceFrequency {
  return isCalendarRecurrenceFrequency(value) ? value : DEFAULT_RECURRENCE_FREQUENCY
}

function normalizeRecurrenceCategory(value: unknown): CalendarRecurrenceCategory {
  return isCalendarRecurrenceCategory(value) ? value : DEFAULT_RECURRENCE_CATEGORY
}

export class CalendarRecurrence extends FirestoreModel<CalendarRecurrenceData> {
  static collectionName = 'calendarRecurrences'

  title: string
  emoji: string
  startsOn: string
  recurrence: CalendarRecurrenceFrequency
  category: CalendarRecurrenceCategory
  active: boolean
  updateBy: string

  constructor(data: CalendarRecurrenceData) {
    super(data)
    this.title = String(data.title ?? '').trim()
    this.emoji = String(data.emoji ?? '').trim()
    this.startsOn = String(data.startsOn ?? '').trim()
    this.recurrence = normalizeRecurrenceFrequency(data.recurrence)
    this.category = normalizeRecurrenceCategory(data.category)
    this.active = data.active ?? true
    this.updateBy = String(data.updateBy ?? '').trim()
  }

  toData(): CalendarRecurrenceData {
    return {
      id: this.id,
      title: this.title,
      emoji: this.emoji,
      startsOn: this.startsOn,
      recurrence: this.recurrence,
      category: this.category,
      active: this.active,
      updateBy: this.updateBy,
      ...this.timestampbleProps(),
    }
  }
}

