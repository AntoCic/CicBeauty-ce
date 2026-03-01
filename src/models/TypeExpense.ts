// src/models/TypeExpense.ts
import { FirestoreModel, type Timestampble } from 'cic-kit'

export interface TypeExpenseData extends Partial<Timestampble> {
  id: string
  name: string
  emoji?: string
  description: string
  old_id?: string
  updateBy: string
}

export class TypeExpense extends FirestoreModel<TypeExpenseData> {
  static collectionName = 'typeExpenses'

  name: string
  emoji?: string
  description: string
  old_id?: string
  updateBy: string

  constructor(data: TypeExpenseData) {
    super(data)
    this.name = data.name
    this.emoji = data.emoji
    this.description = data.description
    this.old_id = data.old_id
    this.updateBy = data.updateBy
  }

  toData(): TypeExpenseData {
    return {
      id: this.id,
      name: this.name,
      emoji: this.emoji,
      description: this.description,
      old_id: this.old_id,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }
}
