<script setup lang="ts">
import { Btn, cicKitStore } from 'cic-kit'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppointmentWatchManager } from '../../composables/useAppointmentWatchManager'
import { Auth } from '../../main'
import { appConfigStore } from '../../stores/appConfigStore'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { publicUserStore } from '../../stores/publicUser'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { treatmentStore } from '../../stores/treatmentStore'
import { addMonths, computeAppointmentDurationMinutes, startOfDay } from '../../utils/calendar'
import {
  getCalendarSpecialBadges,
  type CalendarSpecialBadge,
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
  dayKey: string
  clientFirstName: string
  clientSurname: string
  treatmentNames: string[]
  durationMinutes: number
  totalPrice: number
  emojis: string[]
  isPersonal: boolean
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
}

type CalendarGridDayMeta = Omit<
  CalendarDayCell,
  'isSelected' | 'isHoliday' | 'specialBadges' | 'appointments'
>

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const OVERFLOW_EMOJI = '\u2795'

const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const selectedDate = ref(startOfDay(new Date()))
const visibleMonth = ref(normalizeMonth(selectedDate.value))
const selectedOperatorId = ref<'all' | string>('all')
const showOnlyMyPersonal = ref(false)
const isFilterModalOpen = ref(false)
const draftOperatorId = ref<'all' | string>('all')
const draftShowOnlyMyPersonal = ref(false)
const CALENDAR_WATCH_REASON = 'calendar-month-view'
const currentViewerId = computed(() => String(Auth.uid ?? '').trim())
const { activateCalendarMonthWatch, releaseAppointmentWatch } = useAppointmentWatchManager()

watch(
  visibleMonth,
  (month) => {
    activateCalendarMonthWatch(month, CALENDAR_WATCH_REASON)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  releaseAppointmentWatch(CALENDAR_WATCH_REASON)
})

const operators = computed(() => {
  return publicUserStore.itemsActiveArray
    .map((user) => ({
      id: user.id,
      label: `${user.name} ${user.surname}`.trim() || user.email || user.id,
    }))
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

const activeFilters = computed(() => {
  const parts: string[] = []
  if (selectedOperatorId.value !== 'all') {
    const label =
      operators.value.find((operator) => operator.id === selectedOperatorId.value)?.label ??
      selectedOperatorId.value
    parts.push(`Operatore: ${label}`)
  }
  if (showOnlyMyPersonal.value) {
    parts.push('Solo appuntamenti personali')
  }
  return parts
})

const hasActiveFilters = computed(() => activeFilters.value.length > 0)

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

  for (const appointment of appointmentStore.itemsActiveArray) {
    const start = asDate(appointment.date_time)
    if (!start) continue

    const startTs = start.getTime()
    if (startTs < rangeStart || startTs > rangeEnd) continue
    if (!canReadAppointment(appointment, currentUserId)) continue
    if (!operatorMatch(appointment, selectedOperator)) continue

    const isPersonal = Boolean(appointment.isPersonal)
    if (onlyPersonal && !isPersonal) continue

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

    const totalPrice = linkedTreatments.reduce((total, treatment) => {
      return total + (Number.isFinite(treatment.price) ? treatment.price : 0)
    }, 0)

    const durationMinutes = computeAppointmentDurationMinutes(
      {
        fix_duration: appointment.fix_duration,
        treatment_ids: appointment.treatment_ids ?? [],
      },
      treatmentsMap,
      fallbackDuration,
    )

    items.push({
      id: appointment.id,
      start,
      dayKey: keyForDay(start),
      clientFirstName,
      clientSurname,
      treatmentNames,
      durationMinutes,
      totalPrice,
      emojis: buildAppointmentEmojis(linkedTreatments, categoryEmojiMap),
      isPersonal,
    })
  }

  return items.sort((a, b) => a.start.getTime() - b.start.getTime())
})

const specialBadgesByDayKey = computed(() => {
  const badgesMap = new Map<string, CalendarSpecialBadge[]>()
  const clients = clientsForCalendarSpecialDays.value

  for (const day of calendarGridMeta.value) {
    const badges = getCalendarSpecialBadges(day.date, clients)
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
    return {
      ...day,
      isHoliday: specialBadges.some((badge) => badge.kind === 'holiday'),
      isSelected: day.key === selectedKey,
      specialBadges,
      appointments: appointmentsMap.get(day.key) ?? [],
    }
  })
})

function keyForDay(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
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

function primaryOperatorId(appointment: StoreAppointment) {
  return String((appointment.operator_ids ?? [])[0] ?? '').trim()
}

function canReadAppointment(appointment: StoreAppointment, currentUserId: string) {
  const isPersonal = appointment.isPersonal ?? false
  if (!isPersonal) return true

  if (!currentUserId) return false

  const primary = primaryOperatorId(appointment)
  if (primary) return primary === currentUserId
  return (appointment.operator_ids ?? []).includes(currentUserId)
}

function operatorMatch(appointment: StoreAppointment, selectedOperator: 'all' | string) {
  const selected = selectedOperator
  if (selected === 'all') return true

  const normalized = String(selected).trim()
  if (!normalized) return true

  const linked = appointment.operator_ids ?? []
  const primary = primaryOperatorId(appointment)
  if (appointment.isPersonal) {
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
</script>

<template>
  <div class="container-fluid px-0 pb-t overflow-auto h-100" :style="bgStyle">
    <CalendarHeaderExtra
      :has-active-filters="hasActiveFilters"
      @create-appointment="openNewAppointment"
      @open-filters="openFiltersModal"
    />

    <div class="pb-4">
      <section class="card border-0 shadow-sm p-2 mb-2">
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

      <section class="card border-0 shadow-sm p-0 calendar-shell">
        <div class="calendar-grid">
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
              <CalendarAppointmentCard
                v-for="appointment in day.appointments"
                :key="appointment.id"
                :appointment="appointment"
                @open="openAppointment"
              />
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
              <option v-for="operator in operators" :key="operator.id" :value="operator.id">
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

.calendar-shell {
  overflow: hidden;
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
}

@media (min-width: 992px) {
  .calendar-day {
    min-height: 120px;
    padding: 0.25rem;
  }

  .calendar-day-special {
    font-size: 0.62rem;
  }
}
</style>

