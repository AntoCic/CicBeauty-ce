<script setup lang="ts">
import { Btn, cicKitStore, loading } from 'cic-kit'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppointmentWatchManager } from '../../composables/useAppointmentWatchManager'
import { DEFAULT_USER_COLOR, normalizeUserColor } from '../../constants/userProfile'
import { Auth } from '../../main'
import { appConfigStore } from '../../stores/appConfigStore'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { publicUserStore } from '../../stores/publicUser'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { treatmentStore } from '../../stores/treatmentStore'
import { calendarRecurrenceStore } from '../../stores/calendarRecurrenceStore'
import {
  appointmentOperatorIds,
  appointmentPersonalOwnerId,
  canReadAppointmentForUser,
  isPersonalAppointment,
} from '../../utils/appointmentVisibility'
import { addMonths, computeAppointmentDurationMinutes, startOfDay } from '../../utils/calendar'
import {
  RECURRENCE_LABELS,
  getCalendarSpecialBadges,
  type CalendarSpecialBadge,
  type CalendarRecurrenceCategory,
  type CalendarRecurrenceFrequency,
  type ClientBirthdaySource,
} from '../../utils/calendarSpecialDays'
import { asDate } from '../../utils/date'
import CalendarAppointmentCard from './components/CalendarAppointmentCard.vue'
import CalendarHeaderExtra from './components/CalendarHeaderExtra.vue'

type StoreAppointment = (typeof appointmentStore.itemsActiveArray)[number]

type TreatmentLite = {
  title: string
  duration: number
  price: number
  categoryIds: string[]
}

type VisibleAppointment = {
  id: string
  start: Date
  end: Date
  dayKey: string
  notes: string
  clientFirstName: string
  clientSurname: string
  treatmentNames: string[]
  durationMinutes: number
  totalPrice: number
  emojis: string[]
  isPersonal: boolean
  operatorColor: string
  operatorIds: string[]
  hasOperatorOverlap: boolean
}

type CalendarDayCell = {
  key: string
  date: Date
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isSunday: boolean
  isHoliday: boolean
  isSelected: boolean
  specialBadges: CalendarSpecialBadge[]
  appointments: VisibleAppointment[]
  timeline: CalendarDayTimelineEntry[]
}

type CalendarGridDayMeta = Omit<
  CalendarDayCell,
  'isSelected' | 'isHoliday' | 'specialBadges' | 'appointments' | 'timeline'
>

type CalendarInsertionGap = {
  id: string
  start: Date
  end: Date
  minutes: number
  isLunchWindow: boolean
}

type CalendarDayTimelineEntry =
  | {
    key: string
    kind: 'appointment'
    appointment: VisibleAppointment
  }
  | {
    key: string
    kind: 'gap'
    gap: CalendarInsertionGap
  }

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const OVERFLOW_EMOJI = '\u2795'
const CALENDAR_RECURRENCE_FALLBACK_FREQUENCY: CalendarRecurrenceFrequency = 'yearly'
const CALENDAR_RECURRENCE_FALLBACK_CATEGORY: CalendarRecurrenceCategory = 'general'
const CALENDAR_BOOT_LOADING_KEY = 'loading:calendar-initial'
const SWIPE_MIN_HORIZONTAL_PX = 56
const SWIPE_MAX_VERTICAL_PX = 70
const SWIPE_AXIS_RATIO = 1.35
const SWIPE_MAX_DURATION_MS = 700
const SWIPE_COOLDOWN_MS = 220

const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const selectedDate = ref(startOfDay(new Date()))
const visibleMonth = ref(normalizeMonth(selectedDate.value))
const selectedOperatorId = ref<'all' | string>('all')
const showOnlyMyPersonal = ref(false)
const isFilterModalOpen = ref(false)
const draftOperatorId = ref<'all' | string>('all')
const draftShowOnlyMyPersonal = ref(false)
const calendarGridRef = ref<HTMLElement | null>(null)
const autoScrolledMonthKey = ref('')
const hasInitialCalendarSnapshot = ref(false)
const isTouchLayout = ref(false)
const swipeTracking = ref(false)
const swipeStartX = ref(0)
const swipeStartY = ref(0)
const swipeStartedAt = ref(0)
const lastSwipeAt = ref(0)
const CALENDAR_WATCH_REASON = 'calendar-month-view'
const currentViewerId = computed(() => String(Auth.uid ?? '').trim())
const { activateCalendarMonthWatch } = useAppointmentWatchManager()
let detachTouchLayoutMediaListener: (() => void) | undefined

