import { reactive } from 'vue'
import { FirestoreStore, FirebaseFolder } from 'cic-kit'
import { TreatmentCategory, type TreatmentCategoryData } from '../models/TreatmentCategory'

class TreatmentCategoryStore extends FirestoreStore<TreatmentCategory, TreatmentCategoryData> {
  storageFolder?: FirebaseFolder

  constructor() {
    super(TreatmentCategory)
    this.storageFolder = new FirebaseFolder('/public/treatments')
  }
}

export const treatmentCategoryStore = reactive(new TreatmentCategoryStore())
