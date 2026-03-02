<script setup lang="ts">
import { Btn, cicKitStore, toast, useStoreWatch } from 'cic-kit'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { hub } from '../../call/hub'
import HeaderApp from '../../components/HeaderApp.vue'
import { Auth } from '../../main'
import { appConfigStore } from '../../stores/appConfigStore'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { publicUserStore } from '../../stores/publicUser'
import { treatmentStore } from '../../stores/treatmentStore'
import { addMonths, monthRangeWithPrefetch, startOfDay } from '../../utils/calendar'
import { asDate } from '../../utils/date'
import { hasOperatorAccess } from '../../utils/permissions'
import CalendarExtraButtons from './components/CalendarExtraButtons.vue'

type StoreAppointment = (typeof appointmentStore.itemsActiveArray)[number]

type VisibleAppointment = {
  id: string
  start: Date
  dayKey: string
  clientLabel: string
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
const canOperate = computed(() => hasOperatorAccess())
const selectedDate = ref(startOfDay(new Date()))
const visibleMonth = ref(normalizeMonth(selectedDate.value))
const selectedOperatorId = ref<'all' | string>('all')
const showOnlyMyPersonal = ref(false)
const isLoadingRange = ref(false)
const isFilterModalOpen = ref(false)
const draftOperatorId = ref<'all' | string>('all')
const draftShowOnlyMyPersonal = ref(false)

useStoreWatch(
  canOperate.value
    ? [
        {
          store: appointmentStore,
          getOpts: { orderBy: { fieldPath: 'date_time', directionStr: 'desc' }, forceLocalSet: true },
        },
        {
          store: clientStore,
          getOpts: { orderBy: { fieldPath: 'surname', directionStr: 'asc' }, forceLocalSet: true },
        },
        {
          store: treatmentStore,
          getOpts: { orderBy: { fieldPath: 'title', directionStr: 'asc' }, forceLocalSet: true },
          checkLogin: false,
        },
        {
          store: appConfigStore,
          getOpts: { forceLocalSet: true },
          checkLogin: false,
        },
        {
          store: publicUserStore,
          getOpts: { forceLocalSet: true },
        },
      ]
    : [],
)

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
      `${client.name} ${client.surname}`.trim() || 'Cliente senza nome',
    ]),
  )
})

const monthLabel = computed(() =>
  visibleMonth.value.toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  }),
)

const activeFiltersLabel = computed(() => {
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
  return parts.length ? parts.join(' | ') : 'Nessun filtro attivo'
})

