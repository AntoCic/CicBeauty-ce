import { ensureFirebase, functions } from 'cic-kit'
import { httpsCallable } from 'firebase/functions'

export type ProductChatAgentRequest = {
  message: string
  limit?: number
}

export type ProductChatAgentResponse = {
  recommended: string[]
}

function getProductChatAgentCallable() {
  ensureFirebase()
  return httpsCallable<ProductChatAgentRequest, ProductChatAgentResponse>(functions, 'productChatAgent')
}

export async function callProductChatAgent(input: ProductChatAgentRequest): Promise<ProductChatAgentResponse> {
  const callable = getProductChatAgentCallable()
  const result = await callable(input)
  return result.data
}