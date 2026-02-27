// src/models/Product.ts
import { FirestoreModel, type Timestampble } from 'cic-kit'

export interface ProductData extends Partial<Timestampble> {
  id: string
  title: string
  subtitle?: string
  icon?: string
  color: string
  type_expense_id: string
  categoryIds?: string[]
  price: number
  description?: string
  imgUrls?: string[]
  storeOrder?: number
  tag?: string[]
  imgDescriptionUrls?: string[]
  tipiDiPelle?: string
  consigliUso?: string
  ingredienti?: string
  metaAI?: string
  storeVisible: boolean
  storeDisabeld: string
  trattamentiConsogliatiIds?: string[]
  updateBy: string
}

export class Product extends FirestoreModel<ProductData> {
  static collectionName = 'products'

  title: string
  subtitle?: string
  icon?: string
  color: string
  type_expense_id: string
  categoryIds: string[]
  price: number
  description?: string
  imgUrls?: string[]
  storeOrder?: number
  tag?: string[]
  imgDescriptionUrls?: string[]
  tipiDiPelle?: string
  consigliUso?: string
  ingredienti?: string
  metaAI?: string
  storeVisible: boolean
  storeDisabeld: string
  trattamentiConsogliatiIds?: string[]
  updateBy: string

  constructor(data: ProductData) {
    super(data)
    this.title = data.title
    this.subtitle = data.subtitle
    this.icon = data.icon
    this.color = data.color
    this.type_expense_id = data.type_expense_id
    this.categoryIds = Array.isArray(data.categoryIds)
      ? data.categoryIds.map((id) => String(id ?? '').trim()).filter(Boolean)
      : []
    this.price = data.price
    this.description = data.description
    this.imgUrls = data.imgUrls
    this.storeOrder = data.storeOrder
    this.tag = data.tag
    this.imgDescriptionUrls = data.imgDescriptionUrls
    this.tipiDiPelle = data.tipiDiPelle
    this.consigliUso = data.consigliUso
    this.ingredienti = data.ingredienti
    this.metaAI = data.metaAI
    this.storeVisible = data.storeVisible
    this.storeDisabeld = data.storeDisabeld
    this.trattamentiConsogliatiIds = data.trattamentiConsogliatiIds
    this.updateBy = data.updateBy
  }

  toData(): ProductData {
    return {
      id: this.id,
      title: this.title,
      subtitle: this.subtitle,
      icon: this.icon,
      color: this.color,
      type_expense_id: this.type_expense_id,
      categoryIds: this.categoryIds,
      price: this.price,
      description: this.description,
      imgUrls: this.imgUrls,
      storeOrder: this.storeOrder,
      tag: this.tag,
      imgDescriptionUrls: this.imgDescriptionUrls,
      tipiDiPelle: this.tipiDiPelle,
      consigliUso: this.consigliUso,
      ingredienti: this.ingredienti,
      metaAI: this.metaAI,
      storeVisible: this.storeVisible,
      storeDisabeld: this.storeDisabeld,
      trattamentiConsogliatiIds: this.trattamentiConsogliatiIds,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }

  get formattedPrice() {
    if (typeof this.price !== "number" || Number.isNaN(this.price)) return "-";
    const priceFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
    return priceFormatter.format(this.price);
  }
}
