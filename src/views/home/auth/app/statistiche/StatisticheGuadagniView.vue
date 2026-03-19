<script setup lang="ts">
import { computed } from 'vue'
import { endOfDay, startOfDay } from '../../../../../utils/calendar'
import StatisticheChartCard from './components/StatisticheChartCard.vue'
import { useStatisticheBase } from './useStatisticheBase'
import {
  addDays,
  aggregateByRange,
  buildDailyRevenueSeries,
  buildMonthlyRevenueSeries,
  buildWeeklyRevenueSeries,
  buildYearlyRevenueSeries,
  distinctYears,
  endOfMonth,
  endOfWeekSunday,
  formatCurrency,
  startOfMonth,
  startOfWeekMonday,
  toDateCompact,
} from './statisticheUtils'

const { appuntamentiFiltrati } = useStatisticheBase()

const now = computed(() => new Date())
const currentYearStart = computed(() => new Date(now.value.getFullYear(), 0, 1, 0, 0, 0, 0))
const currentWeekStart = computed(() => startOfWeekMonday(now.value))
const currentWeekEnd = computed(() => endOfWeekSunday(now.value))
const previousWeekStart = computed(() => addDays(currentWeekStart.value, -7))
const previousWeekEnd = computed(() => endOfWeekSunday(previousWeekStart.value))
const currentMonthStart = computed(() => startOfMonth(now.value))
const currentMonthEnd = computed(() => endOfMonth(now.value))
const currentDayStart = computed(() => startOfDay(now.value))
const currentDayEnd = computed(() => endOfDay(now.value))
const currentYearEnd = computed(() => new Date(now.value.getFullYear(), 11, 31, 23, 59, 59, 999))

const filteredRevenue = computed(() =>
  Math.round(appuntamentiFiltrati.value.reduce((sum, item) => sum + item.revenue, 0) * 100) / 100,
)

const yearToNowRevenue = computed(() =>
  aggregateByRange(appuntamentiFiltrati.value, currentYearStart.value, now.value).revenue,
)

const monthToNowRevenue = computed(() =>
  aggregateByRange(appuntamentiFiltrati.value, currentMonthStart.value, now.value).revenue,
)

const weekToNowRevenue = computed(() =>
  aggregateByRange(appuntamentiFiltrati.value, currentWeekStart.value, now.value).revenue,
)

const dayToNowRevenue = computed(() =>
  aggregateByRange(appuntamentiFiltrati.value, currentDayStart.value, now.value).revenue,
)

const yearTotalRevenue = computed(() =>
  aggregateByRange(appuntamentiFiltrati.value, currentYearStart.value, currentYearEnd.value).revenue,
)

const monthTotalRevenue = computed(() =>
  aggregateByRange(appuntamentiFiltrati.value, currentMonthStart.value, currentMonthEnd.value).revenue,
)

const weekTotalRevenue = computed(() =>
  aggregateByRange(appuntamentiFiltrati.value, currentWeekStart.value, currentWeekEnd.value).revenue,
)

const dayTotalRevenue = computed(() =>
  aggregateByRange(appuntamentiFiltrati.value, currentDayStart.value, currentDayEnd.value).revenue,
)

const revenueAtCurrentMoment = computed(() => dayToNowRevenue.value)

const currentWeekMetric = computed(() =>
  aggregateByRange(appuntamentiFiltrati.value, currentWeekStart.value, currentWeekEnd.value),
)
const previousWeekMetric = computed(() =>
  aggregateByRange(appuntamentiFiltrati.value, previousWeekStart.value, previousWeekEnd.value),
)
const currentMonthMetric = computed(() =>
  aggregateByRange(appuntamentiFiltrati.value, currentMonthStart.value, currentMonthEnd.value),
)

const currentWeekSeries = computed(() => {
  if (currentWeekMetric.value.appointments === 0) return { labels: [], values: [] }
  return buildDailyRevenueSeries(appuntamentiFiltrati.value, currentWeekStart.value, currentWeekEnd.value)
})

const previousWeekSeries = computed(() => {
  if (previousWeekMetric.value.appointments === 0) return { labels: [], values: [] }
  return buildDailyRevenueSeries(appuntamentiFiltrati.value, previousWeekStart.value, previousWeekEnd.value)
})

