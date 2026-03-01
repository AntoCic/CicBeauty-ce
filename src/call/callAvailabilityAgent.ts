import { ensureFirebase, functions } from 'cic-kit'
import { httpsCallable } from 'firebase/functions'

export type AvailabilityAgentRequest = {
  clientId?: string
  referenceDate: string
  treatmentIds: string[]
  overrideDurationMinutes?: number
  rangeDays?: number
}

export type AvailabilityAgentSlot = {
  start: string
  end: string
  reason: string
}

export type AvailabilityAgentResponse = {
  durationMinutes: number
  slots: AvailabilityAgentSlot[]
  clientContext?: {
    previousAppointmentAt?: string
    nextAppointmentAt?: string
    totalAppointments: number
  }
}

function getCallable() {
  ensureFirebase()
  return httpsCallable<AvailabilityAgentRequest, AvailabilityAgentResponse>(functions, 'availabilityAgent')
}

export async function callAvailabilityAgent(input: AvailabilityAgentRequest) {
  const callable = getCallable()
  const result = await callable(input)
  return result.data
}
