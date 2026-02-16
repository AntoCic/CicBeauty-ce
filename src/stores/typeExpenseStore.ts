// src/stores/typeExpenseStore.ts
import { reactive } from 'vue'
import { FirestoreStore } from 'cic-kit'
import { TypeExpense, type TypeExpenseData } from '../models/TypeExpense'

class TypeExpenseStore extends FirestoreStore<TypeExpense, TypeExpenseData> {
  constructor() {
    super(TypeExpense)
  }
}

export const typeExpenseStore = reactive(new TypeExpenseStore())
