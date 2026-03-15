// src/stores/clientStore.ts
import { reactive } from 'vue'
import { FirestoreStore, FirebaseFolder } from 'cic-kit'
import { Client, type ClientData } from '../models/Client'

class ClientStore extends FirestoreStore<Client, ClientData> {
  storageFolder?: FirebaseFolder

  constructor() {
    super(Client)
    this.storageFolder = new FirebaseFolder('/public/clients')
  }
}

export const clientStore = reactive(new ClientStore())
