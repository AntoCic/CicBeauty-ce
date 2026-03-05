import { reactive } from 'vue'
import { FirestoreStore } from 'cic-kit'
import { PublicUser, type PublicUserData } from '../models/PublicUser'

class PublicUserStore extends FirestoreStore<PublicUser, PublicUserData> {
  constructor() {
    super(PublicUser)
  }
}

export const publicUserStore = reactive(new PublicUserStore())