const currentMonthSeries = computed(() => {
  if (currentMonthMetric.value.appointments === 0) return { labels: [], values: [] }
  const fullSeries = buildDailyRevenueSeries(appuntamentiFiltrati.value, currentMonthStart.value, currentMonthEnd.value)
  return removeWeekendPoints(fullSeries, currentMonthStart.value)
})

const lastTenWeeksSeries = computed(() => {
  if (!appuntamentiFiltrati.value.length) return { labels: [], values: [] }
  return buildWeeklyRevenueSeries(appuntamentiFiltrati.value, now.value, 10)
})

const monthlySeries = computed(() => buildMonthlyRevenueSeries(appuntamentiFiltrati.value))
const yearlySeries = computed(() => buildYearlyRevenueSeries(appuntamentiFiltrati.value))
const hasYearlySeries = computed(() => distinctYears(appuntamentiFiltrati.value).size > 1)

const nowLabel = computed(() =>
  now.value.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }),
)

const currentWeekLabel = computed(() => `${toDateCompact(currentWeekStart.value)} - ${toDateCompact(addDays(currentWeekStart.value, 6))}`)
const previousWeekLabel = computed(() => `${toDateCompact(previousWeekStart.value)} - ${toDateCompact(addDays(previousWeekStart.value, 6))}`)
const currentMonthLabel = computed(() =>
  currentMonthStart.value.toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  }),
)

function removeWeekendPoints(
  series: { labels: string[]; values: number[] },
  from: Date,
) {
  const labels: string[] = []
  const values: number[] = []

  for (let index = 0; index < series.labels.length; index += 1) {
    const date = addDays(from, index)
    const day = date.getDay()
    if (day === 0 || day === 6) continue
    labels.push(`${weekday3(date)} ${series.labels[index] ?? ''}`.trim())
    values.push(series.values[index] ?? 0)
  }

  return { labels, values }
}

function weekday3(date: Date) {
  const tokens = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
  return tokens[date.getDay()] ?? ''
}
</script>

<template>
  <div>
    <section class="card border-0 shadow-sm p-3 mb-2 guadagni-summary-card">
      <p class="small text-muted mb-2">Riepilogo guadagni sul filtro attivo</p>

      <div class="guadagni-summary-top mb-2">
        <article class="guadagni-main-metric">
          <p class="guadagni-main-metric__label">Guadagno filtrato</p>
          <strong class="guadagni-main-metric__value">{{ formatCurrency(filteredRevenue) }}</strong>
        </article>

        <article class="guadagni-now-metric">
          <p class="guadagni-now-metric__label">Guadagno fino a questo momento</p>
          <strong class="guadagni-now-metric__value">{{ formatCurrency(revenueAtCurrentMoment) }}</strong>
          <span class="guadagni-now-metric__time">Aggiornato al {{ nowLabel }}</span>
        </article>
      </div>

      <div class="guadagni-period-grid">
        <article class="guadagni-period-card">
          <p class="guadagni-period-card__label">Anno in corso</p>
          <strong class="guadagni-period-card__value">
            {{ formatCurrency(yearToNowRevenue) }}
            <span class="guadagni-period-card__total">({{ formatCurrency(yearTotalRevenue) }})</span>
          </strong>
        </article>

        <article class="guadagni-period-card">
          <p class="guadagni-period-card__label">Mese in corso</p>
          <strong class="guadagni-period-card__value">
            {{ formatCurrency(monthToNowRevenue) }}
            <span class="guadagni-period-card__total">({{ formatCurrency(monthTotalRevenue) }})</span>
          </strong>
        </article>

        <article class="guadagni-period-card">
          <p class="guadagni-period-card__label">Settimana in corso</p>
          <strong class="guadagni-period-card__value">
            {{ formatCurrency(weekToNowRevenue) }}
            <span class="guadagni-period-card__total">({{ formatCurrency(weekTotalRevenue) }})</span>
          </strong>
        </article>

        <article class="guadagni-period-card">
          <p class="guadagni-period-card__label">Giorno corrente (fino ad ora)</p>
          <strong class="guadagni-period-card__value">
            {{ formatCurrency(dayToNowRevenue) }}
            <span class="guadagni-period-card__total">({{ formatCurrency(dayTotalRevenue) }})</span>
          </strong>
        </article>
      </div>
    </section>

    <StatisticheChartCard
      title="Incassi giornalieri settimana corrente"
      :subtitle="currentWeekLabel"
      type="bar"
      :labels="currentWeekSeries.labels"
      :datasets="[{ label: 'Incassi', data: currentWeekSeries.values, color: '#198754' }]"
      value-mode="currency"
    />

    <StatisticheChartCard
      title="Incassi giornalieri settimana precedente"
      :subtitle="previousWeekLabel"
      type="bar"
      :labels="previousWeekSeries.labels"
      :datasets="[{ label: 'Incassi', data: previousWeekSeries.values, color: '#0d6efd' }]"
      value-mode="currency"
    />

    <StatisticheChartCard
      title="Incassi giornalieri mese corrente"
      :subtitle="currentMonthLabel"
      type="line"
      :labels="currentMonthSeries.labels"
      :datasets="[{ label: 'Incassi', data: currentMonthSeries.values, color: '#d63384' }]"
      value-mode="currency"
    />

    <StatisticheChartCard
      title="Incassi settimanali (ultime 10 settimane)"
      subtitle="Dalla settimana piu lontana alla settimana attuale"
      type="bar"
      :labels="lastTenWeeksSeries.labels"
      :datasets="[{ label: 'Incassi', data: lastTenWeeksSeries.values, color: '#4b2935' }]"
      value-mode="currency"
    />

    <StatisticheChartCard
      title="Incassi mensili"
      subtitle="Tutti i mesi disponibili nei dati filtrati"
      type="line"
      :labels="monthlySeries.labels"
      :datasets="[{ label: 'Incassi', data: monthlySeries.values, color: '#f59e0b' }]"
      value-mode="currency"
    />

    <StatisticheChartCard
      v-if="hasYearlySeries"
      title="Incassi annuali"
      subtitle="Mostrato solo quando sono presenti almeno due anni"
      type="bar"
      :labels="yearlySeries.labels"
      :datasets="[{ label: 'Incassi', data: yearlySeries.values, color: '#0f766e' }]"
      value-mode="currency"
    />
  </div>
