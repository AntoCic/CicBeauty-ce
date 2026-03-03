import { FirestoreModel, type Timestampble } from 'cic-kit'

export interface TreatmentCategoryData extends Partial<Timestampble> {
  id: string
  title: string
  subtitle?: string
  emoji?: string
  imgUrls?: string[]
  updateBy: string
}

export class TreatmentCategory extends FirestoreModel<TreatmentCategoryData> {
  static collectionName = 'treatmentsCategories'

  title: string
  subtitle?: string
  emoji?: string
  imgUrls?: string[]
  updateBy: string

  constructor(data: TreatmentCategoryData) {
    super(data)
    this.title = data.title
    this.subtitle = data.subtitle
    this.emoji = String(data.emoji ?? '').trim() || undefined
    this.imgUrls = Array.isArray(data.imgUrls) ? data.imgUrls : []
    this.updateBy = data.updateBy
  }

  toData(): TreatmentCategoryData {
    return {
      id: this.id,
      title: this.title,
      subtitle: this.subtitle,
      emoji: this.emoji,
      imgUrls: this.imgUrls,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }
}