if (typeof window !== 'undefined') {
  const touchLayoutMedia = window.matchMedia('(pointer: coarse), (hover: none)')
  const syncTouchLayout = () => {
    isTouchLayout.value = touchLayoutMedia.matches
  }

  syncTouchLayout()

  if (typeof touchLayoutMedia.addEventListener === 'function') {
    const onTouchLayoutChange = () => syncTouchLayout()
    touchLayoutMedia.addEventListener('change', onTouchLayoutChange)
    detachTouchLayoutMediaListener = () => {
      touchLayoutMedia.removeEventListener('change', onTouchLayoutChange)
    }
  } else {
    const legacy = touchLayoutMedia as MediaQueryList & {
      addListener?: (handler: () => void) => void
      removeListener?: (handler: () => void) => void
    }
    const onTouchLayoutChange = () => syncTouchLayout()
    legacy.addListener?.(onTouchLayoutChange)
    detachTouchLayoutMediaListener = () => {
      legacy.removeListener?.(onTouchLayoutChange)
    }
  }
}
const calendarPrefetchMonths = computed(() => {
  const raw = Number(appConfigStore.getConfigData().calendarPrefetchMonths)
  if (!Number.isFinite(raw)) return 1
  return Math.max(0, Math.min(6, Math.trunc(raw)))
})

watch(
  [visibleMonth, calendarPrefetchMonths],
  (month) => {
    activateCalendarMonthWatch(month[0], {
      reason: CALENDAR_WATCH_REASON,
      prefetchMonths: month[1],
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  loading.off(CALENDAR_BOOT_LOADING_KEY)
  detachTouchLayoutMediaListener?.()
})

const operators = computed(() => {
  return publicUserStore.itemsActiveArray
    .map((user) => ({
      id: user.id,
      label: `${user.name} ${user.surname}`.trim() || user.email || user.id,
      color: normalizeUserColor(user.color),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'it'))
})

const operatorColorById = computed(() => {
  return new Map(
    operators.value.map((operator) => [operator.id, operator.color]),
  )
})

const operatorsForFilter = computed(() => {
  return operators.value
    .map(({ id, label }) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'it'))
})

const clientsById = computed(() => {
  return new Map(
    clientStore.itemsActiveArray.map((client) => [
      client.id,
      {
        firstName: String(client.name ?? '').trim(),
        surname: String(client.surname ?? '').trim(),
      },
    ]),
  )
})

const clientsForCalendarSpecialDays = computed<ClientBirthdaySource[]>(() => {
  return clientStore.itemsActiveArray.map((client) => ({
    id: client.id,
    name: client.name,
    surname: client.surname,
    birthdate: client.birthdate,
  }))
})

const recurrenceRulesForCalendarSpecialDays = computed(() => {
  return calendarRecurrenceStore.itemsActiveArray
    .filter((rule) => rule.active !== false)
    .map((rule) => {
      const recurrence =
        RECURRENCE_LABELS[rule.recurrence] ? rule.recurrence : CALENDAR_RECURRENCE_FALLBACK_FREQUENCY
      const category =
        rule.category === 'italian-holiday' || rule.category === 'local-holiday' || rule.category === 'general'
          ? rule.category
          : CALENDAR_RECURRENCE_FALLBACK_CATEGORY

      return {
        id: rule.id,
        title: String(rule.title ?? '').trim(),
        emoji: String(rule.emoji ?? '').trim(),
        startsOn: String(rule.startsOn ?? '').trim(),
        recurrence,
        category,
        active: rule.active,
      }
    })
})

const treatmentsById = computed(() => {
  return new Map<string, TreatmentLite>(
    treatmentStore.itemsActiveArray.map((treatment) => [
      treatment.id,
      {
        title: String(treatment.title ?? '').trim(),
        duration: Number(treatment.duration ?? 0),
        price: Number(treatment.price ?? 0),
        categoryIds: Array.isArray(treatment.categoryIds)
          ? treatment.categoryIds.map((id) => String(id ?? '').trim()).filter(Boolean)
          : [],
      },
    ]),
  )
})

const categoryEmojiById = computed(() => {
  return new Map(
    treatmentCategoryStore.itemsActiveArray.map((category) => [
      category.id,
      String(category.emoji ?? '').trim(),
    ]),
  )
})

const defaultDurationMinutes = computed(() => {
  const value = Number(appConfigStore.getConfigData().defaultAppointmentDurationMinutes)
  return Number.isFinite(value) && value > 0 ? value : 60
})

const monthLabel = computed(() =>
  visibleMonth.value.toLocaleDateString('it-IT', {
    month: 'long',
  }),
)

const headerMonthLabel = computed(() =>
  visibleMonth.value.toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  }),
)

const activeFilters = computed(() => {
  const parts: string[] = []
  if (selectedOperatorId.value !== 'all') {
    const label =
      operatorsForFilter.value.find((operator) => operator.id === selectedOperatorId.value)?.label ??
      selectedOperatorId.value
    parts.push(`Operatore: ${label}`)
  }
  if (showOnlyMyPersonal.value) {
    parts.push('Solo miei appuntamenti personali')
  }
  return parts
})

