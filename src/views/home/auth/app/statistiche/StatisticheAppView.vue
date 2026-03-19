<script setup lang="ts">
import { cicKitStore, loading, toast } from 'cic-kit'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import HeaderApp from '../../../../../components/headers/HeaderApp.vue'
import { appointmentStore } from '../../../../../stores/appointmentStore'
import { endOfDay, startOfDay } from '../../../../../utils/calendar'
import { asDate } from '../../../../../utils/date'
import StatisticheTabs from './components/StatisticheTabs.vue'
import {
  setStatisticheSharedRange,
  statisticheSharedState,
  type StatisticheSharedRange,
} from './statisticheSharedState'

type StatsTab = 'guadagni' | 'clienti' | 'appuntamenti'
type StatsPresetId =
  | 'month-to-date'
  | 'last-month'
  | 'last-3-months'
  | 'last-6-months'
  | 'year-to-date'
  | 'last-12-months'
  | 'previous-year'
  | 'previous-year-minus-1'
  | 'previous-year-minus-2'
  | 'all'

type StatsPreset = {
  id: StatsPresetId
  label: string
  description: string
  buildRange: () => StatisticheSharedRange
}

const STATS_DOWNLOAD_ALL_LOADING_KEY = 'loading:stats-download-all'
const route = useRoute()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const isDownloadingAll = ref(false)

const activeTab = computed<StatsTab>(() => {
  const name = String(route.name ?? '')
  if (name === 'StatsClientiView') return 'clienti'
  if (name === 'StatsAppuntamentiView') return 'appuntamenti'
  return 'guadagni'
})

const appointmentsSpan = computed(() => {
  let first: Date | undefined
  let last: Date | undefined
  let count = 0

  for (const appointment of appointmentStore.itemsActiveArray) {
    const date = asDate(appointment.date_time)
    if (!date) continue
    count += 1
    if (!first || date.getTime() < first.getTime()) first = date
    if (!last || date.getTime() > last.getTime()) last = date
  }

  return { first, last, count }
})

const presetButtons = computed<StatsPreset[]>(() => {
  const today = startOfDay(new Date())
  const endToday = endOfDay(today)
  const previousYear = today.getFullYear() - 1
  const allFrom = appointmentsSpan.value.first
    ? startOfDay(appointmentsSpan.value.first)
    : new Date(1970, 0, 1, 0, 0, 0, 0)

  return [
    {
      id: 'month-to-date',
      label: 'Questo mese (oggi)',
      description: 'Dal primo del mese fino a oggi',
      buildRange: () => ({
        from: startOfMonth(today),
        to: endToday,
      }),
    },
    {
      id: 'last-month',
      label: 'Ultimo mese',
      description: 'Mese precedente completo',
      buildRange: () => {
        const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0, 0)
        return {
          from: startOfMonth(previousMonth),
          to: endOfMonth(previousMonth),
        }
      },
    },
    {
      id: 'last-3-months',
      label: 'Ultimi 3 mesi',
      description: 'Finestra mobile fino a oggi',
      buildRange: () => ({
        from: startOfDay(addMonths(today, -3)),
        to: endToday,
      }),
    },
    {
      id: 'last-6-months',
      label: 'Ultimi 6 mesi',
      description: 'Finestra mobile fino a oggi',
      buildRange: () => ({
        from: startOfDay(addMonths(today, -6)),
        to: endToday,
      }),
    },
    {
      id: 'year-to-date',
      label: 'Da inizio anno',
      description: 'Dal 1 gennaio fino a oggi',
      buildRange: () => ({
        from: startOfYear(today),
        to: endToday,
      }),
    },
    {
      id: 'last-12-months',
      label: 'Ultimi 12 mesi',
      description: 'Finestra mobile fino a oggi',
      buildRange: () => ({
        from: startOfDay(addMonths(today, -12)),
        to: endToday,
      }),
    },
    {
      id: 'previous-year',
      label: `Anno precedente (${previousYear})`,
      description: 'Solo l anno precedente',
      buildRange: () => {
        const yearDate = new Date(previousYear, 0, 1, 0, 0, 0, 0)
        return {
          from: startOfYear(yearDate),
          to: endOfYear(yearDate),
        }
      },
    },
    {
      id: 'previous-year-minus-1',
      label: `Anno ${previousYear - 1}`,
      description: 'Un anno ancora indietro',
      buildRange: () => {
        const yearDate = new Date(previousYear - 1, 0, 1, 0, 0, 0, 0)
        return {
          from: startOfYear(yearDate),
          to: endOfYear(yearDate),
        }
      },
    },
    {
      id: 'previous-year-minus-2',
      label: `Anno ${previousYear - 2}`,
      description: 'Due anni ancora indietro',
      buildRange: () => {
        const yearDate = new Date(previousYear - 2, 0, 1, 0, 0, 0, 0)
        return {
          from: startOfYear(yearDate),
          to: endOfYear(yearDate),
        }
      },
    },
    {
      id: 'all',
      label: 'Tutto',
      description: 'Dal primo appuntamento disponibile in poi',
      buildRange: () => ({
        from: allFrom,
        to: undefined,
      }),
    },
  ]
})