</template>

<style scoped lang="scss">
.guadagni-summary-card {
  background:
    radial-gradient(circle at 0% 0%, rgba(25, 135, 84, 0.16) 0%, transparent 44%),
    radial-gradient(circle at 100% 100%, rgba(84, 44, 58, 0.12) 0%, transparent 44%),
    linear-gradient(155deg, rgba(255, 255, 255, 0.98), rgba(246, 251, 247, 0.96));
}

.guadagni-summary-top {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 0.55rem;
}

.guadagni-main-metric {
  border: 1px solid rgba(15, 81, 50, 0.25);
  border-radius: 0.8rem;
  padding: 0.72rem;
  background: rgba(255, 255, 255, 0.88);
}

.guadagni-main-metric__label {
  margin: 0;
  font-size: 0.72rem;
  color: rgba(15, 81, 50, 0.82);
}

.guadagni-main-metric__value {
  display: block;
  margin-top: 0.1rem;
  font-size: 1.35rem;
  line-height: 1.1;
  color: #0f5132;
}

.guadagni-now-metric {
  border: 1px dashed rgba(30, 64, 175, 0.28);
  border-radius: 0.8rem;
  padding: 0.6rem 0.68rem;
  background: rgba(243, 248, 255, 0.72);
}

.guadagni-now-metric__label {
  margin: 0;
  font-size: 0.66rem;
  color: rgba(30, 64, 175, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.guadagni-now-metric__value {
  display: block;
  margin-top: 0.12rem;
  font-size: 0.98rem;
  color: #1e3a8a;
}

.guadagni-now-metric__time {
  display: block;
  margin-top: 0.12rem;
  font-size: 0.64rem;
  color: rgba(30, 64, 175, 0.64);
}

.guadagni-period-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.guadagni-period-card {
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 0.78rem;
  padding: 0.58rem 0.62rem;
  background: rgba(255, 255, 255, 0.88);
}

.guadagni-period-card__label {
  margin: 0;
  font-size: 0.69rem;
  color: rgba(84, 44, 58, 0.82);
}

.guadagni-period-card__value {
  display: inline-flex;
  align-items: baseline;
  gap: 0.26rem;
  margin-top: 0.08rem;
  font-size: 0.92rem;
  color: #3f1f2b;
}

.guadagni-period-card__total {
  font-size: 0.72rem;
  color: rgba(63, 31, 43, 0.55);
  font-weight: 500;
}

@media (max-width: 575.98px) {
  .guadagni-summary-top {
    grid-template-columns: 1fr;
  }
}
</style>
