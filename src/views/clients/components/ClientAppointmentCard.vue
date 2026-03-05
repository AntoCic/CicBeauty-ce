<script setup lang="ts">
import { computed } from 'vue'
import { asDate } from '../../../utils/date'
import type { AppointmentLike } from '../clientAppointmentUtils'

const props = withDefaults(
  defineProps<{
    title: string
    appointment?: AppointmentLike
    emptyLabel?: string
    showStatus?: boolean
    compact?: boolean
    minimal?: boolean
    clickable?: boolean
    showTodayEmoji?: boolean
    todayEmojiLabel?: string
  }>(),
  {
    emptyLabel: 'Nessun appuntamento',
    showStatus: false,
    compact: false,
    minimal: false,
    clickable: false,
    showTodayEmoji: false,
    todayEmojiLabel: 'Oggi',
  },
)

const emit = defineEmits<{
  (e: 'click', appointment: AppointmentLike): void
}>()

const isClickable = computed(() => Boolean(props.clickable && props.appointment))

const dateLabel = computed(() => {
  if (!props.appointment) return ''
  const date = asDate(props.appointment.date_time)
  if (!date) return ''
  if (props.minimal) {
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return date.toLocaleString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const statusLabel = computed(() => {
  if (!props.appointment || !props.showStatus) return ''
  const status = String(props.appointment.status ?? '').trim().toLowerCase()
  if (!status) return ''
  if (status === 'planned') return 'Stato: pianificato'
  if (status === 'confirmed') return 'Stato: confermato'
  if (status === 'done') return 'Stato: completato'
  if (status === 'cancelled') return 'Stato: annullato'
  return `Stato: ${status}`
})

function onClick() {
  if (!isClickable.value || !props.appointment) return
  emit('click', props.appointment)
}
</script>

<template>
  <button
    v-if="isClickable"
    type="button"
    class="client-appointment-card"
    :class="{
      'client-appointment-card--compact': compact,
      'client-appointment-card--minimal': minimal,
      'client-appointment-card--clickable': isClickable,
    }"
    @click="onClick"
  >
    <p class="client-appointment-card__title mb-1" :class="{ 'client-appointment-card__title--minimal': minimal }">
      {{ title }}
    </p>
    <p v-if="dateLabel" class="mb-0" :class="{ 'fw-semibold': !minimal, 'client-appointment-card__line--minimal': minimal }">
      {{ dateLabel }}
    </p>
    <p v-else class="mb-0" :class="{ 'text-muted small': !minimal, 'client-appointment-card__line--minimal text-muted': minimal }">
      {{ emptyLabel }}
    </p>
    <p
      v-if="statusLabel"
      class="mb-0"
      :class="{ 'text-muted small': !minimal, 'client-appointment-card__line--minimal text-muted': minimal }"
    >
      {{ statusLabel }}
    </p>
    <p
      v-if="showTodayEmoji"
      class="mb-0"
      :class="{ small: !minimal, 'client-appointment-card__line--minimal': minimal }"
    >
      {{ todayEmojiLabel }}
    </p>
  </button>

  <article
    v-else
    class="client-appointment-card"
    :class="{ 'client-appointment-card--compact': compact, 'client-appointment-card--minimal': minimal }"
  >
    <p class="client-appointment-card__title mb-1" :class="{ 'client-appointment-card__title--minimal': minimal }">
      {{ title }}
    </p>
    <p v-if="dateLabel" class="mb-0" :class="{ 'fw-semibold': !minimal, 'client-appointment-card__line--minimal': minimal }">
      {{ dateLabel }}
    </p>
    <p v-else class="mb-0" :class="{ 'text-muted small': !minimal, 'client-appointment-card__line--minimal text-muted': minimal }">
      {{ emptyLabel }}
    </p>
    <p
      v-if="statusLabel"
      class="mb-0"
      :class="{ 'text-muted small': !minimal, 'client-appointment-card__line--minimal text-muted': minimal }"
    >
      {{ statusLabel }}
    </p>
    <p
      v-if="showTodayEmoji"
      class="mb-0"
      :class="{ small: !minimal, 'client-appointment-card__line--minimal': minimal }"
    >
      {{ todayEmojiLabel }}
    </p>
  </article>
</template>

<style scoped lang="scss">
.client-appointment-card {
  width: 100%;
  text-align: left;
  border: 1px solid rgba(84, 44, 58, 0.16);
  border-radius: 0.5rem;
  background: #ffffff;
  padding: 0.55rem 0.65rem;
}

.client-appointment-card--compact {
  padding: 0.5rem 0.6rem;
}

.client-appointment-card--minimal {
  border: none;
  background: transparent;
  padding: 0;
}

.client-appointment-card--clickable {
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.client-appointment-card--clickable:hover {
  border-color: rgba(84, 44, 58, 0.38);
  box-shadow: 0 6px 14px rgba(27, 16, 21, 0.08);
}

.client-appointment-card__title {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #5b3744;
}

.client-appointment-card__title--minimal {
  font-size: 0.61rem;
  letter-spacing: 0.03em;
  margin-bottom: 0.06rem !important;
  color: rgba(91, 55, 68, 0.86);
}

.client-appointment-card__line--minimal {
  font-size: 0.68rem;
  line-height: 1.12;
  color: #2f2026;
}
</style>
