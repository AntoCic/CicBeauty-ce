// src/models/Expense.ts
import { FirestoreModel, type Timestampble } from 'cic-kit'
import { Timestamp } from 'firebase/firestore'
import { asDate } from '../utils/date'

function normalizeTimestamp(value: unknown, fallback?: Timestamp) {
  if (value instanceof Timestamp) return value
  const nextDate = asDate(value)
  if (nextDate) return Timestamp.fromDate(nextDate)
  return fallback ?? Timestamp.now()
}

function normalizeOptionalTimestamp(value: unknown) {
  if (!value) return undefined
  return normalizeTimestamp(value)
}

export interface ExpenseData extends Partial<Timestampble> {
  id: string
  name: string
  type_expense_id: string
  expense_kind?: 'purchase' | 'operational' | 'marketing' | 'other'
  price: number
  quantity?: number
  unit_cost?: number
  notes?: string
  recurrence?: string
  status: string
  coupon_id?: string
  client_id?: string
  appointment_id?: string
  paidAt: Timestamp
  dueAt?: Timestamp
  attachments?: string[]
  receiptUrls: string[] | false
  updateBy: string
}

export class Expense extends FirestoreModel<ExpenseData> {
  static collectionName = 'expenses'

  name: string
  type_expense_id: string
  expense_kind?: 'purchase' | 'operational' | 'marketing' | 'other'
  price: number
  quantity?: number
  unit_cost?: number
  notes?: string
  recurrence?: string
  status: string
  coupon_id?: string
  client_id?: string
  appointment_id?: string
  paidAt: Timestamp
  dueAt?: Timestamp
  attachments?: string[]
  receiptUrls: string[] | false
  updateBy: string

  constructor(data: ExpenseData) {
    super(data)
    this.name = data.name
    this.type_expense_id = data.type_expense_id
    this.expense_kind = data.expense_kind
    this.price = data.price
    this.quantity = data.quantity
    this.unit_cost = data.unit_cost
    this.notes = data.notes
    this.recurrence = data.recurrence
    this.status = data.status
    this.coupon_id = data.coupon_id
    this.client_id = data.client_id
    this.appointment_id = data.appointment_id
    this.paidAt = normalizeTimestamp(data.paidAt)
    this.dueAt = normalizeOptionalTimestamp(data.dueAt)
    this.attachments = Array.isArray(data.attachments) ? data.attachments : []
    this.receiptUrls = data.receiptUrls ?? false
    this.updateBy = data.updateBy
  }

  toData(): ExpenseData {
    return {
      id: this.id,
      name: this.name,
      type_expense_id: this.type_expense_id,
      expense_kind: this.expense_kind,
      price: this.price,
      quantity: this.quantity,
      unit_cost: this.unit_cost,
      notes: this.notes,
      recurrence: this.recurrence,
      status: this.status,
      coupon_id: this.coupon_id,
      client_id: this.client_id,
      appointment_id: this.appointment_id,
      paidAt: this.paidAt,
      dueAt: this.dueAt,
      attachments: this.attachments,
      receiptUrls: this.receiptUrls,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }
}
