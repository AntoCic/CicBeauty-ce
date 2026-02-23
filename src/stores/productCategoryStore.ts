import { reactive } from 'vue'
import { FirestoreStore, FirebaseFolder } from 'cic-kit'
import { ProductCategory, type ProductCategoryData } from '../models/ProductCategory'

class ProductCategoryStore extends FirestoreStore<ProductCategory, ProductCategoryData> {
  storageFolder?: FirebaseFolder

  constructor() {
    super(ProductCategory)
    this.storageFolder = new FirebaseFolder('/public/products')
  }
}

export const productCategoryStore = reactive(new ProductCategoryStore())
