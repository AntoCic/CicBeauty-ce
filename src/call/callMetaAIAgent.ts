import { ensureFirebase, functions } from 'cic-kit'
import { httpsCallable } from 'firebase/functions'

export type MetaAIAgentRequest = {
  entityType: 'product' | 'treatment'
  source: Record<string, unknown>
  maxWords?: number
}

export type MetaAIAgentResponse = {
  metaAI: string
}

function getMetaAIAgentCallable() {
  ensureFirebase()
  return httpsCallable<MetaAIAgentRequest, MetaAIAgentResponse>(functions, 'metaAIAgent')
}

export async function callMetaAIAgent(input: MetaAIAgentRequest): Promise<MetaAIAgentResponse> {
  const callable = getMetaAIAgentCallable()
  const result = await callable(input)
  return result.data
}
