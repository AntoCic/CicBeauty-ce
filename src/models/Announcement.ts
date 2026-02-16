// src/models/Announcement.ts
import { FirestoreModel, type Timestampble } from 'cic-kit'

export interface AnnouncementData extends Partial<Timestampble> {
  id: string
  type: string
  text: string
  updateBy: string
}

export class Announcement extends FirestoreModel<AnnouncementData> {
  static collectionName = 'announcements'

  type: string
  text: string
  updateBy: string

  constructor(data: AnnouncementData) {
    super(data)
    this.type = data.type
    this.text = data.text
    this.updateBy = data.updateBy
  }

  toData(): AnnouncementData {
    return {
      id: this.id,
      type: this.type,
      text: this.text,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }

}