const activeRangeKey = computed(() =>
  buildRangeKey({
    from: statisticheSharedState.from,
    to: statisticheSharedState.to,
  }),
)

const appliedRangeLabel = computed(() =>
  formatRangeLabel({
    from: statisticheSharedState.from,
    to: statisticheSharedState.to,
  }),
)

const statsWindowLabel = computed(() => {
  const from = formatDateTime(appointmentsSpan.value.first)
  const to = formatDateTime(appointmentsSpan.value.last)
  return `${from} - ${to}`
})

function applyPreset(preset: StatsPreset) {
  setStatisticheSharedRange(preset.buildRange())
}

function isPresetActive(preset: StatsPreset) {
  return buildRangeKey(preset.buildRange()) === activeRangeKey.value
}

async function downloadAllAppointments() {
  if (isDownloadingAll.value) return

  isDownloadingAll.value = true
  loading.on(STATS_DOWNLOAD_ALL_LOADING_KEY)
  try {
    await appointmentStore.get({
      dateTime: {
        from: new Date(1970, 0, 1, 0, 0, 0, 0),
      },
    })
    toast.success(`Scaricati ${appointmentStore.itemsActiveArray.length} appuntamenti`)
  } catch (error) {
    console.error('[stats] download all appointments failed', error)
    toast.error('Errore durante il download completo degli appuntamenti')
  } finally {
    isDownloadingAll.value = false
    loading.off(STATS_DOWNLOAD_ALL_LOADING_KEY)
  }
}

function formatDateTime(value?: Date) {
  if (!value) return '-'
  return value.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRangeLabel(range: StatisticheSharedRange) {
  const from = range.from.toLocaleDateString('it-IT')
  const to = range.to?.toLocaleDateString('it-IT') ?? 'senza fine'
  return `${from} - ${to}`
}

function buildRangeKey(range: StatisticheSharedRange) {
  const from = startOfDay(range.from).getTime()
  const to = range.to ? endOfDay(range.to).getTime() : 'open'
  return `${from}|${to}`
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0)
}

