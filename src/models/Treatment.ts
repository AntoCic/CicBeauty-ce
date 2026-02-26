// src/models/Treatment.ts
import { FirestoreModel, type Timestampble } from 'cic-kit'

export interface TreatmentData extends Partial<Timestampble> {
  id: string
  title: string
  subtitle?: string
  icon?: string
  color: string
  type_expense_id: string
  categoryIds?: string[]
  duration: number
  price: number
  description?: string
  imgUrls?: string[]
  storeOrder?: number
  tag?: string[]
  imgDescriptionUrls?: string[]
  tipiDiPelle?: string
  prodottiConsigliatiIds?: string[]
  ingredienti?: string
  storeVisible: boolean
  storeDisabeld: string
  updateBy: string
}

export class Treatment extends FirestoreModel<TreatmentData> {
  static collectionName = 'treatments'

  title: string
  subtitle?: string
  icon?: string
  color: string
  type_expense_id: string
  categoryIds: string[]
  duration: number
  price: number
  description?: string
  imgUrls?: string[]
  storeOrder?: number
  tag?: string[]
  imgDescriptionUrls?: string[]
  tipiDiPelle?: string
  prodottiConsigliatiIds?: string[]
  ingredienti?: string
  storeVisible: boolean
  storeDisabeld: string
  updateBy: string

  constructor(data: TreatmentData) {
    super(data)
    this.title = data.title
    this.subtitle = data.subtitle
    this.icon = data.icon
    this.color = data.color
    this.type_expense_id = data.type_expense_id
    this.categoryIds = Array.isArray(data.categoryIds)
      ? data.categoryIds.map((id) => String(id ?? '').trim()).filter(Boolean)
      : []
    this.duration = data.duration
    this.price = data.price
    this.description = data.description
    this.imgUrls = data.imgUrls
    this.storeOrder = data.storeOrder
    this.tag = data.tag
    this.imgDescriptionUrls = data.imgDescriptionUrls
    this.tipiDiPelle = data.tipiDiPelle
    this.prodottiConsigliatiIds = data.prodottiConsigliatiIds
    this.ingredienti = data.ingredienti
    this.storeVisible = data.storeVisible
    this.storeDisabeld = data.storeDisabeld
    this.updateBy = data.updateBy
  }

  toData(): TreatmentData {
    return {
      id: this.id,
      title: this.title,
      subtitle: this.subtitle,
      icon: this.icon,
      color: this.color,
      type_expense_id: this.type_expense_id,
      categoryIds: this.categoryIds,
      duration: this.duration,
      price: this.price,
      description: this.description,
      imgUrls: this.imgUrls,
      storeOrder: this.storeOrder,
      tag: this.tag,
      imgDescriptionUrls: this.imgDescriptionUrls,
      tipiDiPelle: this.tipiDiPelle,
      prodottiConsigliatiIds: this.prodottiConsigliatiIds,
      ingredienti: this.ingredienti,
      storeVisible: this.storeVisible,
      storeDisabeld: this.storeDisabeld,
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
