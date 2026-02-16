// src/models/Expense.ts
import { FirestoreModel, type Timestampble } from 'cic-kit'

export interface ExpenseData extends Partial<Timestampble> {
  id: string
  name: string
  type_expense_id: string
  price: number
  notes?: string
  recurrence?: string
  status: string
  paidAt: Date
  dueAt?: Date
  receiptUrls: string[] | false
  updateBy: string
}

export class Expense extends FirestoreModel<ExpenseData> {
  static collectionName = 'expenses'

  name: string
  type_expense_id: string
  price: number
  notes?: string
  recurrence?: string
  status: string
  paidAt: Date
  dueAt?: Date
  receiptUrls: string[] | false
  updateBy: string

  constructor(data: ExpenseData) {
    super(data)
    this.name = data.name
    this.type_expense_id = data.type_expense_id
    this.price = data.price
    this.notes = data.notes
    this.recurrence = data.recurrence
    this.status = data.status
    this.paidAt = data.paidAt
    this.dueAt = data.dueAt
    this.receiptUrls = data.receiptUrls ?? false
    this.updateBy = data.updateBy
  }

  toData(): ExpenseData {
    return {
      id: this.id,
      name: this.name,
      type_expense_id: this.type_expense_id,
      price: this.price,
      notes: this.notes,
      recurrence: this.recurrence,
      status: this.status,
      paidAt: this.paidAt,
      dueAt: this.dueAt,
      receiptUrls: this.receiptUrls,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }
}
