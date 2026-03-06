import { reactive } from 'vue'
import { FirestoreStore, FirebaseFolder } from 'cic-kit'
import { TypeCoupon, type TypeCouponData } from '../models/TypeCoupon'

class TypeCouponStore extends FirestoreStore<TypeCoupon, TypeCouponData> {
  storageFolder?: FirebaseFolder

  constructor() {
    super(TypeCoupon)
    this.storageFolder = new FirebaseFolder('/public/type-coupons')
  }
}

export const typeCouponStore = reactive(new TypeCouponStore())
