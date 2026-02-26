import { ensureFirebase, functions } from 'cic-kit'
import { httpsCallable } from 'firebase/functions'

export type MarketingAgentRequest = {
  title: string
  context?: string
}

export type MarketingAgentResponse = {
  subtitle: string
  description: string
}

function getMarketingAgentCallable() {
  ensureFirebase()
  return httpsCallable<MarketingAgentRequest, MarketingAgentResponse>(functions, 'marketingAgent')
}

export async function callMarketingAgent(input: MarketingAgentRequest): Promise<MarketingAgentResponse> {
  const callable = getMarketingAgentCallable()
  const result = await callable(input)
  return result.data
}