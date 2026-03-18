<script setup lang="ts">
import { computed } from 'vue'
import StatisticheChartCard from './components/StatisticheChartCard.vue'
import StatisticheSummaryCard from './components/StatisticheSummaryCard.vue'
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
  startOfMonth,
  startOfWeekMonday,
  toDateCompact,
} from './statisticheUtils'

const {
  summary,
  appuntamentiFiltrati,
} = useStatisticheBase()

const now = computed(() => new Date())
const currentWeekStart = computed(() => startOfWeekMonday(now.value))
const currentWeekEnd = computed(() => endOfWeekSunday(now.value))
const previousWeekStart = computed(() => addDays(currentWeekStart.value, -7))
const previousWeekEnd = computed(() => endOfWeekSunday(previousWeekStart.value))
const currentMonthStart = computed(() => startOfMonth(now.value))
const currentMonthEnd = computed(() => endOfMonth(now.value))

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
  return buildDailyRevenueSeries(appuntamentiFiltrati.value, currentMonthStart.value, currentMonthEnd.value)
})

const lastTenWeeksSeries = computed(() => {
  if (!appuntamentiFiltrati.value.length) return { labels: [], values: [] }
  return buildWeeklyRevenueSeries(appuntamentiFiltrati.value, now.value, 10)
})

const monthlySeries = computed(() => buildMonthlyRevenueSeries(appuntamentiFiltrati.value))
const yearlySeries = computed(() => buildYearlyRevenueSeries(appuntamentiFiltrati.value))
const hasYearlySeries = computed(() => distinctYears(appuntamentiFiltrati.value).size > 1)

const currentWeekLabel = computed(() => `${toDateCompact(currentWeekStart.value)} - ${toDateCompact(addDays(currentWeekStart.value, 6))}`)
const previousWeekLabel = computed(() => `${toDateCompact(previousWeekStart.value)} - ${toDateCompact(addDays(previousWeekStart.value, 6))}`)
const currentMonthLabel = computed(() =>
  currentMonthStart.value.toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  }),
)
</script>

<template>
  <div>
    <StatisticheSummaryCard :summary="summary" />

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