const hasActiveFilters = computed(() => activeFilters.value.length > 0)
const currentMonthKey = computed(() => monthKey(new Date()))
const isVisibleMonthCurrent = computed(() => monthKey(visibleMonth.value) === currentMonthKey.value)
const shouldShowCalendarBootLoading = computed(() => {
  if (hasInitialCalendarSnapshot.value) return false
  if (!isVisibleMonthCurrent.value) return false
  if (!Auth.isLoggedIn) return false
  return !appointmentStore.live || appointmentStore.isFirstRun
})

const calendarGridWindow = computed(() => {
  const start = calendarGridStart(visibleMonth.value)
  const end = new Date(start)
  end.setDate(start.getDate() + 41)
  end.setHours(23, 59, 59, 999)
  return {
    start,
    startTs: start.getTime(),
    endTs: end.getTime(),
  }
})

const calendarGridMeta = computed<CalendarGridDayMeta[]>(() => {
  const selectedMonth = visibleMonth.value.getMonth()
  const todayKey = keyForDay(new Date())
  const startDate = calendarGridWindow.value.start
  const list: CalendarGridDayMeta[] = []

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    const dayKey = keyForDay(date)
    list.push({
      key: dayKey,
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === selectedMonth,
      isToday: dayKey === todayKey,
      isSunday: date.getDay() === 0,
    })
  }

  return list
})

const visibleAppointments = computed<VisibleAppointment[]>(() => {
  const items: VisibleAppointment[] = []
  const currentUserId = currentViewerId.value
  const selectedOperator = selectedOperatorId.value
  const onlyPersonal = showOnlyMyPersonal.value
  const rangeStart = calendarGridWindow.value.startTs
  const rangeEnd = calendarGridWindow.value.endTs
  const clientsMap = clientsById.value
  const treatmentsMap = treatmentsById.value
  const categoryEmojiMap = categoryEmojiById.value
  const fallbackDuration = defaultDurationMinutes.value
  const colorsByOperatorId = operatorColorById.value

  for (const appointment of appointmentStore.itemsActiveArray) {
    const start = asDate(appointment.date_time)
    if (!start) continue

    const startTs = start.getTime()
    if (startTs < rangeStart || startTs > rangeEnd) continue
    if (!canReadAppointmentForUser(appointment, currentUserId)) continue

    const personalOwnerId = appointmentPersonalOwnerId(appointment)
    const isPersonal = isPersonalAppointment(appointment)
    if (!operatorMatch(appointment, selectedOperator)) continue

    if (onlyPersonal && (!isPersonal || personalOwnerId !== currentUserId)) continue

    const clientId = String(appointment.client_id ?? appointment.user_id ?? '').trim()
    const client = clientId ? clientsMap.get(clientId) : undefined
    const clientFirstName = String(client?.firstName ?? '').trim() || 'Cliente'
    const clientSurname = String(client?.surname ?? '').trim()

    const linkedTreatments = (appointment.treatment_ids ?? [])
      .map((id) => treatmentsMap.get(id))
      .filter((item): item is TreatmentLite => Boolean(item))

    const treatmentNames = linkedTreatments
      .map((item) => item.title)
      .filter(Boolean)

    const totalPriceValue = Number(appointment.total)
    const totalPrice = Number.isFinite(totalPriceValue) ? Math.max(0, totalPriceValue) : 0

    const durationMinutes = computeAppointmentDurationMinutes(
      {
        fix_duration: appointment.fix_duration,
        treatment_ids: appointment.treatment_ids ?? [],
      },
      treatmentsMap,
      fallbackDuration,
    )
    const operatorIds = appointmentAssignedOperatorIds(appointment)

    items.push({
      id: appointment.id,
      start,
      end: new Date(start.getTime() + durationMinutes * 60000),
      dayKey: keyForDay(start),
      notes: String(appointment.notes ?? '').trim(),
      clientFirstName,
      clientSurname,
      treatmentNames,
      durationMinutes,
      totalPrice,
      emojis: buildAppointmentEmojis(linkedTreatments, categoryEmojiMap),
      isPersonal,
      operatorColor: colorsByOperatorId.get(primaryOperatorId(appointment)) ?? DEFAULT_USER_COLOR,
      operatorIds,
      hasOperatorOverlap: false,
    })
  }

  const sortedAppointments = items.sort((a, b) => a.start.getTime() - b.start.getTime())
  const overlappingAppointmentIds = findOverlappingAppointmentsByOperator(sortedAppointments)

  return sortedAppointments.map((appointment) => ({
    ...appointment,
    hasOperatorOverlap: overlappingAppointmentIds.has(appointment.id),
  }))
})

