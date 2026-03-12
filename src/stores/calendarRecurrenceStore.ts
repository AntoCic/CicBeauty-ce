import { reactive } from 'vue'
import { FirestoreStore } from 'cic-kit'
import { CalendarRecurrence, type CalendarRecurrenceData } from '../models/CalendarRecurrence'

class CalendarRecurrenceStore extends FirestoreStore<CalendarRecurrence, CalendarRecurrenceData> {
  constructor() {
    super(CalendarRecurrence)
  }
}

export const calendarRecurrenceStore = reactive(new CalendarRecurrenceStore())

