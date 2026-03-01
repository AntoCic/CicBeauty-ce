// src/stores/expenseStore.ts
import { reactive } from 'vue'
import { FirestoreStore, FirebaseFolder } from 'cic-kit'
import { Expense, type ExpenseData } from '../models/Expense'

class ExpenseStore extends FirestoreStore<Expense, ExpenseData> {
  storageFolder?: FirebaseFolder

  constructor() {
    super(Expense)
    this.storageFolder = new FirebaseFolder('/public/expenses')
  }
}

export const expenseStore = reactive(new ExpenseStore())
