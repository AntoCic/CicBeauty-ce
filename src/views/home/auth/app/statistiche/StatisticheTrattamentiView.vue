<script setup lang="ts">
import { computed } from 'vue'
import StatisticheChartCard from './components/StatisticheChartCard.vue'
import StatisticheSummaryCard from './components/StatisticheSummaryCard.vue'
import { useStatisticheBase } from './useStatisticheBase'
import {
  formatCurrency,
  formatHoursAndMinutes,
  type AppuntamentoStat,
} from './statisticheUtils'

type TrattamentoMetric = {
  treatmentId: string
  label: string
  revenue: number
  minutes: number
  count: number
  revenuePerHour: number
}

const {
  summary,
  treatmentDurationById,
  appuntamentiFiltrati,
} = useStatisticheBase()

const metricheTrattamenti = computed<TrattamentoMetric[]>(() => {
  const map = new Map<string, { treatmentId: string; label: string; revenue: number; minutes: number; count: number }>()
  const treatmentMap = treatmentDurationById.value

  for (const appointment of appuntamentiFiltrati.value) {
    const ids = [...new Set(appointment.treatmentIds.filter(Boolean))]
    if (!ids.length) continue

    const sharedRevenue = appointment.revenue / ids.length
    const sharedMinutes = appointment.minutes / ids.length

    for (const treatmentId of ids) {
      const treatment = treatmentMap.get(treatmentId)
      const current = map.get(treatmentId) ?? {
        treatmentId,
        label: treatment?.title || treatmentId,
        revenue: 0,
        minutes: 0,
        count: 0,
      }

      current.revenue += sharedRevenue
      current.minutes += sharedMinutes
      current.count += 1
      map.set(treatmentId, current)
    }
  }

  return [...map.values()]
    .map((item) => {
      const revenue = Math.round(item.revenue * 100) / 100
      const minutes = Math.round(item.minutes)
      const revenuePerHour = minutes > 0
        ? Math.round((revenue / (minutes / 60)) * 100) / 100
        : revenue

      return {
        ...item,
        revenue,
        minutes,
        revenuePerHour,
      }
    })
})

const topByRevenue = computed(() => {
  return [...metricheTrattamenti.value]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
})

const topByCount = computed(() => {
  return [...metricheTrattamenti.value]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
})

const sortedByRevenuePerHour = computed(() => {
  return [...metricheTrattamenti.value]
    .sort((a, b) => b.revenuePerHour - a.revenuePerHour)
})

const totalTreatmentRevenue = computed(() =>
  metricheTrattamenti.value.reduce((sum, item) => sum + item.revenue, 0),
)
const totalTreatmentMinutes = computed(() =>
  metricheTrattamenti.value.reduce((sum, item) => sum + item.minutes, 0),
)

const byRevenueSeries = computed(() => ({
  labels: topByRevenue.value.map((item) => item.label),
  values: topByRevenue.value.map((item) => item.revenue),
}))

const byCountSeries = computed(() => ({
  labels: topByCount.value.map((item) => item.label),
  values: topByCount.value.map((item) => item.count),
}))

function mediaPerAppuntamento(items: AppuntamentoStat[]) {
  if (!items.length) return 0
  const total = items.reduce((sum, item) => sum + item.revenue, 0)
  return total / items.length
}
</script>

<template>
  <div>
    <StatisticheSummaryCard :summary="summary" />

    <section class="card border-0 shadow-sm p-3 mb-2 trattamenti-summary-card">
      <p class="small text-muted mb-2">Metriche trattamenti su appuntamenti filtrati</p>
      <div class="trattamenti-summary-grid">
        <article class="trattamenti-summary-metric">
          <p class="trattamenti-summary-metric__label">Trattamenti presenti nel filtro</p>
          <strong class="trattamenti-summary-metric__value">{{ metricheTrattamenti.length }}</strong>
        </article>
        <article class="trattamenti-summary-metric">
          <p class="trattamenti-summary-metric__label">Guadagno totale trattamenti</p>
          <strong class="trattamenti-summary-metric__value">{{ formatCurrency(totalTreatmentRevenue) }}</strong>
        </article>
        <article class="trattamenti-summary-metric">
          <p class="trattamenti-summary-metric__label">Tempo totale erogato</p>
          <strong class="trattamenti-summary-metric__value">{{ formatHoursAndMinutes(totalTreatmentMinutes) }}</strong>
        </article>
        <article class="trattamenti-summary-metric">
          <p class="trattamenti-summary-metric__label">Ricavo medio per appuntamento</p>
          <strong class="trattamenti-summary-metric__value">{{ formatCurrency(mediaPerAppuntamento(appuntamentiFiltrati)) }}</strong>
        </article>
      </div>
    </section>

    <StatisticheChartCard
      title="Trattamenti che generano piu guadagno"
      subtitle="Top 10 su appuntamenti filtrati"
      type="bar"
      :labels="byRevenueSeries.labels"
      :datasets="[{ label: 'Guadagno', data: byRevenueSeries.values, color: '#198754' }]"
      value-mode="currency"
    />

    <StatisticheChartCard
      title="Trattamenti piu richiesti"
      subtitle="Top 10 per numero appuntamenti"
      type="bar"
      :labels="byCountSeries.labels"
      :datasets="[{ label: 'Appuntamenti', data: byCountSeries.values, color: '#0d6efd' }]"
      value-mode="number"
    />

    <section class="card border-0 shadow-sm p-3 mb-2">
      <h3 class="h6 mb-2">Rendimento trattamenti (ordinato per guadagno/ora)</h3>
      <div class="table-responsive">
        <table class="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>Trattamento</th>
              <th class="text-end">Guadagno totale</th>
              <th class="text-end">Tempo erogato</th>
              <th class="text-end">Guadagno / ora</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sortedByRevenuePerHour" :key="item.treatmentId">
              <td>{{ item.label }}</td>
              <td class="text-end">{{ formatCurrency(item.revenue) }}</td>
              <td class="text-end">{{ formatHoursAndMinutes(item.minutes) }}</td>
              <td class="text-end">{{ formatCurrency(item.revenuePerHour) }}</td>
            </tr>
            <tr v-if="!sortedByRevenuePerHour.length">
              <td colspan="4" class="text-muted small">Nessun trattamento disponibile nel filtro attivo.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.trattamenti-summary-card {
  background:
    radial-gradient(circle at 0% 0%, rgba(16, 185, 129, 0.13) 0%, transparent 40%),
    radial-gradient(circle at 100% 100%, rgba(13, 110, 253, 0.12) 0%, transparent 40%),
    rgba(255, 255, 255, 0.96);
}

.trattamenti-summary-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.45rem;
}

.trattamenti-summary-metric {
  border: 1px solid rgba(84, 44, 58, 0.18);
  border-radius: 0.7rem;
  padding: 0.52rem 0.58rem;
  background: rgba(255, 255, 255, 0.86);
}

.trattamenti-summary-metric__label {
  margin: 0;
  font-size: 0.7rem;
  color: rgba(84, 44, 58, 0.86);
}

.trattamenti-summary-metric__value {
  display: block;
  margin-top: 0.08rem;
}
</style>
