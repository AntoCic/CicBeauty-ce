// src/stores/treatmentStore.ts
import { reactive } from 'vue'
import { FirestoreStore } from 'cic-kit'
import { Treatment, type TreatmentData } from '../models/Treatment'

class TreatmentStore extends FirestoreStore<Treatment, TreatmentData> {
  constructor() {
    super(Treatment)
  }
}

export const treatmentStore = reactive(new TreatmentStore())
