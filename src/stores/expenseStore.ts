// src/stores/expenseStore.ts
import { reactive } from 'vue'
import { FirestoreStore } from 'cic-kit'
import { Expense, type ExpenseData } from '../models/Expense'

class ExpenseStore extends FirestoreStore<Expense, ExpenseData> {
  constructor() {
    super(Expense)
  }
}

export const expenseStore = reactive(new ExpenseStore())
