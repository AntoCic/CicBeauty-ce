import { FirestoreModel, type Timestampble } from 'cic-kit'

export interface CouponData extends Partial<Timestampble> {
  id: string
  code: string
  title: string
  description?: string
  discount_type: 'fixed' | 'percent'
  discount_value: number
  active: boolean
  valid_from?: Date
  valid_to?: Date
  usage_limit?: number
  usage_count?: number
  client_id?: string
  treatment_ids?: string[]
  product_ids?: string[]
  updateBy: string
}

export class Coupon extends FirestoreModel<CouponData> {
  static collectionName = 'coupons'

  code: string
  title: string
  description?: string
  discount_type: 'fixed' | 'percent'
  discount_value: number
  active: boolean
  valid_from?: Date
  valid_to?: Date
  usage_limit?: number
  usage_count: number
  client_id?: string
  treatment_ids?: string[]
  product_ids?: string[]
  updateBy: string

  constructor(data: CouponData) {
    super(data)
    this.code = data.code
    this.title = data.title
    this.description = data.description
    this.discount_type = data.discount_type
    this.discount_value = data.discount_value
    this.active = data.active
    this.valid_from = data.valid_from
    this.valid_to = data.valid_to
    this.usage_limit = data.usage_limit
    this.usage_count = data.usage_count ?? 0
    this.client_id = data.client_id
    this.treatment_ids = data.treatment_ids
    this.product_ids = data.product_ids
    this.updateBy = data.updateBy
  }

  toData(): CouponData {
    return {
      id: this.id,
      code: this.code,
      title: this.title,
      description: this.description,
      discount_type: this.discount_type,
      discount_value: this.discount_value,
      active: this.active,
      valid_from: this.valid_from,
      valid_to: this.valid_to,
      usage_limit: this.usage_limit,
      usage_count: this.usage_count,
      client_id: this.client_id,
      treatment_ids: this.treatment_ids,
      product_ids: this.product_ids,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }
}
