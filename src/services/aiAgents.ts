import { functions } from 'cic-kit'
import { httpsCallable } from 'firebase/functions'

export type MarketingAgentRequest = {
  title: string
  context?: string
}

export type MarketingAgentResponse = {
  subtitle: string
  description: string
}

export type ProductChatAgentRequest = {
  message: string
  limit?: number
}

export type ProductChatAgentResponse = {
  recommended: string[]
}

const marketingAgentCallable = httpsCallable<MarketingAgentRequest, MarketingAgentResponse>(functions, 'marketingAgent')
const productChatAgentCallable = httpsCallable<ProductChatAgentRequest, ProductChatAgentResponse>(
  functions,
  'productChatAgent',
)

export async function callMarketingAgent(input: MarketingAgentRequest) {
  const result = await marketingAgentCallable(input)
  return result.data
}

export async function callProductChatAgent(input: ProductChatAgentRequest) {
  const result = await productChatAgentCallable(input)
  return result.data
}

export function parseAiError(error: unknown) {
  if (!error) return 'Errore AI inatteso.'
  if (typeof error === 'string') return error
  if (typeof error === 'object') {
    const anyError = error as { message?: unknown; details?: unknown }
    if (typeof anyError.message === 'string' && anyError.message.trim()) {
      return anyError.message
    }
    if (typeof anyError.details === 'string' && anyError.details.trim()) {
      return anyError.details
    }
  }
  return 'Errore AI inatteso.'
}
