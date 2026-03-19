<script setup lang="ts">
import { computed } from 'vue'
import { startOfDay } from '../../../../../utils/calendar'
import StatisticheChartCard from './components/StatisticheChartCard.vue'
import { useStatisticheBase } from './useStatisticheBase'
import {
  buildDailyRevenueSeries,
  formatCurrency,
  formatHoursAndMinutes,
  formatHoursFromMinutes,
  startOfMonth,
  startOfWeekMonday,
  type AppuntamentoStat,
} from './statisticheUtils'

type RevenuePerHourMetric = {
  revenue: number
  minutes: number
  perHour: number
}

const { appuntamentiFiltrati, range, clientLabelById } = useStatisticheBase()

const now = computed(() => new Date())
const currentYearStart = computed(() => new Date(now.value.getFullYear(), 0, 1, 0, 0, 0, 0))
const currentMonthStart = computed(() => startOfMonth(now.value))
const currentWeekStart = computed(() => startOfWeekMonday(now.value))
const currentDayStart = computed(() => startOfDay(now.value))

const serieAppuntamenti = computed(() => {
  if (!range.value.to) {
    return {
      labels: [] as string[],
      values: [] as number[],
    }
  }

  const revenueSeries = buildDailyRevenueSeries(
    appuntamentiFiltrati.value,
    range.value.from,
    range.value.to,
  )

  const counters = new Map<string, number>()
  for (const appointment of appuntamentiFiltrati.value) {
    const key = toDayKey(appointment.start)
    counters.set(key, (counters.get(key) ?? 0) + 1)
  }

  return {
    labels: revenueSeries.labels,
    values: revenueSeries.labels.map((_, index) => {
      const key = toDayKeyByLabel(range.value.from, index)
      return counters.get(key) ?? 0
    }),
  }
})

const appointmentsCount = computed(() => appuntamentiFiltrati.value.length)
const totalMinutes = computed(() =>
  appuntamentiFiltrati.value.reduce((sum, item) => sum + item.minutes, 0),
)
const totalRevenue = computed(() =>
  Math.round(appuntamentiFiltrati.value.reduce((sum, item) => sum + item.revenue, 0) * 100) / 100,
)

const durataMedia = computed(() => {
  if (!appointmentsCount.value) return 0
  return totalMinutes.value / appointmentsCount.value
})

const ricavoOrarioMedioFiltro = computed(() => {
  if (!totalMinutes.value) return 0
  return totalRevenue.value / (totalMinutes.value / 60)
})

const yearPerHour = computed(() => buildRevenuePerHourMetric(currentYearStart.value, now.value))
const monthPerHour = computed(() => buildRevenuePerHourMetric(currentMonthStart.value, now.value))
const weekPerHour = computed(() => buildRevenuePerHourMetric(currentWeekStart.value, now.value))
const dayPerHour = computed(() => buildRevenuePerHourMetric(currentDayStart.value, now.value))

const nowLabel = computed(() =>
  now.value.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }),
)

function buildRevenuePerHourMetric(from: Date, to: Date): RevenuePerHourMetric {
  const fromMs = from.getTime()
  const toMs = to.getTime()

  let revenue = 0
  let minutes = 0

  for (const item of appuntamentiFiltrati.value) {
    const time = item.start.getTime()
    if (time < fromMs || time > toMs) continue
    revenue += item.revenue
    minutes += item.minutes
  }

  const safeRevenue = Math.round(revenue * 100) / 100
  if (!minutes) {
    return {
      revenue: safeRevenue,
      minutes: 0,
      perHour: 0,
    }
  }

  return {
    revenue: safeRevenue,
    minutes,
    perHour: safeRevenue / (minutes / 60),
  }
}

function toDayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDayKeyByLabel(from: Date, offset: number) {
  const date = new Date(from)
  date.setDate(from.getDate() + offset)
  return toDayKey(date)
}

function topAppointments(items: AppuntamentoStat[]) {
  return [...items]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)
}

function formatRevenuePerHour(value: number) {
  return `${formatCurrency(value)} / h`
}

