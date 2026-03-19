import type { GetProps } from 'cic-kit'
import { UserPermission } from '../enums/UserPermission'
import { Auth } from '../main'
import { appointmentStore } from '../stores/appointmentStore'
import { appointmentWatchState } from '../stores/appointmentWatchState'

const WATCH_PRIORITY = {
  default: 0,
  calendarMonth: 10,
  range: 20,
  day: 30,
} as const

const DEFAULT_REASON_APP = 'app-default'
const DEFAULT_REASON_CALENDAR = 'calendar-month-view'
const DEFAULT_REASON_DAY = 'calendar-day-view'

type WatchRequestMode = 'calendar-month' | 'day' | 'range'

type WatchRequest = {
  reason: string
  mode: WatchRequestMode
  priority: number
  from: Date
  to?: Date
  rangeKey: string
  updatedAt: number
}

type ActivateCalendarMonthWatchInput = {
  reason?: string
  prefetchMonths?: number
}

export type ActivateRangeWatchInput = {
  from: Date
  to?: Date
  reason: string
  priority?: number
}

const watchRequests = new Map<string, WatchRequest>()
const suspendedReasons = new Set<string>()
const calendarVisibleMonthByReason = new Map<string, string>()
const calendarFromByReason = new Map<string, Date>()
const calendarToByReason = new Map<string, Date>()
const activeMonthKeys = new Set<string>()
const loadedMonthKeys = new Set<string>()
const WATCH_HEALTH_CHECK_MS = 4000
const RETRY_DELAY_MIN_MS = 1500
const RETRY_DELAY_MAX_MS = 30000
const CALENDAR_WATCH_PADDING_MONTHS = 1

let appliedMode = 'idle'
let appliedReason = ''
let appliedRangeKey = ''
let appliedSuspendKey = ''
let applyQueue = Promise.resolve()
let watchHealthTimer: ReturnType<typeof setInterval> | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let retryAttempt = 0

function normalizeReason(value: unknown) {
  return String(value ?? '').trim()
}

function cloneDate(value: Date) {
  return new Date(value.getTime())
}

function isValidDate(value: Date) {
  return Number.isFinite(value.getTime())
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function startOfNextDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

function addMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1, 0, 0, 0, 0)
}

function monthKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function rangeKey(from: Date, to?: Date) {
  return `${from.getTime()}|${to ? to.getTime() : 'future'}`
}

function toIso(value?: Date) {
  if (!value) return ''
  return value.toISOString()
}

function hasOperatorPermission() {
  const user = Auth.user
  return Boolean(
    Auth.isAdmin ||
    Auth.isSuperAdmin ||
    user?.hasPermission?.(UserPermission.OPERATORE),
  )
}

function canStartAppointmentWatch() {
  const authUid = String(Auth.uid ?? '').trim()
  const firebaseUid = String(Auth.firebaseUser?.uid ?? '').trim()
  const uidLooksConsistent = !authUid || !firebaseUid || authUid === firebaseUid

  return Boolean(
    Auth?.isLoggedIn &&
    !Auth?.isOnLoginProcess &&
    firebaseUid &&
    uidLooksConsistent &&
    hasOperatorPermission(),
  )
}

function shouldWaitForAuthSession() {
  const authUid = String(Auth.uid ?? '').trim()
  const firebaseUid = String(Auth.firebaseUser?.uid ?? '').trim()
  const uidLooksConsistent = !authUid || !firebaseUid || authUid === firebaseUid
  return Boolean(
    Auth?.isLoggedIn &&
    hasOperatorPermission() &&
    (Auth?.isOnLoginProcess || !firebaseUid || !uidLooksConsistent),
  )
}

function syncMetaCollections() {
  appointmentWatchState.activeReasons = [...watchRequests.keys()].sort()
  appointmentWatchState.suspendedReasons = [...suspendedReasons].sort()
  appointmentWatchState.activeMonths = [...activeMonthKeys].sort()
  appointmentWatchState.loadedMonths = [...loadedMonthKeys].sort()
}

function setAppliedMeta(mode: typeof appointmentWatchState.activeMode, reason: string, from?: Date, to?: Date, key = '') {
  appointmentWatchState.activeMode = mode
  appointmentWatchState.activeReason = reason
  appointmentWatchState.currentFromIso = toIso(from)
  appointmentWatchState.currentToIso = toIso(to)
  appointmentWatchState.activeRangeKey = key
}

