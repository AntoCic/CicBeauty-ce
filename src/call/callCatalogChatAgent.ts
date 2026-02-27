import { ensureFirebase, functions } from 'cic-kit'
import { httpsCallable } from 'firebase/functions'

export type CatalogChatAgentRequest = {
  message: string
  history?: CatalogChatHistoryItem[]
  productLimit?: number
  treatmentLimit?: number
}

export type CatalogChatHistoryItem = {
  role: 'user' | 'assistant'
  text: string
}

export type CatalogSuggestion = {
  id: string
  reason: string
}

export type FinalAdvice = {
  title: string
  summary: string
  treatmentIds: string[]
  productIds: string[]
  frequency: string
  quantity: string
}

export type CatalogChatAgentResponse = {
  products: CatalogSuggestion[]
  treatments: CatalogSuggestion[]
  finalAdvice: FinalAdvice
}

function getCatalogChatAgentCallable() {
  ensureFirebase()
  return httpsCallable<CatalogChatAgentRequest, CatalogChatAgentResponse>(functions, 'catalogChatAgent')
}

export async function callCatalogChatAgent(input: CatalogChatAgentRequest): Promise<CatalogChatAgentResponse> {
  const callable = getCatalogChatAgentCallable()
  const result = await callable(input)
  return result.data
}
