import { ensureFirebase, functions } from 'cic-kit'
import { httpsCallable } from 'firebase/functions'

export type ProjectMessageRelayRequest = {
  typeMessage?: string
  title?: string
  message: string
  taskId?: string
  sourceProjectId?: string
  sourceLabel?: string
  sendPush?: boolean
  updateBy?: string
  payload?: Record<string, unknown>
}

export type ProjectMessageRelayResponse = {
  ok: boolean
  status: number
  data: Record<string, unknown>
}

function getProjectMessageRelayCallable() {
  ensureFirebase()
  return httpsCallable<ProjectMessageRelayRequest, ProjectMessageRelayResponse>(functions, 'relayProjectMessage')
}

export async function callProjectMessageRelay(
  input: ProjectMessageRelayRequest,
): Promise<ProjectMessageRelayResponse> {
  const callable = getProjectMessageRelayCallable()
  const result = await callable(input)
  return result.data
}