const visibleAppointments = computed<VisibleAppointment[]>(() => {
  const items = appointmentStore.itemsActiveArray
    .map((appointment) => {
      const start = asDate(appointment.date_time)
      if (!start) return undefined
      if (!canReadAppointment(appointment)) return undefined
      if (!operatorMatch(appointment)) return undefined
      if (showOnlyMyPersonal.value && !appointment.isPersonal) return undefined

      const clientId = String(appointment.client_id ?? appointment.user_id ?? '').trim()
      const clientLabel = clientId ? (clientsById.value.get(clientId) ?? 'Cliente non associato') : 'Cliente non associato'

      return {
        id: appointment.id,
        start,
        dayKey: keyForDay(start),
        clientLabel,
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

function canReadAppointment(appointment: StoreAppointment) {
  const isPersonal = appointment.isPersonal ?? false
  if (isPersonal) {
    return String(appointment.ownerOperatorId ?? '').trim() === String(Auth.uid ?? '').trim()
  }
  return true
}

function operatorMatch(appointment: StoreAppointment) {
  const selected = selectedOperatorId.value
  if (selected === 'all') return true

  const normalized = String(selected).trim()
  if (!normalized) return true
  if (appointment.isPersonal) {
    return String(appointment.ownerOperatorId ?? '').trim() === normalized
  }

  const linked = appointment.operator_ids ?? []
  return linked.includes(normalized) || String(appointment.operator_id ?? '').trim() === normalized
}

function formatHour(date: Date) {
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

async function loadMonthRange(referenceMonth: Date) {
  if (!canOperate.value) return
  const config = appConfigStore.getConfigData()
  const prefetchMonths = Math.max(0, Number(config.calendarPrefetchMonths ?? 1))
  const range = monthRangeWithPrefetch(referenceMonth, prefetchMonths)
  isLoadingRange.value = true
  try {
    await appointmentStore.getRange(range.start, range.end, true)
  } catch (error) {
    console.error(error)
    toast.error('Errore caricamento calendario')
    void hub.error({
      title: 'Calendario',
      message: `Errore caricamento calendario nel mese ${referenceMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}.`,
    })
  } finally {
    isLoadingRange.value = false
  }
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

onMounted(() => {
  visibleMonth.value = normalizeMonth(selectedDate.value)
  void loadMonthRange(visibleMonth.value)
})

watch(
  () => visibleMonth.value.getTime(),
  () => {
    void loadMonthRange(visibleMonth.value)
  },
)
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Calendario" :to="{ name: 'home' }" />

    <div class="px-2 pb-4">
      <p v-if="!canOperate" class="text-muted small mt-3">
        Permesso `OPERATORE` richiesto per accedere al calendario.
      </p>

      <template v-else>
        <CalendarExtraButtons @create-appointment="openNewAppointment" @open-filters="openFiltersModal" />

        <section class="card border-0 shadow-sm p-3 mb-2">
          <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
            <div class="month-switcher">
              <button type="button" class="month-arrow-btn" aria-label="Mese precedente" @click="goToPreviousMonth">
                &lsaquo;
              </button>
              <strong class="month-label">{{ monthLabel }}</strong>
              <button type="button" class="month-arrow-btn" aria-label="Mese successivo" @click="goToNextMonth">
                &rsaquo;
              </button>
            </div>
            <small class="text-muted" v-if="isLoadingRange">Caricamento range calendario...</small>
            <small v-else class="text-muted">{{ visibleAppointments.length }} appuntamenti nel range caricato</small>
          </div>

          <small class="text-muted d-block mt-2">Filtri: {{ activeFiltersLabel }}</small>
        </section>

        <section class="card border-0 shadow-sm p-2 calendar-shell">
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
                <span v-if="day.appointments.length" class="badge rounded-pill text-bg-secondary">
                  {{ day.appointments.length }}
                </span>
              </header>

              <div class="calendar-day__appointments">
                <button
                  v-for="appointment in day.appointments.slice(0, 3)"
                  :key="appointment.id"
                  type="button"
                  class="calendar-appointment"
                  :class="{ 'calendar-appointment--personal': appointment.isPersonal }"
                  @click.stop="openAppointment(appointment.id)"
                >
                  <span class="calendar-appointment__hour">{{ formatHour(appointment.start) }}</span>
                  <span class="calendar-appointment__label">{{ appointment.clientLabel }}</span>
                </button>
                <small v-if="day.appointments.length > 3" class="text-muted">
                  +{{ day.appointments.length - 3 }} altri
                </small>
              </div>
            </article>
          </div>
        </section>
      </template>
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
.month-label {
  text-transform: capitalize;
  min-width: 9.5rem;
  text-align: center;
}

.month-switcher {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.month-arrow-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(84, 44, 58, 0.25);
  background: rgba(255, 255, 255, 0.88);
  color: #4b2935;
  font-size: 1.2rem;
  line-height: 1;
}

.calendar-shell {
  overflow-x: auto;
}

.calendar-grid {
  min-width: 940px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.4rem;
}

.calendar-weekday {
  text-align: center;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(84, 44, 58, 0.78);
  padding-bottom: 0.1rem;
}

.calendar-day {
  min-height: 130px;
  border: 1px solid rgba(84, 44, 58, 0.18);
  border-radius: 8px;
  padding: 0.4rem;
  background: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
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
  color: rgba(84, 44, 58, 0.52);
}

.calendar-day--today {
  border-color: rgba(84, 44, 58, 0.5);
}

.calendar-day--selected {
  box-shadow: inset 0 0 0 1px rgba(84, 44, 58, 0.36);
}

.calendar-day__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.25rem;
}

.calendar-day__number {
  font-size: 0.82rem;
  font-weight: 600;
}

.calendar-day__appointments {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.calendar-appointment {
  width: 100%;
  border: 0;
  border-radius: 6px;
  padding: 0.24rem 0.35rem;
  background: rgba(22, 163, 74, 0.12);
  color: #155c34;
  text-align: left;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
}

.calendar-appointment--personal {
  background: rgba(142, 68, 173, 0.18);
  color: #5e2a73;
}

.calendar-appointment__hour {
  font-weight: 600;
  white-space: nowrap;
}

.calendar-appointment__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
</style>