function rebuildActiveMonthKeys() {
  activeMonthKeys.clear()
  for (const key of calendarVisibleMonthByReason.values()) {
    activeMonthKeys.add(key)
  }
}

function addLoadedMonths(from: Date, untilMonth: Date) {
  let cursor = startOfMonth(from)
  const end = startOfMonth(untilMonth)
  while (cursor.getTime() <= end.getTime()) {
    loadedMonthKeys.add(monthKey(cursor))
    cursor = addMonths(cursor, 1)
  }
}

function buildRangeOpts(from: Date, to?: Date, maxResults?: number): GetProps {
  const opts: GetProps = {
    dateTime: to
      ? {
          from,
          to,
        }
      : {
          from,
        },
  }
  if (typeof maxResults === 'number' && maxResults > 0) {
    opts.limit = maxResults
  }
  return opts
}

function isPermissionDeniedError(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = String((error as { code?: unknown }).code ?? '')
    if (code.includes('permission-denied')) return true
  }
  const message = error instanceof Error ? error.message : String(error ?? '')
  return message.toLowerCase().includes('insufficient permissions')
}

function ensureWatchHealthTimer() {
  if (watchHealthTimer) return

  watchHealthTimer = setInterval(() => {
    if (suspendedReasons.size > 0) return
    if (appliedMode === 'idle') return
    if (appointmentStore.live) return
    scheduleRetry('listener dropped; scheduling restart')
  }, WATCH_HEALTH_CHECK_MS)
}

function clearRetryTimer() {
  if (!retryTimer) return
  clearTimeout(retryTimer)
  retryTimer = null
}

function resetRetryState() {
  retryAttempt = 0
  clearRetryTimer()
}

function scheduleRetry(reason: string, fixedDelayMs?: number) {
  if (retryTimer) return
  const delay = typeof fixedDelayMs === 'number'
    ? fixedDelayMs
    : Math.min(RETRY_DELAY_MIN_MS * 2 ** retryAttempt, RETRY_DELAY_MAX_MS)
  retryTimer = setTimeout(() => {
    retryTimer = null
    queueApplyWatchPlan()
  }, delay)
  console.warn(`[appointment-watch] ${reason}; retry in ${delay}ms`)
}

function pickEffectiveRequest() {
  let target: WatchRequest | undefined
  for (const request of watchRequests.values()) {
    if (!target) {
      target = request
      continue
    }
    if (request.priority > target.priority) {
      target = request
      continue
    }
    if (request.priority === target.priority && request.updatedAt > target.updatedAt) {
      target = request
    }
  }
  return target
}

async function safeStart(opts: GetProps) {
  try {
    // Workaround: cic-kit dedupe key currently does not distinguish dateTime values.
    // Force a fresh listener so range changes (e.g. stats from-date) are applied.
    appointmentStore.stop()
    await appointmentStore.start(opts)
    resetRetryState()
    return true
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      retryAttempt += 1
      scheduleRetry('permission denied while starting listener')
      console.warn('[appointment-watch] start denied, waiting auth/permissions sync', {
        authUid: String(Auth.uid ?? '').trim(),
        firebaseUid: String(Auth.firebaseUser?.uid ?? '').trim(),
        isLoggedIn: Boolean(Auth.isLoggedIn),
        isOnLoginProcess: Boolean(Auth.isOnLoginProcess),
      })
      return false
    }

    retryAttempt += 1
    scheduleRetry('start failed')
    console.error('[appointment-watch] start failed', error)
    return false
  }
}

