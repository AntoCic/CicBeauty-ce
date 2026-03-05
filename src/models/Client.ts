// src/models/Client.ts
import { FirestoreModel, normalizeGender, type Gender, type Timestampble } from 'cic-kit'

export interface ClientData extends Partial<Timestampble> {
  id: string
  name: string
  surname: string
  phone_number?: string
  birthdate?: string
  gender: Gender
  email?: string
  preferredOperatorIds?: string[]
  preferred?: string[]
  user_id?: string
  old_id?: string
  note?: string
  updateBy: string
}

export class Client extends FirestoreModel<ClientData> {
  static collectionName = 'clients'
  // protected localStorageKey() { return 'clients' }

  name: string
  surname: string
  phone_number?: string
  birthdate?: string
  gender: Gender
  email?: string
  preferredOperatorIds?: string[]
  preferred?: string[]
  user_id?: string
  old_id?: string
  note?: string
  updateBy: string

  constructor(data: ClientData) {
    super(data)
    this.name = data.name
    this.surname = data.surname
    this.phone_number = data.phone_number
    this.birthdate = data.birthdate
    const normalizedGender = normalizeGender(data.gender)
    this.gender = normalizedGender || 'f'
    this.email = data.email
    this.preferredOperatorIds = Array.isArray(data.preferredOperatorIds) ? data.preferredOperatorIds : []
    this.preferred = Array.isArray(data.preferred) ? data.preferred : []
    this.user_id = data.user_id
    this.old_id = data.old_id
    this.note = data.note
    this.updateBy = data.updateBy
  }

  toData(): ClientData {
    return {
      id: this.id,
      name: this.name,
      surname: this.surname,
      phone_number: this.phone_number,
      birthdate: this.birthdate,
      gender: this.gender,
      email: this.email,
      preferredOperatorIds: this.preferredOperatorIds,
      preferred: this.preferred,
      user_id: this.user_id,
      old_id: this.old_id,
      note: this.note,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }
}