function formatDateTime(date: Date) {
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <section class="d-flex flex-column gap-2">
    <section class="card border-0 shadow-sm p-3 appuntamenti-summary-card">
      <h2 class="h6 mb-2">Panoramica appuntamenti</h2>

      <div class="appuntamenti-summary-grid mb-2">
        <article class="appuntamenti-summary-metric">
          <p class="appuntamenti-summary-metric__label">Appuntamenti filtrati</p>
          <strong class="appuntamenti-summary-metric__value">{{ appointmentsCount }}</strong>
        </article>
        <article class="appuntamenti-summary-metric">
          <p class="appuntamenti-summary-metric__label">Durata media appuntamento</p>
          <strong class="appuntamenti-summary-metric__value">{{ formatHoursAndMinutes(durataMedia) }}</strong>
        </article>
        <article class="appuntamenti-summary-metric">
          <p class="appuntamenti-summary-metric__label">Ricavo orario medio nel filtro</p>
          <strong class="appuntamenti-summary-metric__value">{{ formatRevenuePerHour(ricavoOrarioMedioFiltro) }}</strong>
        </article>
      </div>

      <p class="small text-muted mb-2">
        Rapporto guadagno/ora calcolato fino al momento attuale ({{ nowLabel }}).
      </p>

      <div class="appuntamenti-hourly-grid">
        <article class="appuntamenti-hourly-card">
          <p class="appuntamenti-hourly-card__label">Anno in corso</p>
          <strong class="appuntamenti-hourly-card__value">{{ formatRevenuePerHour(yearPerHour.perHour) }}</strong>
          <span class="appuntamenti-hourly-card__detail">
            {{ formatCurrency(yearPerHour.revenue) }} su {{ formatHoursFromMinutes(yearPerHour.minutes) }}
          </span>
        </article>
        <article class="appuntamenti-hourly-card">
          <p class="appuntamenti-hourly-card__label">Mese in corso</p>
          <strong class="appuntamenti-hourly-card__value">{{ formatRevenuePerHour(monthPerHour.perHour) }}</strong>
          <span class="appuntamenti-hourly-card__detail">
            {{ formatCurrency(monthPerHour.revenue) }} su {{ formatHoursFromMinutes(monthPerHour.minutes) }}
          </span>
        </article>
        <article class="appuntamenti-hourly-card">
          <p class="appuntamenti-hourly-card__label">Settimana in corso</p>
          <strong class="appuntamenti-hourly-card__value">{{ formatRevenuePerHour(weekPerHour.perHour) }}</strong>
          <span class="appuntamenti-hourly-card__detail">
            {{ formatCurrency(weekPerHour.revenue) }} su {{ formatHoursFromMinutes(weekPerHour.minutes) }}
          </span>
        </article>
        <article class="appuntamenti-hourly-card">
          <p class="appuntamenti-hourly-card__label">Giorno corrente (fino ad ora)</p>
          <strong class="appuntamenti-hourly-card__value">{{ formatRevenuePerHour(dayPerHour.perHour) }}</strong>
          <span class="appuntamenti-hourly-card__detail">
            {{ formatCurrency(dayPerHour.revenue) }} su {{ formatHoursFromMinutes(dayPerHour.minutes) }}
          </span>
        </article>
      </div>
    </section>

    <StatisticheChartCard
      title="Numero appuntamenti per giorno"
      subtitle="Mostrato quando il filtro ha una data fine"
      type="line"
      :labels="serieAppuntamenti.labels"
      :datasets="[{ label: 'Appuntamenti', data: serieAppuntamenti.values, color: '#0d6efd' }]"
      :empty-message="'Aggiungi una data fine al filtro per vedere il trend giornaliero.'"
    />

    <section class="card border-0 shadow-sm p-3">
      <h3 class="h6 mb-2">Top appuntamenti per ricavo</h3>
      <div class="table-responsive">
        <table class="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>Cliente</th>
              <th class="text-end">Data e ora</th>
              <th class="text-end">Durata</th>
              <th class="text-end">Ricavo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in topAppointments(appuntamentiFiltrati)" :key="item.id">
              <td>{{ clientLabelById.get(item.clientId) ?? (item.clientId || 'Cliente sconosciuto') }}</td>
              <td class="text-end">{{ formatDateTime(item.start) }}</td>
              <td class="text-end">{{ formatHoursAndMinutes(item.minutes) }}</td>
              <td class="text-end">{{ formatCurrency(item.revenue) }}</td>
            </tr>
            <tr v-if="!appuntamentiFiltrati.length">
              <td colspan="4" class="text-muted small">Nessun appuntamento nel filtro attivo.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<style scoped lang="scss">
.appuntamenti-summary-card {
  background:
    radial-gradient(circle at 0% 0%, rgba(13, 110, 253, 0.12) 0%, transparent 46%),
    linear-gradient(150deg, rgba(255, 255, 255, 0.97), rgba(245, 249, 255, 0.97));
}

.appuntamenti-summary-grid {
  display: grid;
  gap: 0.65rem;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
}

.appuntamenti-summary-metric {
  border: 1px solid rgba(13, 110, 253, 0.18);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.86);
  padding: 0.65rem 0.72rem;
}

.appuntamenti-summary-metric__label {
  margin: 0;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: rgba(13, 110, 253, 0.8);
}

.appuntamenti-summary-metric__value {
  margin-top: 0.08rem;
  display: block;
  font-size: 1rem;
  color: #1e2f55;
}

.appuntamenti-hourly-grid {
  display: grid;
  gap: 0.55rem;
  grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
}

.appuntamenti-hourly-card {
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.55rem 0.62rem;
}

.appuntamenti-hourly-card__label {
  margin: 0;
  font-size: 0.68rem;
  color: rgba(84, 44, 58, 0.82);
}

.appuntamenti-hourly-card__value {
  display: block;
  margin-top: 0.08rem;
  font-size: 0.9rem;
  color: #432330;
}

.appuntamenti-hourly-card__detail {
  display: block;
  margin-top: 0.06rem;
  font-size: 0.65rem;
  color: rgba(67, 35, 48, 0.72);
}
</style>
