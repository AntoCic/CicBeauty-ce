// src/models/Client.ts
import { FirestoreModel, type Timestampble } from 'cic-kit'

export interface ClientData extends Partial<Timestampble> {
  id: string
  name: string
  surname: string
  phone_number: string
  birthdate?: Date
  gender?: string
  email?: string
  note?: string
  updateBy: string
}

export class Client extends FirestoreModel<ClientData> {
  static collectionName = 'clients'

  name: string
  surname: string
  phone_number: string
  birthdate?: Date
  gender?: string
  email?: string
  note?: string
  updateBy: string

  constructor(data: ClientData) {
    super(data)
    this.name = data.name
    this.surname = data.surname
    this.phone_number = data.phone_number
    this.birthdate = data.birthdate
    this.gender = data.gender
    this.email = data.email
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
      note: this.note,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }
}
