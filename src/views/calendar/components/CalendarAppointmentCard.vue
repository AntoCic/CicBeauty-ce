<script setup lang="ts">
import { computed } from 'vue'

type CalendarAppointmentCardValue = {
  id: string
  start: Date
  clientFirstName: string
  clientSurname: string
  treatmentNames: string[]
  durationMinutes: number
  totalPrice: number
  emojis: string[]
  isPersonal: boolean
}

const props = defineProps<{
  appointment: CalendarAppointmentCardValue
}>()

const emit = defineEmits<{
  (e: 'open', id: string): void
}>()

const hourFormatter = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' })
const currencyFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
})

const hourLabel = computed(() => hourFormatter.format(props.appointment.start))

const mobileName = computed(() => {
  return String(props.appointment.clientFirstName ?? '').trim() || 'Cliente'
})

const fullName = computed(() => {
  const firstName = String(props.appointment.clientFirstName ?? '').trim()
  const surname = String(props.appointment.clientSurname ?? '').trim()
  return `${firstName} ${surname}`.trim() || firstName || 'Cliente'
})

const emojiLabel = computed(() => props.appointment.emojis.join(' '))

const treatmentLabelTablet = computed(() => {
  const names = props.appointment.treatmentNames.filter(Boolean)
  if (!names.length) return 'Nessun trattamento'
  if (names.length <= 2) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
})

const treatmentLabelDesktop = computed(() => {
  const names = props.appointment.treatmentNames.filter(Boolean)
  return names.length ? names.join(', ') : 'Nessun trattamento'
})

const desktopMeta = computed(() => {
  const parts: string[] = []
  if (Number.isFinite(props.appointment.durationMinutes) && props.appointment.durationMinutes > 0) {
    parts.push(`${props.appointment.durationMinutes} min`)
  }
  if (Number.isFinite(props.appointment.totalPrice) && props.appointment.totalPrice > 0) {
    parts.push(currencyFormatter.format(props.appointment.totalPrice))
  }
  return parts.join(' | ')
})

function openAppointment() {
  emit('open', props.appointment.id)
}
</script>

<template>
  <button
    type="button"
    class="calendar-appointment-card"
    :class="{ 'calendar-appointment-card--personal': appointment.isPersonal }"
    @click.stop="openAppointment"
  >
    <span class="calendar-appointment-card__top">
      <span class="calendar-appointment-card__hour">{{ hourLabel }}</span>
      <span v-if="emojiLabel" class="calendar-appointment-card__emoji">{{ emojiLabel }}</span>
    </span>

    <span class="calendar-appointment-card__mobile">{{ mobileName }}</span>

    <span class="calendar-appointment-card__tablet">
      <span class="d-block text-truncate">{{ fullName }}</span>
      <span class="d-block text-truncate">{{ treatmentLabelTablet }} | {{ appointment.durationMinutes }}m</span>
    </span>

    <span class="calendar-appointment-card__desktop">
      <span class="d-block text-truncate">{{ fullName }}</span>
      <span class="d-block text-truncate">{{ treatmentLabelDesktop }}</span>
      <span v-if="desktopMeta" class="d-block text-muted text-truncate">{{ desktopMeta }}</span>
    </span>
  </button>
</template>

<style scoped lang="scss">
.calendar-appointment-card {
  width: 100%;
  border: 0;
  border-radius: 4px;
  padding: 0.16rem 0.22rem;
  background: rgba(22, 163, 74, 0.11);
  color: #155c34;
  text-align: left;
  font-size: 0.56rem;
  line-height: 1.18;
  display: block;
}

.calendar-appointment-card--personal {
  background: rgba(142, 68, 173, 0.16);
  color: #5e2a73;
}

.calendar-appointment-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.14rem;
  min-width: 0;
}

.calendar-appointment-card__hour {
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.calendar-appointment-card__emoji {
  flex: 0 0 auto;
  max-width: 2.4rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
  text-align: right;
  font-size: 0.67rem;
  line-height: 1;
}

.calendar-appointment-card__mobile {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calendar-appointment-card__tablet,
.calendar-appointment-card__desktop {
  display: none;
}

@media (min-width: 768px) {
  .calendar-appointment-card {
    padding: 0.2rem 0.27rem;
    font-size: 0.62rem;
  }

  .calendar-appointment-card__mobile {
    display: none;
  }

  .calendar-appointment-card__tablet {
    display: block;
  }
}

@media (min-width: 992px) {
  .calendar-appointment-card {
    padding: 0.24rem 0.3rem;
    font-size: 0.68rem;
  }

  .calendar-appointment-card__tablet {
    display: none;
  }

  .calendar-appointment-card__desktop {
    display: block;
  }
}
</style>
