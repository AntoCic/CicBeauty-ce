<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { endOfDay, startOfDay } from '../../utils/calendar'

export type AppointmentWatchRange = {
  from: Date
  to?: Date
}

type ShortcutId = '6m' | '1y' | '2y' | 'all'

type ShortcutItem = {
  id: ShortcutId
  label: string
  icon: string
}

const ALL_FROM_DATE = new Date(1970, 0, 1, 0, 0, 0, 0)
const SHORTCUTS: ShortcutItem[] = [
  { id: '6m', label: 'Carica 6 mesi', icon: 'calendar_view_month' },
  { id: '1y', label: 'Carica 1 anno', icon: 'event' },
  { id: '2y', label: 'Carica 2 anni', icon: 'event_repeat' },
  { id: 'all', label: 'Carica tutto', icon: 'all_inclusive' },
]

const props = withDefaults(defineProps<{
  initialFrom?: Date
  initialTo?: Date
}>(), {
  initialFrom: undefined,
  initialTo: undefined,
})

const emit = defineEmits<{
  (event: 'change', value: AppointmentWatchRange): void
}>()

const fallbackFrom = normalizeFromDate(props.initialFrom) ?? startOfDay(new Date())
const lastValidFrom = ref(fallbackFrom)
const fromInput = ref(toInputDate(fallbackFrom))
const toInput = ref(toInputDate(normalizeToDate(props.initialTo, fallbackFrom)))
const isModalOpen = ref(false)

const normalizedRange = computed<AppointmentWatchRange>(() => {
  const from = parseInputDateAtStart(fromInput.value) ?? lastValidFrom.value
  const parsedTo = parseInputDateAtEnd(toInput.value)
  const to = parsedTo && parsedTo.getTime() >= from.getTime()
    ? parsedTo
    : undefined
  return { from, to }
})

const summary = computed(() => {
  return {
    from: formatDate(normalizedRange.value.from),
    to: normalizedRange.value.to ? formatDate(normalizedRange.value.to) : 'senza fine',
  }
})

watch(
  normalizedRange,
  (range) => {
    emit('change', range)
  },
  { immediate: true },
)

watch(fromInput, (value) => {
  const parsed = parseInputDateAtStart(value)
  if (!parsed) {
    fromInput.value = toInputDate(lastValidFrom.value)
    return
  }

  lastValidFrom.value = parsed
  const parsedTo = parseInputDateAtEnd(toInput.value)
  if (parsedTo && parsedTo.getTime() < parsed.getTime()) {
    toInput.value = ''
  }
})

function openModal() {
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}

function applyModalChanges() {
  normalizeToInput()
  closeModal()
}

function clearEndDate() {
  toInput.value = ''
}

function normalizeToInput() {
  if (!toInput.value) return
  const parsed = parseInputDateAtEnd(toInput.value)
  if (!parsed || parsed.getTime() < lastValidFrom.value.getTime()) {
    toInput.value = ''
  }
}

function applyShortcut(shortcutId: ShortcutId) {
  const today = startOfDay(new Date())

  if (shortcutId === 'all') {
    fromInput.value = toInputDate(ALL_FROM_DATE)
    toInput.value = ''
    return
  }

  if (shortcutId === '6m') {
    fromInput.value = toInputDate(subtractMonths(today, 6))
    toInput.value = ''
    return
  }

  if (shortcutId === '1y') {
    fromInput.value = toInputDate(subtractYears(today, 1))
    toInput.value = ''
    return
  }

  fromInput.value = toInputDate(subtractYears(today, 2))
  toInput.value = ''
}

function subtractMonths(date: Date, months: number) {
  return startOfDay(new Date(date.getFullYear(), date.getMonth() - months, date.getDate(), 0, 0, 0, 0))
}

function subtractYears(date: Date, years: number) {
  return startOfDay(new Date(date.getFullYear() - years, date.getMonth(), date.getDate(), 0, 0, 0, 0))
}

function normalizeFromDate(value?: Date) {
  if (!value) return undefined
  const date = new Date(value.getTime())
  if (Number.isNaN(date.getTime())) return undefined
  return startOfDay(date)
}

function normalizeToDate(value: Date | undefined, from: Date) {
  if (!value) return undefined
  const date = new Date(value.getTime())
  if (Number.isNaN(date.getTime())) return undefined
  const normalized = endOfDay(date)
  if (normalized.getTime() < from.getTime()) return undefined
  return normalized
}

function parseInputDateAtStart(value: string) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return undefined
  const date = new Date(`${normalized}T12:00:00`)
  if (Number.isNaN(date.getTime())) return undefined
  return startOfDay(date)
}

function parseInputDateAtEnd(value: string) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return undefined
  const date = new Date(`${normalized}T12:00:00`)
  if (Number.isNaN(date.getTime())) return undefined
  return endOfDay(date)
}