const specialBadgesByDayKey = computed(() => {
  const badgesMap = new Map<string, CalendarSpecialBadge[]>()
  const clients = clientsForCalendarSpecialDays.value

  for (const day of calendarGridMeta.value) {
    const badges = getCalendarSpecialBadges(day.date, clients, recurrenceRulesForCalendarSpecialDays.value)
    if (badges.length) {
      badgesMap.set(day.key, badges)
    }
  }

  return badgesMap
})

const calendarDays = computed<CalendarDayCell[]>(() => {
  const appointmentsMap = new Map<string, VisibleAppointment[]>()
  for (const appointment of visibleAppointments.value) {
    const current = appointmentsMap.get(appointment.dayKey) ?? []
    current.push(appointment)
    appointmentsMap.set(appointment.dayKey, current)
  }

  const selectedKey = keyForDay(selectedDate.value)
  return calendarGridMeta.value.map((day) => {
    const specialBadges = specialBadgesByDayKey.value.get(day.key) ?? []
    const appointments = appointmentsMap.get(day.key) ?? []
    return {
      ...day,
      isHoliday: specialBadges.some((badge) => badge.kind === 'holiday'),
      isSelected: day.key === selectedKey,
      specialBadges,
      appointments,
      timeline: buildDayTimeline(appointments),
    }
  })
})

watch(
  [visibleMonth, calendarDays],
  () => {
    void scrollToTodayIfNeeded()
  },
  { immediate: true },
)

watch(
  () => appointmentStore.live && !appointmentStore.isFirstRun,
  (isReady) => {
    if (isReady) {
      hasInitialCalendarSnapshot.value = true
    }
  },
  { immediate: true },
)

watch(
  shouldShowCalendarBootLoading,
  (isLoading, wasLoading) => {
    if (isLoading) {
      loading.on(CALENDAR_BOOT_LOADING_KEY)
      return
    }

    loading.off(CALENDAR_BOOT_LOADING_KEY)
    if (wasLoading && isVisibleMonthCurrent.value) {
      autoScrolledMonthKey.value = ''
      void scrollToTodayIfNeeded(true)
    }
  },
  { immediate: true },
)

function keyForDay(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function normalizeMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

async function scrollToTodayIfNeeded(force = false) {
  const visibleKey = monthKey(visibleMonth.value)
  const today = new Date()
  const todayMonthKey = monthKey(today)

  if (visibleKey !== todayMonthKey) {
    autoScrolledMonthKey.value = ''
    return
  }
  if (!force && autoScrolledMonthKey.value === visibleKey) return

  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
  const todayCell = calendarGridRef.value?.querySelector<HTMLElement>('.calendar-day--today')
  if (!todayCell) return

  todayCell.scrollIntoView({ block: 'center', inline: 'nearest' })
  autoScrolledMonthKey.value = visibleKey
}

function calendarGridStart(month: Date) {
  const start = normalizeMonth(month)
  const mondayOffset = (start.getDay() + 6) % 7
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() - mondayOffset, 0, 0, 0, 0)
}

function treatmentPrimaryEmoji(treatment: TreatmentLite, emojiByCategory: Map<string, string>) {
  for (const categoryId of treatment.categoryIds) {
    const emoji = String(emojiByCategory.get(categoryId) ?? '').trim()
    if (emoji) return emoji
  }
  return ''
}

function buildAppointmentEmojis(linkedTreatments: TreatmentLite[], emojiByCategory: Map<string, string>) {
  if (!linkedTreatments.length) return []

  const treatmentEmojis = linkedTreatments
    .map((treatment) => treatmentPrimaryEmoji(treatment, emojiByCategory))
    .filter(Boolean)

  const firstEmoji = treatmentEmojis[0]
  if (!firstEmoji) return []

  if (linkedTreatments.length === 1) {
    return [firstEmoji]
  }

  if (linkedTreatments.length === 2) {
    return [firstEmoji, treatmentEmojis[1] || firstEmoji]
  }

  return [firstEmoji, OVERFLOW_EMOJI]
}

function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime()
}

function findOverlappingAppointmentsByOperator(appointments: VisibleAppointment[]) {
  const overlappingAppointmentIds = new Set<string>()
  const appointmentsByOperator = new Map<string, VisibleAppointment[]>()

  for (const appointment of appointments) {
    for (const operatorId of appointment.operatorIds) {
      const list = appointmentsByOperator.get(operatorId) ?? []
      list.push(appointment)
      appointmentsByOperator.set(operatorId, list)
    }
  }

  for (const operatorAppointments of appointmentsByOperator.values()) {
    if (operatorAppointments.length < 2) continue

    const sortedByStart = [...operatorAppointments].sort((a, b) => {
      const startDiff = a.start.getTime() - b.start.getTime()
      if (startDiff !== 0) return startDiff
      return a.end.getTime() - b.end.getTime()
    })
    const activeAppointments: VisibleAppointment[] = []

    for (const currentAppointment of sortedByStart) {
      const currentStartTs = currentAppointment.start.getTime()

      for (let index = activeAppointments.length - 1; index >= 0; index -= 1) {
        const activeAppointment = activeAppointments[index]
        if (!activeAppointment) continue
        if (activeAppointment.end.getTime() <= currentStartTs) {
          activeAppointments.splice(index, 1)
        }
      }

      for (const activeAppointment of activeAppointments) {
        if (
          !rangesOverlap(
            activeAppointment.start,
            activeAppointment.end,
            currentAppointment.start,
            currentAppointment.end,
          )
        ) {
          continue
        }

        overlappingAppointmentIds.add(activeAppointment.id)
        overlappingAppointmentIds.add(currentAppointment.id)
      }

      activeAppointments.push(currentAppointment)
    }
  }

  return overlappingAppointmentIds
}

