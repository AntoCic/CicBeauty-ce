import { ensureFirebase, functions } from 'cic-kit'
import { httpsCallable } from 'firebase/functions'

export type TestFillMissingCategoryEmojisRequest = {
  limit?: number
}

export type TestFillMissingCategoryEmojisItem = {
  collection: 'productsCategories' | 'treatmentsCategories'
  id: string
  title: string
  emoji: string
  status: 'updated' | 'missing-output'
}

export type TestFillMissingCategoryEmojisResponse = {
  model: string
  scanned: number
  missingBefore: number
  attempted: number
  updated: number
  items: TestFillMissingCategoryEmojisItem[]
}

function getCallable() {
  ensureFirebase()
  return httpsCallable<TestFillMissingCategoryEmojisRequest, TestFillMissingCategoryEmojisResponse>(
    functions,
    'testFillMissingCategoryEmojis',
  )
}

export async function callTestFillMissingCategoryEmojis(
  input: TestFillMissingCategoryEmojisRequest = {},
): Promise<TestFillMissingCategoryEmojisResponse> {
  const callable = getCallable()
  const result = await callable(input)
  return result.data
}