function endOfYear(date: Date) {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999)
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate(), 0, 0, 0, 0)
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Statistiche" :to="{ name: 'home' }" />

    <div class="px-2 pb-4">
      <section class="card border-0 shadow-sm p-3 mb-2 stats-download-card">
        <div class="stats-section-head">
          <div>
            <h2 class="h6 mb-1">Dataset Appuntamenti</h2>
            <p class="small text-muted mb-0">
              Le statistiche lavorano sugli appuntamenti disponibili: {{ statsWindowLabel }}.
            </p>
          </div>
          <button
            type="button"
            class="btn btn-success d-inline-flex align-items-center gap-1"
            :disabled="isDownloadingAll"
            @click="downloadAllAppointments"
          >
            <span class="material-symbols-outlined" aria-hidden="true">download</span>
            Scarica tutti gli appuntamenti
          </button>
        </div>

        <div class="stats-dataset-grid mt-3">
          <article class="stats-dataset-metric">
            <p class="stats-dataset-metric__label">Appuntamenti disponibili</p>
            <strong class="stats-dataset-metric__value">{{ appointmentsSpan.count }}</strong>
          </article>
          <article class="stats-dataset-metric">
            <p class="stats-dataset-metric__label">Primo appuntamento</p>
            <strong class="stats-dataset-metric__value">{{ formatDateTime(appointmentsSpan.first) }}</strong>
          </article>
          <article class="stats-dataset-metric">
            <p class="stats-dataset-metric__label">Ultimo appuntamento</p>
            <strong class="stats-dataset-metric__value">{{ formatDateTime(appointmentsSpan.last) }}</strong>
          </article>
        </div>
      </section>

      <section class="card border-0 shadow-sm p-3 mb-2 stats-filter-card">
        <div class="stats-section-head stats-section-head--filters">
          <h2 class="h6 mb-0">Filtra periodo</h2>
          <span class="badge text-bg-light border">Filtro attivo: {{ appliedRangeLabel }}</span>
        </div>

        <div class="stats-preset-grid mt-3">
          <button
            v-for="preset in presetButtons"
            :key="preset.id"
            type="button"
            class="btn stats-preset-btn"
            :class="{ 'stats-preset-btn--active': isPresetActive(preset) }"
            @click="applyPreset(preset)"
          >
            <span class="stats-preset-btn__label">{{ preset.label }}</span>
            <span class="stats-preset-btn__description">{{ preset.description }}</span>
          </button>
        </div>
      </section>

      <StatisticheTabs :active="activeTab" />

      <RouterView />
    </div>
  </div>
</template>

<style scoped lang="scss">
.stats-download-card {
  background:
    radial-gradient(circle at 12% 0%, rgba(25, 135, 84, 0.15) 0%, transparent 45%),
    radial-gradient(circle at 88% 100%, rgba(13, 110, 253, 0.11) 0%, transparent 50%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.97), rgba(247, 252, 248, 0.96));
}

.stats-filter-card {
  background:
    radial-gradient(circle at 100% 0%, rgba(84, 44, 58, 0.13) 0%, transparent 52%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.97), rgba(249, 246, 247, 0.96));
}

.stats-section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.9rem;
}

.stats-section-head--filters {
  align-items: center;
}

.stats-dataset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.6rem;
}

.stats-dataset-metric {
  border: 1px solid rgba(32, 64, 44, 0.18);
  border-radius: 0.85rem;
  padding: 0.6rem 0.72rem;
  background: rgba(255, 255, 255, 0.86);
}

.stats-dataset-metric__label {
  margin: 0;
  font-size: 0.7rem;
  letter-spacing: 0.02em;
  color: rgba(31, 54, 40, 0.76);
}

.stats-dataset-metric__value {
  display: block;
  margin-top: 0.08rem;
  font-size: 0.9rem;
  color: #173328;
}

.stats-preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.55rem;
}

.stats-preset-btn {
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 0.85rem;
  text-align: left;
  padding: 0.6rem 0.66rem;
  background: rgba(255, 255, 255, 0.88);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.16rem;
  transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
}

.stats-preset-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(13, 110, 253, 0.42);
  box-shadow: 0 8px 14px rgba(32, 36, 45, 0.08);
}

.stats-preset-btn--active {
  border-color: rgba(25, 135, 84, 0.5);
  background: rgba(25, 135, 84, 0.14);
}

.stats-preset-btn__label {
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  color: #3f1f2b;
}

.stats-preset-btn__description {
  font-size: 0.67rem;
  line-height: 1.25;
  color: rgba(63, 31, 43, 0.75);
}

@media (max-width: 575.98px) {
  .stats-section-head,
  .stats-section-head--filters {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-preset-grid {
    grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
  }
}
</style>
