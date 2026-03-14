<script setup lang="ts">
import { cicKitStore } from 'cic-kit'
import { computed, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { useAppointmentWatchManager } from '../../composables/useAppointmentWatchManager'
import { Auth } from '../../main'
import { DEFAULT_USER_COLOR, PERSONAL_APPOINTMENT_COLOR, normalizeUserColor } from '../../constants/userProfile'
import { appConfigStore } from '../../stores/appConfigStore'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { publicUserStore } from '../../stores/publicUser'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { treatmentStore } from '../../stores/treatmentStore'
import {
  appointmentOperatorIds,
  appointmentPersonalOwnerId,
  canReadAppointmentForUser,
  isPersonalAppointment,
} from '../../utils/appointmentVisibility'
import {
  appointmentEndDate,
  endOfDay,
  startOfDay,
} from '../../utils/calendar'
import { asDate } from '../../utils/date'

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const DAY_WATCH_REASON = 'calendar-day-view'
const { activateDayWatch, releaseAppointmentWatch } = useAppointmentWatchManager()

const selectedDate = computed(() => {
  const raw = String(route.query.date ?? '').trim()
  const fallback = new Date()
  if (!raw) return startOfDay(fallback)
  const next = new Date(`${raw}T12:00:00`)
  if (Number.isNaN(next.getTime())) return startOfDay(fallback)
  return startOfDay(next)
})

watch(
  selectedDate,
  (date) => {
    activateDayWatch(date, DAY_WATCH_REASON)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  releaseAppointmentWatch(DAY_WATCH_REASON)
})

const selectedOperatorId = computed(() => String(route.query.operatorId ?? '').trim())
const defaultDuration = computed(() => appConfigStore.getConfigData().defaultAppointmentDurationMinutes)
const currencyFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

const treatmentsById = computed(() => new Map(treatmentStore.itemsActiveArray.map((item) => [item.id, item])))
const treatmentCategoryEmojiById = computed(() =>
  new Map(
    treatmentCategoryStore.itemsActiveArray.map((category) => [
      category.id,
      String(category.emoji ?? '').trim(),
    ]),
  ),
)
const clientsById = computed(() => new Map(clientStore.itemsActiveArray.map((item) => [item.id, item])))
const operatorsById = computed(() =>
  new Map(
    publicUserStore.itemsActiveArray.map((operator) => [
      operator.id,
      {
        label: `${operator.name} ${operator.surname}`.trim() || operator.email || operator.id,
        color: normalizeUserColor(operator.color),
      },
    ]),
  ),
)

function primaryOperatorId(appointment: (typeof appointmentStore.itemsActiveArray)[number]) {
  return appointmentPersonalOwnerId(appointment) || appointmentOperatorIds(appointment)[0] || ''
}

function normalizeMoney(value: unknown) {
  const next = Number(value)
  if (!Number.isFinite(next)) return 0
  return Math.max(0, Math.round(next * 100) / 100)
}

function clientOutstandingAmount(clientId: string) {
  const client = clientsById.value.get(clientId)
  if (!client) return 0

  const deposits = Array.isArray(client.deposits) ? client.deposits : []
  const totalOutstanding = deposits.reduce((runningTotal, deposit) => {
    const totalAmount = normalizeMoney(deposit?.totalAmount)
    const settlements = Array.isArray(deposit?.settlements) ? deposit.settlements : []
    const paidTotal = settlements.reduce((paid, settlement) => paid + normalizeMoney(settlement?.paidAmount), 0)
    return runningTotal + Math.max(0, totalAmount - paidTotal)
  }, 0)

  return normalizeMoney(totalOutstanding)
}

const dayAppointments = computed(() => {
  const dayStart = startOfDay(selectedDate.value)
  const dayEnd = endOfDay(selectedDate.value)

  return appointmentStore.itemsActiveArray
    .filter((appointment) => {
      const start = asDate(appointment.date_time)
      if (!start) return false
      if (start < dayStart || start > dayEnd) return false

      const me = String(Auth.uid ?? '').trim()
      if (!canReadAppointmentForUser(appointment, me)) return false

      const selectedOperator = selectedOperatorId.value
      if (!selectedOperator) return true
      const primary = primaryOperatorId(appointment)
      const linked = appointmentOperatorIds(appointment)
      if (isPersonalAppointment(appointment) && primary) return primary === selectedOperator
      if (primary && primary === selectedOperator) return true
      return linked.includes(selectedOperator)
    })
    .map((appointment) => {
      const start = asDate(appointment.date_time) ?? dayStart
      const end = appointmentEndDate(appointment, treatmentsById.value, defaultDuration.value)
      const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
      const clientId = String(appointment.client_id ?? appointment.user_id ?? '').trim()
      const client = clientId ? clientsById.value.get(clientId) : undefined
      const clientLabel = client ? `${client.name} ${client.surname}`.trim() : 'Cliente non associato'
      const treatmentLabel = (appointment.treatment_ids ?? [])
        .map((id) => {
          const treatment = treatmentsById.value.get(id)
          if (!treatment) return ''
          const title = String(treatment.title ?? '').trim()
          if (!title) return ''
          const emoji = (Array.isArray(treatment.categoryIds) ? treatment.categoryIds : [])
            .map((categoryId) => String(treatmentCategoryEmojiById.value.get(categoryId) ?? '').trim())
            .find(Boolean)
          return emoji ? `${emoji} ${title}` : title
        })
        .filter(Boolean)
        .join(', ') || 'Nessun trattamento'
      const primary = primaryOperatorId(appointment)
      const operatorColor = isPersonalAppointment(appointment)
        ? PERSONAL_APPOINTMENT_COLOR
        : (operatorsById.value.get(primary)?.color ?? DEFAULT_USER_COLOR)
      const outstandingAmount = clientId ? clientOutstandingAmount(clientId) : 0
      return {
        appointment,
        start,
        end,
        durationMinutes,
        totalPrice: normalizeMoney(appointment.total),
        clientLabel,
        treatmentLabel,
        operatorColor,
        outstandingAmount,
      }
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())
})

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

type DayInsertionGap = {
  id: string
  start: Date
  end: Date
  minutes: number
  isLunchWindow: boolean
}

const dayTimeline = computed(() => {
  let hasLunchGapAtLeastThirty = false
  const timeline: Array<
    | {
      key: string
      kind: 'appointment'
      item: (typeof dayAppointments.value)[number]
    }
    | {
      key: string
      kind: 'gap'
      gap: DayInsertionGap
    }
  > = []

  dayAppointments.value.forEach((item, index) => {
    timeline.push({
      key: `appointment-${item.appointment.id}`,
      kind: 'appointment',
      item,
    })

    const next = dayAppointments.value[index + 1]
    if (!next) return
    const gap = createGapBetween(item.end, next.start)
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
})

const insertionGapsCount = computed(() => dayTimeline.value.reduce((total, entry) => total + (entry.kind === 'gap' ? 1 : 0), 0))

const dayLabel = computed(() =>
  selectedDate.value.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }),
)

function formatHour(date: Date) {
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function dayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatCurrency(value: number) {
  return currencyFormatter.format(normalizeMoney(value))
}

function formatGapLabel(minutes: number) {
  if (minutes === 60) return '1 ora libera'
  if (minutes > 60 && minutes % 60 === 0) {
    return `${minutes / 60} ore libere`
  }
  return `${minutes} minuti liberi`
}

function hexToRgb(value: string) {
  const normalized = String(value ?? '').trim().toLowerCase()
  const match = /^#([0-9a-f]{6})$/.exec(normalized)
  if (!match) return undefined
  const hex = match[1]
  if (!hex) return undefined
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

function rgbaFromHex(value: string, alpha: number, fallback: string) {
  const rgb = hexToRgb(value)
  if (!rgb) return fallback
  const safeAlpha = Math.max(0, Math.min(1, alpha))
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`
}

function appointmentRowStyle(color: string, isPersonal: boolean) {
  const normalizedColor = normalizeUserColor(color)
  return {
    borderLeftColor: isPersonal ? PERSONAL_APPOINTMENT_COLOR : normalizedColor,
    background: isPersonal
      ? rgbaFromHex(PERSONAL_APPOINTMENT_COLOR, 0.08, 'rgba(8, 92, 140, 0.08)')
      : rgbaFromHex(normalizedColor, 0.05, 'rgba(232, 179, 190, 0.26)'),
  }
}

function openAppointment(id: string) {
  router.push({ name: 'AppointmentEditView', params: { id } })
}

function createFromSlot(slotStart: Date) {
  const date = slotStart.toISOString()
  router.push({
    name: 'AppointmentEditView',
    params: { id: 'new' },
    query: {
      dateTime: date,
      operatorId: selectedOperatorId.value || undefined,
    },
  })
}

function createFromSelectedDay() {
  router.push({
    name: 'AppointmentEditView',
    params: { id: 'new' },
    query: {
      date: dayKey(selectedDate.value),
      operatorId: selectedOperatorId.value || undefined,
    },
  })
}

</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Dettaglio giorno" :to="{ name: 'CalendarView' }">
      <div class="app-header__tools">
        <button
          type="button"
          class="day-header-create-btn"
          aria-label="Aggiungi appuntamento nel giorno selezionato"
          title="Nuovo appuntamento"
          @click="createFromSelectedDay"
        >
          <span class="material-symbols-outlined day-header-create-btn__icon" aria-hidden="true">event_available</span>
        </button>
      </div>
    </HeaderApp>

    <div class="px-2 pb-4">
      <div class="card border-0 shadow-sm p-3 mb-2">
        <h2 class="h6 mb-1 text-capitalize">{{ dayLabel }}</h2>
        <small class="text-muted">Appuntamenti: {{ dayAppointments.length }} | Inserimenti rapidi: {{ insertionGapsCount }}</small>
      </div>

      <div class="card border-0 shadow-sm p-3 h-100">
        <div class="vstack gap-2">
          <template v-for="entry in dayTimeline" :key="entry.key">
            <article
              v-if="entry.kind === 'appointment'"
              class="appointment-row"
              :style="appointmentRowStyle(entry.item.operatorColor, Boolean(entry.item.appointment.isPersonal))"
              @click="openAppointment(entry.item.appointment.id)"
            >
              <div class="d-flex justify-content-between align-items-start gap-2">
                <div class="min-w-0">
                  <p class="fw-semibold mb-0 text-truncate">{{ entry.item.clientLabel }}</p>
                  <p class="small text-muted mb-0">
                    {{ formatHour(entry.item.start) }} - {{ formatHour(entry.item.end) }}
                    <span class="appointment-row__meta-badge">{{ entry.item.durationMinutes }}m</span>
                    <span class="appointment-row__meta-badge appointment-row__meta-badge--price">{{ formatCurrency(entry.item.totalPrice) }}</span>
                    <span v-if="entry.item.appointment.isPersonal" class="badge text-bg-secondary ms-1">
                      {{ entry.item.appointment.isPublic ? 'personale pubblico' : 'personale' }}
                    </span>
                  </p>
                  <p v-if="entry.item.outstandingAmount > 0" class="appointment-row__due mb-0">
                    <span class="appointment-row__due-label">da saldare</span>
                    <strong>{{ formatCurrency(entry.item.outstandingAmount) }}</strong>
                  </p>
                  <p class="small text-muted mb-0 text-truncate">{{ entry.item.treatmentLabel }}</p>
                  <p class="small text-muted mb-0 text-truncate">{{ entry.item.appointment.notes || 'Nessuna nota' }}</p>
                </div>
                <button
                  type="button"
                  class="appointment-edit-btn"
                  aria-label="Modifica appuntamento"
                  @click.stop="openAppointment(entry.item.appointment.id)"
                >
                  &#x270F;&#xFE0F;
                </button>
              </div>
            </article>

            <button
              v-else
              type="button"
              class="gap-row"
              :class="{ 'gap-row--lunch': entry.gap.isLunchWindow }"
              @click="createFromSlot(entry.gap.start)"
            >
              <span class="gap-row__head">
                <strong class="gap-row__cta">+ Nuovo appuntamento</strong>
                <span class="gap-row__time">{{ formatHour(entry.gap.start) }} - {{ formatHour(entry.gap.end) }}</span>
              </span>
              <small class="gap-row__label">{{ formatGapLabel(entry.gap.minutes) }}</small>
            </button>
          </template>

          <p v-if="!dayAppointments.length" class="text-muted small mb-0">Nessun appuntamento nel giorno selezionato.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.appointment-row {
  border: 1px solid rgba(84, 44, 58, 0.14);
  border-left: 4px solid transparent;
  border-radius: 8px;
  padding: 0.65rem;
  cursor: pointer;
  background: #fff;
}

.day-header-create-btn {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(84, 44, 58, 0.32);
  background: rgba(255, 255, 255, 0.72);
  border-radius: 8px;
  color: #4b2935;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
}

.day-header-create-btn__icon {
  font-size: 1.2rem;
  line-height: 1;
}

.appointment-edit-btn {
  border: 1px solid rgba(84, 44, 58, 0.2);
  background: rgba(255, 255, 255, 0.84);
  border-radius: 8px;
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.appointment-row__due {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.2rem;
  padding: 0.16rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(112, 73, 10, 0.24);
  background: rgba(255, 211, 120, 0.25);
  color: #6f4200;
  font-size: 0.75rem;
}

.appointment-row__due-label {
  text-transform: lowercase;
  letter-spacing: 0.01em;
}

.appointment-row__meta-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 0.3rem;
  padding: 0.08rem 0.32rem;
  border-radius: 999px;
  border: 1px solid rgba(84, 44, 58, 0.24);
  background: rgba(84, 44, 58, 0.08);
  color: #4b2935;
  font-size: 0.66rem;
  line-height: 1;
  white-space: nowrap;
}

.appointment-row__meta-badge--price {
  border-color: rgba(25, 135, 84, 0.28);
  background: rgba(25, 135, 84, 0.12);
  color: #0f5132;
}

.gap-row {
  border: 1px dashed rgba(25, 135, 84, 0.45);
  background: rgba(25, 135, 84, 0.1);
  color: #0f5132;
  border-radius: 10px;
  padding: 0.52rem 0.65rem;
  text-align: left;
  cursor: pointer;
}

.gap-row--lunch {
  border-color: rgba(184, 126, 0, 0.48);
  background: rgba(255, 218, 124, 0.3);
  color: #7b5200;
}

.gap-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
}

.gap-row__cta {
  font-size: 0.88rem;
}

.gap-row__time {
  font-size: 0.78rem;
  opacity: 0.9;
}

.gap-row__label {
  display: inline-block;
  margin-top: 0.1rem;
  opacity: 0.9;
}

.min-w-0 {
  min-width: 0;
}
</style>