function startsInLunchWindow(start: Date) {
  const lunchStart = new Date(start)
  lunchStart.setHours(12, 30, 0, 0)
  const lunchEnd = new Date(start)
  lunchEnd.setHours(15, 0, 0, 0)
  return start >= lunchStart && start < lunchEnd
}

function createGapBetween(start: Date, end: Date) {
  const diffMs = end.getTime() - start.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 5) return undefined

  return {
    id: `${start.toISOString()}-${end.toISOString()}`,
    start,
    end,
    minutes,
    isLunchWindow: startsInLunchWindow(start),
  }
}

function buildDayTimeline(appointments: VisibleAppointment[]) {
  let hasLunchGapAtLeastThirty = false
  const timeline: CalendarDayTimelineEntry[] = []

  appointments.forEach((appointment, index) => {
    timeline.push({
      key: `appointment-${appointment.id}`,
      kind: 'appointment',
      appointment,
    })

    const next = appointments[index + 1]
    if (!next) return

    const gap = createGapBetween(appointment.end, next.start)
    if (!gap) return
    const isLunchWindow = gap.isLunchWindow && !hasLunchGapAtLeastThirty
    if (isLunchWindow && gap.minutes >= 30) {
      hasLunchGapAtLeastThirty = true
    }

    timeline.push({
      key: `gap-${gap.id}`,
      kind: 'gap',
      gap: {
        ...gap,
        isLunchWindow,
      },
    })
  })

  return timeline
}

function primaryOperatorId(appointment: StoreAppointment) {
  return appointmentPersonalOwnerId(appointment) || appointmentOperatorIds(appointment)[0] || ''
}

function appointmentAssignedOperatorIds(appointment: StoreAppointment) {
  const ownerId = appointmentPersonalOwnerId(appointment)
  const ids = new Set<string>()
  if (ownerId) ids.add(ownerId)
  for (const operatorId of appointmentOperatorIds(appointment)) {
    ids.add(operatorId)
  }
  return Array.from(ids)
}

function operatorMatch(appointment: StoreAppointment, selectedOperator: 'all' | string) {
  const selected = selectedOperator
  if (selected === 'all') return true

  const normalized = String(selected).trim()
  if (!normalized) return true

  const linked = appointmentOperatorIds(appointment)
  const primary = primaryOperatorId(appointment)
  if (isPersonalAppointment(appointment)) {
    if (primary) return primary === normalized
    return linked.includes(normalized)
  }

  return linked.includes(normalized)
}

function moveMonth(offset: number) {
  visibleMonth.value = normalizeMonth(addMonths(visibleMonth.value, offset))
}

function goToPreviousMonth() {
  moveMonth(-1)
}

function goToNextMonth() {
  moveMonth(1)
}

function openDay(date: Date) {
  const normalized = startOfDay(date)
  selectedDate.value = normalized
  router.push({
    name: 'CalendarDayView',
    query: {
      date: keyForDay(normalized),
      operatorId: selectedOperatorId.value === 'all' ? undefined : selectedOperatorId.value,
    },
  })
}

function onDayKeydown(event: KeyboardEvent, date: Date) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  openDay(date)
}

function openAppointment(id: string) {
  router.push({ name: 'AppointmentEditView', params: { id } })
}

function openNewAppointment() {
  router.push({
    name: 'AppointmentEditView',
    params: { id: 'new' },
    query: {
      date: keyForDay(selectedDate.value),
      operatorId: selectedOperatorId.value === 'all' ? undefined : selectedOperatorId.value,
    },
  })
}

function openNewAppointmentFromSlot(slotStart: Date) {
  router.push({
    name: 'AppointmentEditView',
    params: { id: 'new' },
    query: {
      dateTime: slotStart.toISOString(),
      operatorId: selectedOperatorId.value === 'all' ? undefined : selectedOperatorId.value,
    },
  })
}

