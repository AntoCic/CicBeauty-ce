// src/stores/productStore.ts
import { reactive } from 'vue'
import { FirestoreStore } from 'cic-kit'
import { Product, type ProductData } from '../models/Product'

class ProductStore extends FirestoreStore<Product, ProductData> {
  constructor() {
    super(Product)
  }
}

export const productStore = reactive(new ProductStore())