function queueApplyWatchPlan() {
  ensureWatchHealthTimer()
  applyQueue = applyQueue
    .then(async () => {
      syncMetaCollections()

      if (suspendedReasons.size > 0) {
        resetRetryState()
        const suspendKey = [...suspendedReasons].sort().join('|')
        if (appliedMode !== 'suspended' || appliedSuspendKey !== suspendKey) {
          appointmentStore.stop()
          appointmentWatchState.restartCount += 1
          appliedMode = 'suspended'
          appliedReason = ''
          appliedRangeKey = ''
          appliedSuspendKey = suspendKey
        }
        setAppliedMeta('suspended', suspendKey)
        return
      }

      if (!canStartAppointmentWatch()) {
        const shouldRetryForAuthSync = shouldWaitForAuthSession()
        resetRetryState()
        if (shouldRetryForAuthSync) {
          scheduleRetry('auth session not ready for appointment watch', RETRY_DELAY_MIN_MS)
        }
        if (appointmentStore.live) {
          appointmentStore.stop()
          appointmentWatchState.restartCount += 1
        }
        appliedMode = 'idle'
        appliedReason = ''
        appliedRangeKey = ''
        setAppliedMeta('idle', '')
        return
      }

      appliedSuspendKey = ''
      const target = pickEffectiveRequest()
      if (target) {
        if (
          appliedMode === target.mode &&
          appliedReason === target.reason &&
          appliedRangeKey === target.rangeKey &&
          appointmentStore.live
        ) {
          setAppliedMeta(target.mode, target.reason, target.from, target.to, target.rangeKey)
          return
        }

        const started = await safeStart(buildRangeOpts(target.from, target.to))
        if (!started) return

        appliedMode = target.mode
        appliedReason = target.reason
        appliedRangeKey = target.rangeKey
        appointmentWatchState.restartCount += 1
        setAppliedMeta(target.mode, target.reason, target.from, target.to, target.rangeKey)
        return
      }

      const defaultRange = buildDefaultAppointmentWatchRange(new Date())
      const defaultKey = rangeKey(defaultRange.from, defaultRange.to)
      if (appliedMode === 'default' && appliedRangeKey === defaultKey && appointmentStore.live) {
        setAppliedMeta('default', DEFAULT_REASON_APP, defaultRange.from, defaultRange.to, defaultKey)
        return
      }

      const started = await safeStart(buildRangeOpts(defaultRange.from, defaultRange.to))
      if (!started) return

      appliedMode = 'default'
      appliedReason = DEFAULT_REASON_APP
      appliedRangeKey = defaultKey
      appointmentWatchState.restartCount += 1
      setAppliedMeta('default', DEFAULT_REASON_APP, defaultRange.from, defaultRange.to, defaultKey)
    })
    .catch((error) => {
      console.error('[appointment-watch] apply plan failed', error)
    })
}

function setWatchRequest(
  reason: string,
  mode: WatchRequestMode,
  from: Date,
  to: Date | undefined,
  priority: number,
) {
  const nextRangeKey = rangeKey(from, to)
  const current = watchRequests.get(reason)

  if (
    current &&
    current.mode === mode &&
    current.priority === priority &&
    current.rangeKey === nextRangeKey
  ) {
    queueApplyWatchPlan()
    return
  }

  watchRequests.set(reason, {
    reason,
    mode,
    priority,
    from,
    to,
    rangeKey: nextRangeKey,
    updatedAt: Date.now(),
  })

  queueApplyWatchPlan()
}

export function buildDefaultAppointmentWatchRange(referenceDate = new Date()) {
  const month = startOfMonth(referenceDate)
  const from = addMonths(month, -1)
  return { from, to: undefined as Date | undefined }
}

