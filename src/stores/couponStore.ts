import { reactive } from 'vue'
import { FirestoreStore } from 'cic-kit'
import { Coupon, type CouponData } from '../models/Coupon'

class CouponStore extends FirestoreStore<Coupon, CouponData> {
  constructor() {
    super(Coupon)
  }
}

export const couponStore = reactive(new CouponStore())
