import { reactive } from 'vue'
import { FirestoreStore, FirebaseFolder } from 'cic-kit'
import { Coupon, type CouponData } from '../models/Coupon'

class CouponStore extends FirestoreStore<Coupon, CouponData> {
  storageFolder?: FirebaseFolder

  constructor() {
    super(Coupon)
    this.storageFolder = new FirebaseFolder('/public/coupons')
  }
}

export const couponStore = reactive(new CouponStore())
