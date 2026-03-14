import { ensureFirebase, functions } from 'cic-kit'
import { httpsCallable } from 'firebase/functions'

export type WhatsAppInboundMessageItem = {
  id: string
  from: string
  fromName?: string
  type: string
  textPreview?: string
  timestamp?: string
  receivedAt?: string
  phoneNumberId?: string
}

export type ListWhatsAppInboundMessagesRequest = {
  limit?: number
}

export type ListWhatsAppInboundMessagesResponse = {
  items: WhatsAppInboundMessageItem[]
  count: number
}

function getCallable() {
  ensureFirebase()
  return httpsCallable<ListWhatsAppInboundMessagesRequest, ListWhatsAppInboundMessagesResponse>(
    functions,
    'listWhatsAppInboundMessages',
  )
}

export async function callListWhatsAppInboundMessages(input: ListWhatsAppInboundMessagesRequest = {}) {
  const callable = getCallable()
  const result = await callable(input)
  return result.data
}
