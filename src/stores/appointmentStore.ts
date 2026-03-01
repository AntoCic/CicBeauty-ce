// src/stores/appointmentStore.ts
import { reactive } from 'vue'
import { FirestoreStore } from 'cic-kit'
import { Appointment, type AppointmentData } from '../models/Appointment'
import { orderBy, where, type QueryConstraint } from 'firebase/firestore'

class AppointmentStore extends FirestoreStore<Appointment, AppointmentData> {
  constructor() {
    super(Appointment)
  }

  async getRange(start: Date, end: Date, forceLocalSet = true) {
    const query: QueryConstraint[] = [
      where('date_time', '>=', start),
      where('date_time', '<', end),
      orderBy('date_time', 'asc'),
    ]
    return this.get({ query, forceLocalSet })
  }
}

export const appointmentStore = reactive(new AppointmentStore())
