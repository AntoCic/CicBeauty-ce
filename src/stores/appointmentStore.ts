// src/stores/appointmentStore.ts
import { reactive } from 'vue'
import { FirestoreStore } from 'cic-kit'
import { Appointment, type AppointmentData } from '../models/Appointment'

class AppointmentStore extends FirestoreStore<Appointment, AppointmentData> {
  constructor() {
    super(Appointment)
  }
}

export const appointmentStore = reactive(new AppointmentStore())
