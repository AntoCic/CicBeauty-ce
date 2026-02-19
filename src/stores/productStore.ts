// src/stores/productStore.ts
import { reactive } from 'vue'
import { FirestoreStore, FirebaseFolder } from 'cic-kit'
import { Product, type ProductData } from '../models/Product'

class ProductStore extends FirestoreStore<Product, ProductData> {
  storageFolder?: FirebaseFolder
  constructor() {
    super(Product)
    this.storageFolder = new FirebaseFolder(`/public/products`);
  }

}

export const productStore = reactive(new ProductStore())
