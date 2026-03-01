// src/models/Client.ts
import { FirestoreModel, type Timestampble } from 'cic-kit'

export interface ClientData extends Partial<Timestampble> {
  id: string
  name: string
  surname: string
  phone_number?: string
  phone_numbers?: string[]
  birthdate?: Date
  gender?: string
  email?: string
  emails?: string[]
  preferredOperatorIds?: string[]
  tags?: string[]
  old_id?: string
  note?: string
  updateBy: string
}

export class Client extends FirestoreModel<ClientData> {
  static collectionName = 'clients'

  name: string
  surname: string
  phone_number?: string
  phone_numbers?: string[]
  birthdate?: Date
  gender?: string
  email?: string
  emails?: string[]
  preferredOperatorIds?: string[]
  tags?: string[]
  old_id?: string
  note?: string
  updateBy: string

  constructor(data: ClientData) {
    super(data)
    this.name = data.name
    this.surname = data.surname
    this.phone_number = data.phone_number
    this.phone_numbers = Array.isArray(data.phone_numbers) ? data.phone_numbers : []
    this.birthdate = data.birthdate
    this.gender = data.gender
    this.email = data.email
    this.emails = Array.isArray(data.emails) ? data.emails : []
    this.preferredOperatorIds = Array.isArray(data.preferredOperatorIds) ? data.preferredOperatorIds : []
    this.tags = Array.isArray(data.tags) ? data.tags : []
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
      phone_numbers: this.phone_numbers,
      birthdate: this.birthdate,
      gender: this.gender,
      email: this.email,
      emails: this.emails,
      preferredOperatorIds: this.preferredOperatorIds,
      tags: this.tags,
      old_id: this.old_id,
      note: this.note,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }
}
