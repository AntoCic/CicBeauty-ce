// src/models/TypeExpense.ts
import { FirestoreModel, type Timestampble } from 'cic-kit'

export interface TypeExpenseData extends Partial<Timestampble> {
  id: string
  name: string
  emoji?: string
  description: string
  updateBy: string
}

export class TypeExpense extends FirestoreModel<TypeExpenseData> {
  static collectionName = 'typeExpenses'

  name: string
  emoji?: string
  description: string
  updateBy: string

  constructor(data: TypeExpenseData) {
    super(data)
    this.name = data.name
    this.emoji = data.emoji
    this.description = data.description
    this.updateBy = data.updateBy
  }

  toData(): TypeExpenseData {
    return {
      id: this.id,
      name: this.name,
      emoji: this.emoji,
      description: this.description,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }
}
