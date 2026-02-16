// src/stores/announcementStore.ts
import { reactive } from 'vue'
import { FirestoreStore } from 'cic-kit'
import { Announcement, type AnnouncementData } from '../models/Announcement'

class AnnouncementStore extends FirestoreStore<Announcement, AnnouncementData> {
  constructor() {
    super(Announcement)
  }
}

export const announcementStore = reactive(new AnnouncementStore())