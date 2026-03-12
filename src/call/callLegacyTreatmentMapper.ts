import { ensureFirebase, functions } from 'cic-kit'
import { httpsCallable } from 'firebase/functions'

export type LegacyTreatmentMapperInput = {
  oldId?: string
  name?: string
  typeExpenseId?: string
  typeExpenseName?: string
  duration?: number
  price?: number
}

export type LegacyTreatmentMapperCandidate = {
  id: string
  title: string
  typeExpenseName: string
  duration: number
  price: number
}

export type LegacyTreatmentMapperRequest = {
  legacyTreatment: LegacyTreatmentMapperInput
  maxAttempts?: number
}

export type LegacyTreatmentMapperResponse = {
  matchedTreatmentId?: string
  matchedTreatmentTitle?: string
  method: 'old_id' | 'name-exact' | 'gemini' | 'none'
  attempts: number
  reason: string
  candidates: LegacyTreatmentMapperCandidate[]
}

function getCallable() {
  ensureFirebase()
  return httpsCallable<LegacyTreatmentMapperRequest, LegacyTreatmentMapperResponse>(functions, 'legacyTreatmentMapper')
}

export async function callLegacyTreatmentMapper(
  input: LegacyTreatmentMapperRequest,
): Promise<LegacyTreatmentMapperResponse> {
  const callable = getCallable()
  const result = await callable(input)
  return result.data
}
