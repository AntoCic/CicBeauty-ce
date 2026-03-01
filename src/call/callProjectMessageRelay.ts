import { ensureFirebase, functions } from 'cic-kit'
import { httpsCallable } from 'firebase/functions'

export type PublishProjectMessageRequest = {
  typeMessage?: string
  title?: string
  message: string
  sendPush?: boolean
  payload?: Record<string, unknown>
}

export type PublishProjectMessageResponse = {
  ok: boolean
  status: number
  data: Record<string, unknown>
}

function getPublishProjectMessageCallable() {
  ensureFirebase()
  return httpsCallable<PublishProjectMessageRequest, PublishProjectMessageResponse>(
    functions,
    'publishProjectMessage',
  )
}

export async function callPublishProjectMessage(
  input: PublishProjectMessageRequest,
): Promise<PublishProjectMessageResponse> {
  const callable = getPublishProjectMessageCallable()
  const result = await callable(input)
  return result.data
}

// Backward-compatible alias name for existing imports.
export const callProjectMessageRelay = callPublishProjectMessage
