// src/stores/appSettingsStore.ts
import { reactive } from 'vue'
import { FirestoreStore } from 'cic-kit'
import { AppSettings, type AppSettingsData } from '../models/AppSettings'

class AppSettingsStore extends FirestoreStore<AppSettings, AppSettingsData> {
  constructor() {
    super(AppSettings)
  }
}

export const appSettingsStore = reactive(new AppSettingsStore())
