import { ensureFirebase, functions } from 'cic-kit'
import { httpsCallable } from 'firebase/functions'
import { firebaseConfig } from '../firebase-config'

export type LaserShareTtlHours = 3 | 12 | 24 | 48 | 72

type CreateTokenRequest = {
  clientId: string
  ttlHours: LaserShareTtlHours
}

type CreateTokenResponse = {
  token: string
  expiresAt: string
  operatorFirstName: string
  ttlHours: number
}

type RevokeTokenRequest = {
  clientId: string
}

type RevokeTokenResponse = {
  revoked: boolean
}

export type PublicLaserShareSession = {
  ok: true
  clientName: string
  operatorFirstName: string
  expiresAt: string
  answers: Record<string, string | number>
  skippedKeys: string[]
}

export type SavePublicLaserSharePayload = {
  token: string
  updates?: Record<string, unknown>
  skippedKeys?: string[]
}

type SavePublicLaserShareResponse = {
  ok: true
  skippedKeys: string[]
}

function createTokenCallable() {
  ensureFirebase()
  return httpsCallable<CreateTokenRequest, CreateTokenResponse>(functions, 'createClientLaserShareToken')
}

function revokeTokenCallable() {
  ensureFirebase()
  return httpsCallable<RevokeTokenRequest, RevokeTokenResponse>(functions, 'revokeClientLaserShareToken')
}

function functionsBaseUrl() {
  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  const isLocalhost = host === 'localhost' || host === '127.0.0.1'
  if (isLocalhost) {
    return `http://127.0.0.1:5001/${firebaseConfig.projectId}/${firebaseConfig.functionsRegion}`
  }
  return `https://${firebaseConfig.functionsRegion}-${firebaseConfig.projectId}.cloudfunctions.net`
}

function readErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback
  const record = payload as Record<string, unknown>
  const message = String(record.message ?? '').trim()
  return message || fallback
}

export async function createClientLaserShareToken(input: CreateTokenRequest) {
  const callable = createTokenCallable()
  const result = await callable(input)
  return result.data
}

export async function revokeClientLaserShareToken(input: RevokeTokenRequest) {
  const callable = revokeTokenCallable()
  const result = await callable(input)
  return result.data
}

export async function fetchPublicLaserShareSession(token: string) {
  const queryToken = encodeURIComponent(String(token ?? '').trim())
  const response = await fetch(`${functionsBaseUrl()}/getClientLaserShareSession?token=${queryToken}`)
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(readErrorMessage(json, 'Sessione non disponibile'))
  }
  return json as PublicLaserShareSession
}

export async function savePublicLaserShareSessionStep(payload: SavePublicLaserSharePayload) {
  const response = await fetch(`${functionsBaseUrl()}/saveClientLaserShareSession`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(readErrorMessage(json, 'Errore salvataggio compilazione'))
  }
  return json as SavePublicLaserShareResponse
}

export function buildClientLaserShareUrl(token: string) {
  const normalizedToken = String(token ?? '').trim()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/laser-share/${encodeURIComponent(normalizedToken)}`
}
