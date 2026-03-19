<script setup lang="ts">
import { computed } from 'vue'
import StatisticheChartCard from './components/StatisticheChartCard.vue'
import StatisticheSummaryCard from './components/StatisticheSummaryCard.vue'
import { useStatisticheBase } from './useStatisticheBase'
import {
  buildDailyRevenueSeries,
  formatCurrency,
  formatHoursAndMinutes,
  type AppuntamentoStat,
} from './statisticheUtils'

const { appuntamentiFiltrati, summary, range, clientLabelById } = useStatisticheBase()

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

const durataMedia = computed(() => {
  const totalAppointments = appuntamentiFiltrati.value.length
  if (!totalAppointments) return 0
  const minutes = appuntamentiFiltrati.value.reduce((sum, item) => sum + item.minutes, 0)
  return minutes / totalAppointments
})

const ricavoMedio = computed(() => {
  const totalAppointments = appuntamentiFiltrati.value.length
  if (!totalAppointments) return 0
  const total = appuntamentiFiltrati.value.reduce((sum, item) => sum + item.revenue, 0)
  return total / totalAppointments
})

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
</script>

<template>
  <section class="d-flex flex-column gap-2">
    <StatisticheSummaryCard :summary="summary" />

    <section class="card border-0 shadow-sm p-3 appuntamenti-summary-card">
      <h2 class="h6 mb-2">Panoramica appuntamenti</h2>
      <div class="appuntamenti-summary-grid">
        <article class="appuntamenti-summary-metric">
          <p class="appuntamenti-summary-metric__label">Durata media appuntamento</p>
          <strong class="appuntamenti-summary-metric__value">{{ formatHoursAndMinutes(durataMedia) }}</strong>
        </article>
        <article class="appuntamenti-summary-metric">
          <p class="appuntamenti-summary-metric__label">Ricavo medio appuntamento</p>
          <strong class="appuntamenti-summary-metric__value">{{ formatCurrency(ricavoMedio) }}</strong>
        </article>
      </div>
    </section>

    <StatisticheChartCard
      title="Numero appuntamenti per giorno"
      subtitle="Mostrato quando il filtro ha una data fine"
      chart-id="stats-appointments-daily-count"
      chart-type="line"
      :labels="serieAppuntamenti.labels"
      :datasets="[{ label: 'Appuntamenti', data: serieAppuntamenti.values, color: '#0d6efd' }]"
      :show-empty="!range.to"
      empty-message="Aggiungi una data fine al filtro per vedere il trend giornaliero."
    />

    <section class="card border-0 shadow-sm p-3">
      <h3 class="h6 mb-2">Top appuntamenti per ricavo</h3>
      <div class="table-responsive">
        <table class="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>Cliente</th>
              <th class="text-end">Data</th>
              <th class="text-end">Durata</th>
              <th class="text-end">Ricavo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in topAppointments(appuntamentiFiltrati)" :key="item.id">
              <td>{{ clientLabelById.get(item.clientId) ?? (item.clientId || 'Cliente sconosciuto') }}</td>
              <td class="text-end">{{ item.start.toLocaleDateString('it-IT') }}</td>
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
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
</style>
