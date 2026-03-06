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
  title: string
  note?: string
  active: boolean
  valid_from?: Timestamp
  valid_to?: Timestamp
  usage: number
  client_id?: string
  treatment_ids?: string[]
  product_ids?: string[]
  type_coupon_id?: string
  fileUrls?: string[]
  meta: Record<string, any>
  updateBy: string
}

export class Coupon extends FirestoreModel<CouponData> {
  static collectionName = 'coupons'

  code: string
  title: string
  note?: string
  active: boolean
  valid_from?: Timestamp
  valid_to?: Timestamp
  usage: number
  client_id?: string
  treatment_ids: string[]
  product_ids: string[]
  type_coupon_id?: string
  fileUrls: string[]
  meta: Record<string, any>
  updateBy: string

  constructor(data: CouponData) {
    super(data)
    const legacy = data as unknown as {
      description?: string
      usage_count?: number
      usage_limit?: number
      meta?: Record<string, any>
      valid_from?: unknown
      valid_to?: unknown
    }

    this.code = data.code
    this.title = data.title
    this.note = data.note ?? legacy.description
    this.active = data.active
    this.valid_from = normalizeOptionalTimestamp(data.valid_from ?? legacy.valid_from)
    this.valid_to = normalizeOptionalTimestamp(data.valid_to ?? legacy.valid_to)
    this.usage = toFiniteNumber(data.usage, toFiniteNumber(legacy.usage_count, 0))
    this.client_id = data.client_id
    this.treatment_ids = normalizeIds(data.treatment_ids)
    this.product_ids = normalizeIds(data.product_ids)
    this.type_coupon_id = data.type_coupon_id
    this.fileUrls = Array.isArray(data.fileUrls)
      ? data.fileUrls.map((value) => String(value ?? '').trim()).filter(Boolean)
      : []
    this.meta = normalizeMeta(data.meta ?? legacy.meta)
    this.updateBy = data.updateBy
  }

  toData(): CouponData {
    return {
      id: this.id,
      code: this.code,
      title: this.title,
      note: this.note,
      active: this.active,
      valid_from: this.valid_from,
      valid_to: this.valid_to,
      usage: this.usage,
      client_id: this.client_id,
      treatment_ids: this.treatment_ids,
      product_ids: this.product_ids,
      type_coupon_id: this.type_coupon_id,
      fileUrls: this.fileUrls,
      meta: this.meta,
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

function normalizeMeta(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, any>
}
