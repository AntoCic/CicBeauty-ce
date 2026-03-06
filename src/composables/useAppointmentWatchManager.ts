import type { GetProps } from 'cic-kit'
import { Timestamp, where } from 'firebase/firestore'
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
  opts: GetProps
  updatedAt: number
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
const activeMonthKeys = new Set<string>()
const loadedMonthKeys = new Set<string>()

let appliedMode = 'idle'
let appliedReason = ''
let appliedRangeKey = ''
let appliedSuspendKey = ''
let applyQueue = Promise.resolve()

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

function buildRangeOpts(from: Date, to?: Date): GetProps {
  const query = [where('date_time', '>=', Timestamp.fromDate(from))]
  if (to) {
    query.push(where('date_time', '<', Timestamp.fromDate(to)))
  }
  return {
    query,
    orderBy: { fieldPath: 'date_time', directionStr: 'asc' },
  }
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
    await appointmentStore.start(opts)
    return true
  } catch (error) {
    console.error('[appointment-watch] start failed', error)
    return false
  }
}

function queueApplyWatchPlan() {
  applyQueue = applyQueue
    .then(async () => {
      syncMetaCollections()

      if (suspendedReasons.size > 0) {
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

        const started = await safeStart(target.opts)
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
    opts: buildRangeOpts(from, to),
    updatedAt: Date.now(),
  })

  queueApplyWatchPlan()
}

export function buildDefaultAppointmentWatchRange(referenceDate = new Date()) {
  const month = startOfMonth(referenceDate)
  const from = addMonths(month, -1)
  return { from, to: undefined as Date | undefined }
}

export function buildDefaultAppointmentWatchOpts(referenceDate = new Date()): GetProps {
  const { from, to } = buildDefaultAppointmentWatchRange(referenceDate)
  return buildRangeOpts(from, to)
}

export function activateCalendarMonthWatch(monthDate: Date, reason = DEFAULT_REASON_CALENDAR) {
  const normalizedReason = normalizeReason(reason)
  if (!normalizedReason) return () => undefined

  const visibleMonth = startOfMonth(cloneDate(monthDate))
  if (!isValidDate(visibleMonth)) return () => undefined

  const targetFrom = addMonths(visibleMonth, -1)
  const previousFrom = calendarFromByReason.get(normalizedReason)
  const nextFrom =
    previousFrom && previousFrom.getTime() <= targetFrom.getTime()
      ? previousFrom
      : targetFrom

  calendarFromByReason.set(normalizedReason, nextFrom)
  calendarVisibleMonthByReason.set(normalizedReason, monthKey(visibleMonth))
  rebuildActiveMonthKeys()
  addLoadedMonths(nextFrom, visibleMonth)

  setWatchRequest(normalizedReason, 'calendar-month', nextFrom, undefined, WATCH_PRIORITY.calendarMonth)
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

  if (!changed) {
    syncMetaCollections()
    return
  }

  rebuildActiveMonthKeys()
  queueApplyWatchPlan()
}

export function useAppointmentWatchManager() {
  return {
    appointmentWatchState,
    activateCalendarMonthWatch,
    activateDayWatch,
    activateRangeWatch,
    suspendAppointmentWatch,
    resumeAppointmentWatch,
    releaseAppointmentWatch,
  }
}