function formatHour(date: Date) {
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function formatGapLabel(minutes: number) {
  if (minutes === 60) return '1 ora libera'
  if (minutes > 60 && minutes % 60 === 0) return `${minutes / 60} ore libere`
  return `${minutes} minuti liberi`
}

function openFiltersModal() {
  draftOperatorId.value = selectedOperatorId.value
  draftShowOnlyMyPersonal.value = showOnlyMyPersonal.value
  isFilterModalOpen.value = true
}

function closeFiltersModal() {
  isFilterModalOpen.value = false
}

function resetDraftFilters() {
  draftOperatorId.value = 'all'
  draftShowOnlyMyPersonal.value = false
}

function applyFilters() {
  selectedOperatorId.value = draftOperatorId.value
  showOnlyMyPersonal.value = draftShowOnlyMyPersonal.value
  closeFiltersModal()
}

function resetSwipeTracking() {
  swipeTracking.value = false
  swipeStartedAt.value = 0
}

function onCalendarTouchStart(event: TouchEvent) {
  if (!isTouchLayout.value) return
  if (event.touches.length !== 1) {
    resetSwipeTracking()
    return
  }

  const firstTouch = event.touches[0]
  if (!firstTouch) return

  swipeStartX.value = firstTouch.clientX
  swipeStartY.value = firstTouch.clientY
  swipeStartedAt.value = Date.now()
  swipeTracking.value = true
}

function onCalendarTouchMove(event: TouchEvent) {
  if (!swipeTracking.value) return
  if (event.touches.length !== 1) {
    resetSwipeTracking()
  }
}

function onCalendarTouchEnd(event: TouchEvent) {
  if (!swipeTracking.value) return
  const firstChangedTouch = event.changedTouches[0]
  const startX = swipeStartX.value
  const startY = swipeStartY.value
  const elapsed = Date.now() - swipeStartedAt.value
  resetSwipeTracking()

  if (!isTouchLayout.value) return
  if (!firstChangedTouch) return
  if (elapsed > SWIPE_MAX_DURATION_MS) return

  const deltaX = firstChangedTouch.clientX - startX
  const deltaY = firstChangedTouch.clientY - startY
  const absDeltaX = Math.abs(deltaX)
  const absDeltaY = Math.abs(deltaY)

  // Soglie conservative per evitare cambi mese involontari durante scroll verticale.
  if (absDeltaX < SWIPE_MIN_HORIZONTAL_PX) return
  if (absDeltaY > SWIPE_MAX_VERTICAL_PX) return
  if (absDeltaX < absDeltaY * SWIPE_AXIS_RATIO) return

  const nowTs = Date.now()
  if (nowTs - lastSwipeAt.value < SWIPE_COOLDOWN_MS) return
  lastSwipeAt.value = nowTs

  if (deltaX < 0) {
    goToNextMonth()
    return
  }

  goToPreviousMonth()
}

function onCalendarTouchCancel() {
  resetSwipeTracking()
}
</script>

<template>
  <div class="container-fluid px-0 pb-t calendar-page" :style="bgStyle">
    <CalendarHeaderExtra
      :has-active-filters="hasActiveFilters"
      :mobile-title="headerMonthLabel"
      @create-appointment="openNewAppointment"
      @open-filters="openFiltersModal"
    />

    <div class="pb-4">
      <section v-if="!isTouchLayout" class="card border-0 shadow-sm p-2 mb-2">
        <div class="month-switcher">
          <button type="button" class="month-arrow-btn" aria-label="Mese precedente" @click="goToPreviousMonth">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <strong class="month-label">{{ monthLabel }}</strong>
          <button type="button" class="month-arrow-btn" aria-label="Mese successivo" @click="goToNextMonth">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <div v-if="activeFilters.length" class="active-filters">
          <span v-for="filterLabel in activeFilters" :key="filterLabel" class="badge rounded-pill text-bg-light border">
            {{ filterLabel }}
          </span>
        </div>
      </section>

      <section
        class="card border-0 shadow-sm p-0 calendar-shell"
        @touchstart.passive="onCalendarTouchStart"
        @touchmove.passive="onCalendarTouchMove"
        @touchend.passive="onCalendarTouchEnd"
        @touchcancel.passive="onCalendarTouchCancel"
      >
        <div ref="calendarGridRef" class="calendar-grid">
          <div
            v-for="(label, index) in WEEKDAY_LABELS"
            :key="label"
            class="calendar-weekday"
            :class="{ 'calendar-weekday--sunday': index === 6 }"
          >
            {{ label }}
          </div>

          <article
            v-for="day in calendarDays"
            :key="day.key"
            class="calendar-day"
            :class="{
              'calendar-day--outside': !day.isCurrentMonth,
              'calendar-day--today': day.isToday,
              'calendar-day--sunday': day.isSunday,
              'calendar-day--holiday': day.isHoliday,
              'calendar-day--selected': day.isSelected,
            }"
            role="button"
            tabindex="0"
            @click.self="openDay(day.date)"
            @keydown="onDayKeydown($event, day.date)"
          >
            <header class="calendar-day__header" @click.stop="openDay(day.date)">
              <span
                class="calendar-day__number"
                :class="{
                  'calendar-day__number--today': day.isToday,
                  'calendar-day__number--alert': day.isSunday || day.isHoliday,
                }"
              >
                {{ day.dayNumber }}
              </span>
              <span v-if="day.appointments.length" class="calendar-day__count">
                {{ day.appointments.length }} app.
              </span>
            </header>

            <div v-if="day.specialBadges.length" class="calendar-day__specials">
              <div
                v-for="badge in day.specialBadges"
                :key="badge.id"
                class="calendar-day-special"
                :class="`calendar-day-special--${badge.kind}`"
                :title="badge.label"
              >
                {{ badge.label }}
              </div>
            </div>

            <div class="calendar-day__appointments">
              <template v-for="entry in day.timeline" :key="entry.key">
                <CalendarAppointmentCard
                  v-if="entry.kind === 'appointment'"
                  :appointment="entry.appointment"
                  @open="openAppointment"
                />
                <button
                  v-else
                  type="button"
                  class="calendar-gap-card"
                  :class="{ 'calendar-gap-card--lunch': entry.gap.isLunchWindow }"
                  @click.stop="openNewAppointmentFromSlot(entry.gap.start)"
                >
                  <span class="calendar-gap-card__head">
                    <strong class="calendar-gap-card__cta">+ Nuovo</strong>
                    <span class="calendar-gap-card__time">{{ formatHour(entry.gap.start) }} - {{ formatHour(entry.gap.end) }}</span>
                  </span>
                  <small class="calendar-gap-card__label calendar-gap-card__label--desktop">{{ formatGapLabel(entry.gap.minutes) }}</small>
                  <small class="calendar-gap-card__label calendar-gap-card__label--mobile">{{ entry.gap.minutes }}m</small>
                </button>
              </template>
            </div>

            <div class="calendar-day__open-space" @click.stop="openDay(day.date)"></div>
          </article>
        </div>
      </section>
    </div>

    <div
      v-if="isFilterModalOpen"
      class="calendar-filter-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendarFiltersModalTitle"
    >
      <div class="calendar-filter-modal__backdrop" @click="closeFiltersModal"></div>
      <div class="calendar-filter-modal__content card border-0 shadow-lg">
        <div class="card-body p-3">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 id="calendarFiltersModalTitle" class="h6 mb-0">Filtra calendario</h2>
            <button type="button" class="btn-close" aria-label="Chiudi modal filtri" @click="closeFiltersModal"></button>
          </div>

          <div class="mb-2">
            <label for="calendarFilterOperator" class="form-label small mb-1">Operatore</label>
            <select id="calendarFilterOperator" v-model="draftOperatorId" class="form-select">
              <option value="all">Tutti</option>
              <option v-for="operator in operatorsForFilter" :key="operator.id" :value="operator.id">
                {{ operator.label }}
              </option>
            </select>
          </div>

          <div class="form-check mb-3">
            <input id="calendarFilterPersonalOnly" v-model="draftShowOnlyMyPersonal" type="checkbox" class="form-check-input" />
            <label class="form-check-label" for="calendarFilterPersonalOnly">Solo miei appuntamenti personali</label>
          </div>

          <div class="d-flex justify-content-end gap-2">
            <Btn type="button" color="dark" variant="outline" @click="resetDraftFilters">Reset</Btn>
            <Btn type="button" color="dark" variant="outline" @click="closeFiltersModal">Annulla</Btn>
            <Btn type="button" color="dark" @click="applyFilters">Applica filtri</Btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.month-switcher {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}

