<script setup lang="ts">
import { computed } from 'vue'
import { DEFAULT_USER_COLOR, PERSONAL_APPOINTMENT_COLOR, normalizeUserColor } from '../../../constants/userProfile'

type CalendarAppointmentCardValue = {
  id: string
  start: Date
  notes: string
  clientFirstName: string
  clientSurname: string
  treatmentNames: string[]
  durationMinutes: number
  totalPrice: number
  emojis: string[]
  isPersonal: boolean
  operatorColor: string
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

function normalizeNoteLabel(value: unknown) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return ''

  return normalized
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const personalLabel = computed(() => {
  if (!props.appointment.isPersonal) return ''
  return normalizeNoteLabel(props.appointment.notes) || 'Personale'
})

const mobileName = computed(() => {
  if (props.appointment.isPersonal) return personalLabel.value
  return String(props.appointment.clientFirstName ?? '').trim() || 'Cliente'
})

const fullName = computed(() => {
  if (props.appointment.isPersonal) return personalLabel.value
  const firstName = String(props.appointment.clientFirstName ?? '').trim()
  const surname = String(props.appointment.clientSurname ?? '').trim()
  return `${firstName} ${surname}`.trim() || firstName || 'Cliente'
})

const emojiLabelMobile = computed(() => props.appointment.emojis.join(''))
const emojiLabelDesktop = computed(() => props.appointment.emojis.join(' '))

const treatmentLabelTablet = computed(() => {
  if (props.appointment.isPersonal) return ''
  const names = props.appointment.treatmentNames.filter(Boolean)
  if (!names.length) return 'Nessun trattamento'
  if (names.length <= 2) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
})

const treatmentLabelDesktop = computed(() => {
  if (props.appointment.isPersonal) return ''
  const names = props.appointment.treatmentNames.filter(Boolean)
  return names.length ? names.join(', ') : 'Nessun trattamento'
})

const desktopMeta = computed(() => {
  const parts: string[] = []
  if (Number.isFinite(props.appointment.durationMinutes) && props.appointment.durationMinutes > 0) {
    parts.push(`${props.appointment.durationMinutes} min`)
  }
  if (!props.appointment.isPersonal && Number.isFinite(props.appointment.totalPrice) && props.appointment.totalPrice >= 0) {
    parts.push(currencyFormatter.format(props.appointment.totalPrice))
  }
  return parts.join(' | ')
})

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

function isDarkColor(value: string) {
  const rgb = hexToRgb(value)
  if (!rgb) return false
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance < 0.53
}

const normalizedOperatorColor = computed(() => normalizeUserColor(props.appointment.operatorColor ?? DEFAULT_USER_COLOR))

const cardStyle = computed(() => {
  if (props.appointment.isPersonal) {
    return {
      background: rgbaFromHex(PERSONAL_APPOINTMENT_COLOR, 0.2, 'rgba(8, 92, 140, 0.2)'),
      borderColor: rgbaFromHex(PERSONAL_APPOINTMENT_COLOR, 0.48, 'rgba(8, 92, 140, 0.48)'),
      color: '#083a5f',
    }
  }

  const baseColor = normalizedOperatorColor.value
  return {
    background: rgbaFromHex(baseColor, 0.18, 'rgba(232, 179, 190, 0.34)'),
    borderColor: rgbaFromHex(baseColor, 0.46, 'rgba(84, 44, 58, 0.36)'),
    color: isDarkColor(baseColor) ? '#f7fbff' : '#2f2026',
  }
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
    :style="cardStyle"
    @click.stop="openAppointment"
  >
    <span class="calendar-appointment-card__top">
      <span class="calendar-appointment-card__hour">{{ hourLabel }}</span>
      <span
        v-if="!appointment.isPersonal && emojiLabelMobile"
        class="calendar-appointment-card__emoji calendar-appointment-card__emoji--mobile"
      >
        {{ emojiLabelMobile }}
      </span>
      <span
        v-if="!appointment.isPersonal && emojiLabelDesktop"
        class="calendar-appointment-card__emoji calendar-appointment-card__emoji--desktop"
      >
        {{ emojiLabelDesktop }}
      </span>
    </span>

    <span class="calendar-appointment-card__mobile">{{ mobileName }}</span>

    <span class="calendar-appointment-card__tablet">
      <span class="d-block text-truncate">{{ fullName }}</span>
      <span v-if="!appointment.isPersonal" class="d-block text-truncate">{{ treatmentLabelTablet }} | {{ appointment.durationMinutes }}m</span>
      <span v-else class="d-block text-truncate">{{ appointment.durationMinutes }}m</span>
    </span>

    <span class="calendar-appointment-card__desktop">
      <span class="d-block text-truncate">{{ fullName }}</span>
      <span v-if="!appointment.isPersonal" class="d-block text-truncate">{{ treatmentLabelDesktop }}</span>
      <span v-if="desktopMeta" class="calendar-appointment-card__meta d-block text-truncate">{{ desktopMeta }}</span>
    </span>
  </button>
</template>

<style scoped lang="scss">
.calendar-appointment-card {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 0.16rem 0.22rem;
  text-align: left;
  font-size: 0.56rem;
  line-height: 1.18;
  display: block;
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
  font-size: 0.52rem;
  line-height: 1;
}

.calendar-appointment-card__emoji--desktop {
  display: none;
}

.calendar-appointment-card__mobile {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calendar-appointment-card__meta {
  opacity: 0.82;
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

  .calendar-appointment-card__emoji {
    font-size: 0.67rem;
  }

  .calendar-appointment-card__emoji--mobile {
    display: none;
  }

  .calendar-appointment-card__emoji--desktop {
    display: inline;
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
