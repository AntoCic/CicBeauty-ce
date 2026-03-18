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

export interface CouponData extends Partial<Timestampble> {
  id: string
  code: string
  from: string
  note?: string
  active: boolean
  valid_from?: Timestamp
  valid_to?: Timestamp
  max_usage?: number
  client_id?: string
  trattamenti?: string[]
  updateBy: string
}

export class Coupon extends FirestoreModel<CouponData> {
  static collectionName = 'coupons'

  code: string
  from: string
  note?: string
  active: boolean
  valid_from?: Timestamp
  valid_to?: Timestamp
  max_usage: number
  client_id?: string
  trattamenti: string[]
  updateBy: string

  constructor(data: CouponData) {
    super(data)
    const legacy = data as unknown as {
      from_name?: string
      description?: string
      usage_count?: number
      usage_limit?: number
      valid_from?: unknown
      valid_to?: unknown
      title?: string
      treatment_ids?: string[]
      max_usage?: number
    }

    this.code = data.code
    this.from = normalizeString(data.from ?? legacy.from_name ?? legacy.title)
    this.note = data.note ?? legacy.description
    this.active = data.active ?? true
    this.valid_from = normalizeOptionalTimestamp(data.valid_from ?? legacy.valid_from)
    this.valid_to = normalizeOptionalTimestamp(data.valid_to ?? legacy.valid_to)
    this.max_usage = Math.max(
      1,
      toFiniteNumber(
        data.max_usage,
        toFiniteNumber(legacy.max_usage, toFiniteNumber(legacy.usage_limit, 1)),
      ),
    )
    this.client_id = data.client_id
    this.trattamenti = normalizeIds(data.trattamenti ?? legacy.treatment_ids)
    this.updateBy = data.updateBy
  }

  toData(): CouponData {
    return {
      id: this.id,
      code: this.code,
      from: this.from,
      note: this.note,
      active: this.active,
      valid_from: this.valid_from,
      valid_to: this.valid_to,
      max_usage: this.max_usage,
      client_id: this.client_id,
      trattamenti: this.trattamenti,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }
}

function normalizeIds(values: unknown) {
  if (!Array.isArray(values)) return []
  return values.map((value) => String(value ?? '').trim()).filter(Boolean)
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}