.month-label {
  min-width: 7rem;
  text-align: center;
  text-transform: capitalize;
  font-size: 1rem;
}

.month-arrow-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(84, 44, 58, 0.2);
  background: rgba(255, 255, 255, 0.9);
  color: #4b2935;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.active-filters {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem;
}

.calendar-page {
  height: 100svh;
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

.calendar-shell {
  overflow: hidden;
  touch-action: pan-y;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0;
}

.calendar-weekday {
  text-align: center;
  font-size: 0.58rem;
  font-weight: 600;
  color: rgba(84, 44, 58, 0.68);
  padding: 0.2rem 0.08rem 0.12rem;
}

.calendar-weekday--sunday {
  color: rgba(166, 27, 41, 0.9);
}

.calendar-day {
  min-height: 72px;
  border: 1px solid rgba(84, 44, 58, 0.18);
  border-radius: 0;
  padding: 0.15rem 0.16rem;
  background: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.calendar-day:hover {
  border-color: rgba(84, 44, 58, 0.38);
}

.calendar-day:focus-visible {
  outline: 2px solid rgba(84, 44, 58, 0.45);
  outline-offset: 2px;
}

.calendar-day--outside {
  background: rgba(249, 245, 246, 0.9);
  color: rgba(84, 44, 58, 0.5);
}

.calendar-day--today {
  border-color: rgba(84, 44, 58, 0.72);
  box-shadow: inset 0 0 0 1px rgba(84, 44, 58, 0.26);
}

.calendar-day--sunday {
  border-color: rgba(166, 27, 41, 0.3);
}

.calendar-day--holiday {
  border-color: rgba(166, 27, 41, 0.45);
  background: linear-gradient(180deg, rgba(255, 244, 246, 0.84) 0%, #fff 36%);
}

.calendar-day--selected {
  box-shadow: inset 0 0 0 1px rgba(84, 44, 58, 0.32);
}

.calendar-day__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.2rem;
  cursor: pointer;
}

.calendar-day__number {
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
  min-width: 1.35rem;
  min-height: 1.35rem;
  padding: 0.2rem 0.3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
}

.calendar-day__number--today {
  background: rgba(84, 44, 58, 0.14);
  color: #4b2935;
}

.calendar-day__number--alert {
  color: rgba(166, 27, 41, 0.95);
}

.calendar-day__number--today.calendar-day__number--alert {
  background: rgba(220, 53, 69, 0.18);
  color: rgba(131, 24, 35, 0.98);
}

.calendar-day__count {
  font-size: 0.5rem;
  line-height: 1.1;
  font-weight: 500;
  color: rgba(84, 44, 58, 0.54);
  white-space: nowrap;
}

.calendar-day--sunday .calendar-day__count,
.calendar-day--holiday .calendar-day__count {
  color: rgba(166, 27, 41, 0.82);
}

.calendar-day__specials {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.calendar-day-special {
  border-radius: 4px;
  border: 1px solid transparent;
  padding: 0.12rem 0.2rem;
  font-size: 0.5rem;
  line-height: 1.15;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.calendar-day-special--holiday {
  border-color: rgba(166, 27, 41, 0.35);
  background: rgba(220, 53, 69, 0.16);
  color: rgba(131, 24, 35, 0.98);
}

.calendar-day-special--recurrence {
  border-color: rgba(197, 107, 0, 0.32);
  background: rgba(245, 158, 11, 0.18);
  color: rgba(126, 69, 0, 0.96);
}

.calendar-day-special--birthday {
  border-color: rgba(3, 105, 161, 0.3);
  background: rgba(14, 165, 233, 0.16);
  color: rgba(8, 92, 140, 0.98);
}

.calendar-day__appointments {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.calendar-gap-card {
  width: 100%;
  border: 1px dashed rgba(25, 135, 84, 0.45);
  background: rgba(25, 135, 84, 0.1);
  color: #0f5132;
  border-radius: 4px;
  padding: 0.16rem 0.22rem;
  text-align: left;
  font-size: 0.54rem;
  line-height: 1.2;
}

.calendar-gap-card--lunch {
  border-color: rgba(184, 126, 0, 0.48);
  background: rgba(255, 218, 124, 0.3);
  color: #7b5200;
}

.calendar-gap-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.18rem;
  min-width: 0;
}

.calendar-gap-card__cta {
  white-space: nowrap;
}

.calendar-gap-card__label {
  display: block;
  opacity: 0.9;
}

.calendar-gap-card__label--mobile {
  display: none;
}

@media (max-width: 767.98px) {
  .calendar-gap-card__cta {
    display: none;
  }

  .calendar-gap-card__time {
    font-size: 6.4px;
  }

  .calendar-gap-card__label--desktop {
    display: none;
  }

  .calendar-gap-card__label--mobile {
    display: block;
  }
}

.calendar-day__open-space {
  flex: 1 1 auto;
  min-height: 0.28rem;
}

.calendar-filter-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.calendar-filter-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(19, 11, 15, 0.45);
}

.calendar-filter-modal__content {
  position: relative;
  width: min(100%, 420px);
}

@media (min-width: 768px) {
  .month-label {
    min-width: 9rem;
    font-size: 1.1rem;
  }

  .calendar-grid {
    gap: 0;
  }

  .calendar-weekday {
    font-size: 0.65rem;
    padding-top: 0.25rem;
  }

  .calendar-day {
    min-height: 98px;
    padding: 0.2rem;
  }

  .calendar-day__number {
    font-size: 0.72rem;
  }

  .calendar-day-special {
    padding: 0.16rem 0.24rem;
    font-size: 0.56rem;
  }

  .calendar-gap-card {
    padding: 0.2rem 0.27rem;
    font-size: 0.6rem;
  }
}

@media (min-width: 992px) {
  .calendar-day {
    min-height: 120px;
    padding: 0.25rem;
  }

  .calendar-day-special {
    font-size: 0.62rem;
  }

  .calendar-gap-card {
    padding: 0.24rem 0.3rem;
    font-size: 0.66rem;
  }
}
</style>
