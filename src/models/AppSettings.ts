// src/models/AppSettings.ts
import { FirestoreModel, type Timestampble } from 'cic-kit'

export interface AppSettingsData extends Partial<Timestampble> {
  id: string
  name: string
  description: string
  updateBy: string
}

export class AppSettings extends FirestoreModel<AppSettingsData> {
  static collectionName = 'appSettings'

  name: string
  description: string
  updateBy: string

  constructor(data: AppSettingsData) {
    super(data)
    this.name = data.name
    this.description = data.description
    this.updateBy = data.updateBy
  }

  toData(): AppSettingsData {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }
}
