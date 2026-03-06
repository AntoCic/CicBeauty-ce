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
  isSelected: boolean
  appointments: VisibleAppointment[]
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

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

const visibleAppointments = computed<VisibleAppointment[]>(() => {
  const items = appointmentStore.itemsActiveArray
    .map((appointment) => {
      const start = asDate(appointment.date_time)
      if (!start) return undefined
      if (!canReadAppointment(appointment)) return undefined
      if (!operatorMatch(appointment)) return undefined
      if (showOnlyMyPersonal.value && !appointment.isPersonal) return undefined

      const clientId = String(appointment.client_id ?? appointment.user_id ?? '').trim()
      const client = clientId ? clientsById.value.get(clientId) : undefined
      const clientFirstName = String(client?.firstName ?? '').trim() || 'Cliente'
      const clientSurname = String(client?.surname ?? '').trim()

      const linkedTreatments = (appointment.treatment_ids ?? [])
        .map((id) => treatmentsById.value.get(id))
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
        treatmentsById.value,
        defaultDurationMinutes.value,
      )

      const emojis = [
        ...new Set(
          linkedTreatments
            .flatMap((treatment) => treatment.categoryIds)
            .map((categoryId) => String(categoryEmojiById.value.get(categoryId) ?? '').trim())
            .filter(Boolean),
        ),
      ].slice(0, 3)

      return {
        id: appointment.id,
        start,
        dayKey: keyForDay(start),
        clientFirstName,
        clientSurname,
        treatmentNames,
        durationMinutes,
        totalPrice,
        emojis,
        isPersonal: Boolean(appointment.isPersonal),
      }
    })
    .filter((item): item is VisibleAppointment => Boolean(item))

  return items.sort((a, b) => a.start.getTime() - b.start.getTime())
})

const appointmentsByDay = computed(() => {
  const map = new Map<string, VisibleAppointment[]>()
  for (const appointment of visibleAppointments.value) {
    const current = map.get(appointment.dayKey) ?? []
    current.push(appointment)
    map.set(appointment.dayKey, current)
  }
  return map
})

const calendarDays = computed<CalendarDayCell[]>(() => {
  const start = calendarGridStart(visibleMonth.value)
  const selectedKey = keyForDay(selectedDate.value)
  const todayKey = keyForDay(new Date())
  const list: CalendarDayCell[] = []

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const dayKey = keyForDay(date)
    list.push({
      key: dayKey,
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === visibleMonth.value.getMonth(),
      isToday: dayKey === todayKey,
      isSelected: dayKey === selectedKey,
      appointments: appointmentsByDay.value.get(dayKey) ?? [],
    })
  }

  return list
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

function primaryOperatorId(appointment: StoreAppointment) {
  return String((appointment.operator_ids ?? [])[0] ?? '').trim()
}

function canReadAppointment(appointment: StoreAppointment) {
  const isPersonal = appointment.isPersonal ?? false
  if (!isPersonal) return true

  const me = String(Auth.uid ?? '').trim()
  if (!me) return false

  const primary = primaryOperatorId(appointment)
  if (primary) return primary === me
  return (appointment.operator_ids ?? []).includes(me)
}

function operatorMatch(appointment: StoreAppointment) {
  const selected = selectedOperatorId.value
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
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <CalendarHeaderExtra
      :has-active-filters="hasActiveFilters"
      @create-appointment="openNewAppointment"
      @open-filters="openFiltersModal"
    />

    <div class="px-2 pb-4">
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

      <section class="card border-0 shadow-sm p-1 calendar-shell">
        <div class="calendar-grid">
          <div v-for="label in WEEKDAY_LABELS" :key="label" class="calendar-weekday">
            {{ label }}
          </div>

          <article
            v-for="day in calendarDays"
            :key="day.key"
            class="calendar-day"
            :class="{
              'calendar-day--outside': !day.isCurrentMonth,
              'calendar-day--today': day.isToday,
              'calendar-day--selected': day.isSelected,
            }"
            role="button"
            tabindex="0"
            @click="openDay(day.date)"
            @keydown="onDayKeydown($event, day.date)"
          >
            <header class="calendar-day__header">
              <span class="calendar-day__number">{{ day.dayNumber }}</span>
              <span v-if="day.appointments.length" class="calendar-day__count">
                {{ day.appointments.length }}
              </span>
            </header>

            <div class="calendar-day__appointments">
              <CalendarAppointmentCard
                v-for="appointment in day.appointments"
                :key="appointment.id"
                :appointment="appointment"
                @open="openAppointment"
              />
            </div>
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
  gap: 0.2rem;
}

.calendar-weekday {
  text-align: center;
  font-size: 0.62rem;
  font-weight: 600;
  color: rgba(84, 44, 58, 0.76);
  padding-bottom: 0.05rem;
}

.calendar-day {
  min-height: 70px;
  border: 1px solid rgba(84, 44, 58, 0.18);
  border-radius: 7px;
  padding: 0.22rem;
  background: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
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
  border-color: rgba(84, 44, 58, 0.58);
}

.calendar-day--selected {
  box-shadow: inset 0 0 0 1px rgba(84, 44, 58, 0.32);
}

.calendar-day__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.25rem;
}

.calendar-day__number {
  font-size: 0.72rem;
  font-weight: 700;
}

.calendar-day__count {
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  font-size: 0.62rem;
  line-height: 16px;
  text-align: center;
  background: rgba(84, 44, 58, 0.16);
  color: #4b2935;
}

.calendar-day__appointments {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
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
    gap: 0.26rem;
  }

  .calendar-weekday {
    font-size: 0.75rem;
  }

  .calendar-day {
    min-height: 95px;
    padding: 0.3rem;
  }

  .calendar-day__number {
    font-size: 0.78rem;
  }
}

@media (min-width: 992px) {
  .calendar-day {
    min-height: 118px;
    padding: 0.35rem;
  }
}
</style>
