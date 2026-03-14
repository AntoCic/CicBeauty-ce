import { ensureFirebase, functions } from 'cic-kit'
import { httpsCallable } from 'firebase/functions'

export type SendWhatsAppTestMessageResponse = {
  ok: boolean
  status: number
  messageId: string
  recipient: string
  text: string
}

function getCallable() {
  ensureFirebase()
  return httpsCallable<void, SendWhatsAppTestMessageResponse>(functions, 'sendWhatsAppTestMessage')
}

export async function callSendWhatsAppTestMessage() {
  const callable = getCallable()
  const result = await callable()
  return result.data
}