function toInputDate(date?: Date) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(date: Date) {
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
</script>

<template>
  <section class="watch-range-card card border-0 shadow-sm p-3 mb-2">
    <div class="watch-range-top">
      <div class="watch-range-kicker">
        <span class="material-symbols-outlined watch-range-kicker__icon" aria-hidden="true">monitoring</span>
        <small class="watch-range-kicker__text">Range download appuntamenti</small>
      </div>

      <button type="button" class="watch-range-open-btn" @click="openModal">
        <span class="material-symbols-outlined watch-range-open-btn__icon" aria-hidden="true">tune</span>
        Modifica range
      </button>
    </div>

    <div class="watch-range-summary">
      <span class="watch-range-pill watch-range-pill--from">
        <span class="material-symbols-outlined watch-range-pill__icon" aria-hidden="true">event_upcoming</span>
        Inizio {{ summary.from }}
      </span>
      <span class="watch-range-pill watch-range-pill--to">
        <span class="material-symbols-outlined watch-range-pill__icon" aria-hidden="true">event_available</span>
        Fine {{ summary.to }}
      </span>
    </div>

    <div class="watch-range-shortcuts">
      <button
        v-for="shortcut in SHORTCUTS"
        :key="shortcut.id"
        type="button"
        class="watch-range-shortcuts__btn"
        @click="applyShortcut(shortcut.id)"
      >
        <span class="material-symbols-outlined watch-range-shortcuts__icon" aria-hidden="true">{{ shortcut.icon }}</span>
        {{ shortcut.label }}
      </button>
    </div>

    <div
      v-if="isModalOpen"
      class="watch-range-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="watchRangeModalTitle"
    >
      <div class="watch-range-modal__backdrop" @click="closeModal"></div>

      <div class="watch-range-modal__content card border-0 shadow-lg p-3 p-md-4">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h2 id="watchRangeModalTitle" class="h6 mb-1">Imposta range appuntamenti</h2>
            <p class="small text-muted mb-0">La data fine e opzionale, la data inizio no.</p>
          </div>
          <button type="button" class="btn-close" aria-label="Chiudi modal range" @click="closeModal"></button>
        </div>

        <div class="mb-2">
          <label for="watchRangeFromDate" class="form-label small mb-1">Data inizio</label>
          <input
            id="watchRangeFromDate"
            v-model="fromInput"
            type="date"
            class="form-control"
            required
          />
        </div>

        <div class="mb-2">
          <label for="watchRangeToDate" class="form-label small mb-1">Data fine (opzionale)</label>
          <input
            id="watchRangeToDate"
            v-model="toInput"
            type="date"
            class="form-control"
            @change="normalizeToInput"
          />
        </div>

        <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mt-3">
          <button
            type="button"
            class="watch-range-clear-btn"
            :disabled="!toInput"
            @click="clearEndDate"
          >
            <span class="material-symbols-outlined" aria-hidden="true">ink_eraser</span>
            Svuota fine
          </button>

          <div class="d-flex gap-2">
            <button type="button" class="watch-range-ghost-btn" @click="closeModal">Annulla</button>
            <button type="button" class="watch-range-apply-btn" @click="applyModalChanges">Applica</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.watch-range-card {
  background:
    radial-gradient(circle at 0% 0%, rgba(84, 44, 58, 0.18) 0%, transparent 42%),
    radial-gradient(circle at 100% 100%, rgba(25, 135, 84, 0.18) 0%, transparent 42%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(249, 246, 247, 0.96) 100%);
}

.watch-range-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.watch-range-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.watch-range-kicker__icon {
  font-size: 1rem;
  line-height: 1;
  color: #4b2935;
}

.watch-range-kicker__text {
  color: rgba(84, 44, 58, 0.86);
  font-weight: 600;
}

.watch-range-open-btn {
  border: 1px solid rgba(84, 44, 58, 0.3);
  background: rgba(255, 255, 255, 0.84);
  color: #4b2935;
  border-radius: 999px;
  padding: 0.28rem 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.78rem;
  font-weight: 600;
}

.watch-range-open-btn__icon {
  font-size: 1rem;
  line-height: 1;
}

.watch-range-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.75rem;
}

.watch-range-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 999px;
  padding: 0.22rem 0.6rem;
  font-size: 0.73rem;
  border: 1px solid transparent;
  white-space: nowrap;
}

.watch-range-pill__icon {
  font-size: 0.92rem;
  line-height: 1;
}

.watch-range-pill--from {
  border-color: rgba(84, 44, 58, 0.25);
  background: rgba(84, 44, 58, 0.12);
  color: #4b2935;
}

.watch-range-pill--to {
  border-color: rgba(15, 81, 50, 0.25);
  background: rgba(25, 135, 84, 0.14);
  color: #0f5132;
}

.watch-range-shortcuts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
  margin-top: 0.75rem;
}

.watch-range-shortcuts__btn {
  border: 1px solid rgba(84, 44, 58, 0.22);
  background: rgba(255, 255, 255, 0.9);
  color: #4b2935;
  border-radius: 0.62rem;
  padding: 0.45rem 0.5rem;
  font-size: 0.73rem;
  line-height: 1.2;
  text-align: left;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.watch-range-shortcuts__icon {
  font-size: 0.98rem;
  line-height: 1;
  color: #4b2935;
}

.watch-range-modal {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.watch-range-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(19, 11, 15, 0.48);
  backdrop-filter: blur(2px);
}

.watch-range-modal__content {
  position: relative;
  width: min(100%, 460px);
  background:
    radial-gradient(circle at 0% 0%, rgba(84, 44, 58, 0.12) 0%, transparent 36%),
    radial-gradient(circle at 100% 100%, rgba(25, 135, 84, 0.12) 0%, transparent 36%),
    rgba(255, 255, 255, 0.97);
}

.watch-range-clear-btn,
.watch-range-ghost-btn,
.watch-range-apply-btn {
  border-radius: 999px;
  font-size: 0.78rem;
  padding: 0.32rem 0.78rem;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.watch-range-clear-btn {
  border-color: rgba(184, 126, 0, 0.38);
  background: rgba(255, 218, 124, 0.27);
  color: #7b5200;
}

.watch-range-clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.watch-range-ghost-btn {
  border-color: rgba(84, 44, 58, 0.3);
  background: rgba(255, 255, 255, 0.85);
  color: #4b2935;
}

.watch-range-apply-btn {
  border-color: rgba(15, 81, 50, 0.45);
  background: rgba(25, 135, 84, 0.2);
  color: #0f5132;
  font-weight: 600;
}

@media (max-width: 575.98px) {
  .watch-range-shortcuts {
    grid-template-columns: 1fr;
  }
}
</style>
