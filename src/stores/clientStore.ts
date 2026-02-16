// src/stores/clientStore.ts
import { reactive } from 'vue'
import { FirestoreStore } from 'cic-kit'
import { Client, type ClientData } from '../models/Client'

class ClientStore extends FirestoreStore<Client, ClientData> {
  constructor() {
    super(Client)
  }
}

export const clientStore = reactive(new ClientStore())
