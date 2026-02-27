import { analytics } from 'cic-kit'
import { setAnalyticsCollectionEnabled } from 'firebase/analytics'
import { buildCookieConsentStorageKey } from '../models/AppConfig'
import { appConfigStore } from '../stores/appConfigStore'

export const COOKIE_CONSENT_STORAGE_KEY_FALLBACK = buildCookieConsentStorageKey('v1')

export type CookieConsentChoice = 'accepted' | 'rejected'

export function getCookieConsentStorageKey() {
  const config = appConfigStore.getConfigData()
  return buildCookieConsentStorageKey(config.cookieConsentKeyDate)
}

export function readCookieConsentChoice(storageKey = getCookieConsentStorageKey()): CookieConsentChoice | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(storageKey)
  if (value === 'accepted' || value === 'rejected') return value

  // Backward compatibility with old static key
  const fallbackValue = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY_FALLBACK)
  if (fallbackValue === 'accepted' || fallbackValue === 'rejected') return fallbackValue

  return null
}

export function bootstrapConsentBeforeFirebase(measurementId?: string, storageKey = getCookieConsentStorageKey()) {
  const choice = readCookieConsentChoice(storageKey)
  setGaDisableFlag(measurementId, choice !== 'accepted')
}

export function saveCookieConsentChoice(
  choice: CookieConsentChoice,
  measurementId?: string,
  storageKey = getCookieConsentStorageKey(),
) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, choice)
  applyConsentToAnalytics(measurementId, choice, storageKey)
}

export function applyConsentToAnalytics(
  measurementId?: string,
  choice: CookieConsentChoice | null = readCookieConsentChoice(),
  _storageKey = getCookieConsentStorageKey(),
) {
  const analyticsEnabled = choice === 'accepted'
  setGaDisableFlag(measurementId, !analyticsEnabled)
  try {
    setAnalyticsCollectionEnabled(analytics, analyticsEnabled)
  } catch {
    // Ignore unsupported-browser/no-analytics environments.
  }
}

function setGaDisableFlag(measurementId: string | undefined, disabled: boolean) {
  if (typeof window === 'undefined') return
  const id = String(measurementId ?? '').trim()
  if (!id) return
  ;(window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = disabled
}