export function activateCalendarMonthWatch(monthDate: Date, input: string | ActivateCalendarMonthWatchInput = DEFAULT_REASON_CALENDAR) {
  const normalizedReason = normalizeReason(typeof input === 'string' ? input : input.reason)
  if (!normalizedReason) return () => undefined

  const visibleMonth = startOfMonth(cloneDate(monthDate))
  if (!isValidDate(visibleMonth)) return () => undefined

  const rawPrefetchMonths = typeof input === 'string' ? 1 : Number(input.prefetchMonths ?? 1)
  const prefetchMonths = Number.isFinite(rawPrefetchMonths)
    ? Math.max(0, Math.min(6, Math.trunc(rawPrefetchMonths)))
    : 1
  const requiredFrom = addMonths(visibleMonth, -1)
  const requiredTo = addMonths(visibleMonth, prefetchMonths + 1)
  const paddingMonths = Math.max(0, CALENDAR_WATCH_PADDING_MONTHS)
  const nextFrom = addMonths(requiredFrom, -paddingMonths)
  const nextTo = addMonths(requiredTo, paddingMonths)

  const currentFrom = calendarFromByReason.get(normalizedReason)
  const currentTo = calendarToByReason.get(normalizedReason)
  const currentCoversRequiredRange = Boolean(
    currentFrom &&
    currentTo &&
    currentFrom.getTime() <= requiredFrom.getTime() &&
    currentTo.getTime() >= requiredTo.getTime(),
  )

  const appliedFrom = currentCoversRequiredRange && currentFrom ? currentFrom : nextFrom
  const appliedTo = currentCoversRequiredRange && currentTo ? currentTo : nextTo

  calendarFromByReason.set(normalizedReason, appliedFrom)
  calendarToByReason.set(normalizedReason, appliedTo)
  calendarVisibleMonthByReason.set(normalizedReason, monthKey(visibleMonth))
  rebuildActiveMonthKeys()
  addLoadedMonths(appliedFrom, addMonths(visibleMonth, prefetchMonths + paddingMonths))

  if (!currentCoversRequiredRange) {
    setWatchRequest(normalizedReason, 'calendar-month', nextFrom, nextTo, WATCH_PRIORITY.calendarMonth)
  } else {
    queueApplyWatchPlan()
  }
  return () => releaseAppointmentWatch(normalizedReason)
}

export function activateDayWatch(dayDate: Date, reason = DEFAULT_REASON_DAY) {
  const normalizedReason = normalizeReason(reason)
  if (!normalizedReason) return () => undefined

  const from = startOfDay(cloneDate(dayDate))
  if (!isValidDate(from)) return () => undefined

  const to = startOfNextDay(from)
  setWatchRequest(normalizedReason, 'day', from, to, WATCH_PRIORITY.day)
  return () => releaseAppointmentWatch(normalizedReason)
}

export function activateRangeWatch(input: ActivateRangeWatchInput) {
  const normalizedReason = normalizeReason(input.reason)
  if (!normalizedReason) return () => undefined

  const from = cloneDate(input.from)
  if (!isValidDate(from)) return () => undefined

  const maybeTo = input.to ? cloneDate(input.to) : undefined
  const to =
    maybeTo && isValidDate(maybeTo) && maybeTo.getTime() > from.getTime()
      ? maybeTo
      : undefined

  setWatchRequest(normalizedReason, 'range', from, to, input.priority ?? WATCH_PRIORITY.range)
  return () => releaseAppointmentWatch(normalizedReason)
}

export function suspendAppointmentWatch(reason: string) {
  const normalizedReason = normalizeReason(reason)
  if (!normalizedReason) return () => undefined

  if (!suspendedReasons.has(normalizedReason)) {
    suspendedReasons.add(normalizedReason)
    queueApplyWatchPlan()
  } else {
    syncMetaCollections()
  }

  return () => resumeAppointmentWatch(normalizedReason)
}

export function resumeAppointmentWatch(reason: string) {
  const normalizedReason = normalizeReason(reason)
  if (!normalizedReason) return

  if (suspendedReasons.delete(normalizedReason)) {
    queueApplyWatchPlan()
  } else {
    syncMetaCollections()
  }
}

export function releaseAppointmentWatch(reason: string) {
  const normalizedReason = normalizeReason(reason)
  if (!normalizedReason) return

  let changed = false
  if (watchRequests.delete(normalizedReason)) changed = true
  if (suspendedReasons.delete(normalizedReason)) changed = true
  if (calendarVisibleMonthByReason.delete(normalizedReason)) changed = true
  if (calendarFromByReason.delete(normalizedReason)) changed = true
  if (calendarToByReason.delete(normalizedReason)) changed = true

  if (!changed) {
    syncMetaCollections()
    return
  }

  rebuildActiveMonthKeys()
  queueApplyWatchPlan()
}

export function ensureAppointmentWatchRunning() {
  queueApplyWatchPlan()
}

export function useAppointmentWatchManager() {
  return {
    appointmentWatchState,
    ensureAppointmentWatchRunning,
    activateCalendarMonthWatch,
    activateDayWatch,
    activateRangeWatch,
    suspendAppointmentWatch,
    resumeAppointmentWatch,
    releaseAppointmentWatch,
  }
}
