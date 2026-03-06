import { FirestoreModel, type Timestampble } from 'cic-kit'

export interface TypeCouponData extends Partial<Timestampble> {
  id: string
  name: string
  usage_limit: number
  price: number
  valid: boolean
  note?: string
  imgUrls?: string[]
  meta: Record<string, any>
  updateBy: string
}

export class TypeCoupon extends FirestoreModel<TypeCouponData> {
  static collectionName = 'typeCoupons'

  name: string
  usage_limit: number
  price: number
  valid: boolean
  note?: string
  imgUrls: string[]
  meta: Record<string, any>
  updateBy: string

  constructor(data: TypeCouponData) {
    super(data)
    this.name = data.name
    this.usage_limit = toFiniteNumber(data.usage_limit, 0)
    this.price = toFiniteNumber(data.price, 0)
    this.valid = Boolean(data.valid)
    this.note = data.note
    this.imgUrls = Array.isArray(data.imgUrls)
      ? data.imgUrls.map((value) => String(value ?? '').trim()).filter(Boolean)
      : []
    this.meta = normalizeMeta(data.meta)
    this.updateBy = data.updateBy
  }

  toData(): TypeCouponData {
    return {
      id: this.id,
      name: this.name,
      usage_limit: this.usage_limit,
      price: this.price,
      valid: this.valid,
      note: this.note,
      imgUrls: this.imgUrls,
      meta: this.meta,
      updateBy: this.updateBy,
      ...this.timestampbleProps(),
    }
  }
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function normalizeMeta(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, any>
}
