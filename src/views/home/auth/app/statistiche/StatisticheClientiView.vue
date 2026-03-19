<script setup lang="ts">
import { computed } from 'vue'
import { endOfDay, startOfDay } from '../../../../../utils/calendar'
import StatisticheChartCard from './components/StatisticheChartCard.vue'
import { useStatisticheBase } from './useStatisticheBase'
import {
  addMonths,
  filterByRange,
  formatCurrency,
  formatHoursFromMinutes,
  sumRevenue,
  type AppuntamentoStat,
} from './statisticheUtils'

type ClienteMetric = {
  clientId: string
  label: string
  spend: number
  minutes: number
  appointments: number
}

const {
  range,
  clientLabelById,
  appuntamentiFiltrati,
} = useStatisticheBase()

const now = computed(() => new Date())
const referenceEnd = computed(() => {
  const to = range.value.to
  if (to) return endOfDay(to)
  return endOfDay(now.value)
})
const referenceStart = computed(() => addMonths(startOfDay(referenceEnd.value), -6))

const ultimiSeiMesiFiltrati = computed(() =>
  filterByRange(appuntamentiFiltrati.value, {
    from: referenceStart.value,
    to: referenceEnd.value,
  }),
)

const metricheClientiUltimiSeiMesi = computed<ClienteMetric[]>(() => {
  const map = new Map<string, ClienteMetric>()
  const labels = clientLabelById.value

  for (const appointment of ultimiSeiMesiFiltrati.value) {
    const clientId = appointment.clientId || '__unknown__'
    const current = map.get(clientId) ?? {
      clientId,
      label: labels.get(clientId) ?? 'Cliente sconosciuto',
      spend: 0,
      minutes: 0,
      appointments: 0,
    }
    current.spend += appointment.revenue
    current.minutes += appointment.minutes
    current.appointments += 1
    map.set(clientId, current)
  }

  return [...map.values()]
})

const topSpend = computed(() => {
  return [...metricheClientiUltimiSeiMesi.value]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10)
})

const topTempo = computed(() => {
  return [...metricheClientiUltimiSeiMesi.value]
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10)
})

const clientiUnici = computed(() => metricheClientiUltimiSeiMesi.value.length)
const spesaTotaleUltimiSeiMesi = computed(() => sumRevenue(ultimiSeiMesiFiltrati.value))
const mediaSpesaPerCliente = computed(() => {
  if (!clientiUnici.value) return 0
  return spesaTotaleUltimiSeiMesi.value / clientiUnici.value
})
const tempoTotaleUltimiSeiMesi = computed(() => {
  return ultimiSeiMesiFiltrati.value.reduce((sum, item) => sum + item.minutes, 0)
})

const topSpendSeries = computed(() => ({
  labels: topSpend.value.map((item) => item.label),
  values: topSpend.value.map((item) => Math.round(item.spend * 100) / 100),
}))

const topTempoSeries = computed(() => ({
  labels: topTempo.value.map((item) => item.label),
  values: topTempo.value.map((item) => Math.round((item.minutes / 60) * 100) / 100),
}))

const rangeLabel = computed(() => {
  const from = referenceStart.value.toLocaleDateString('it-IT')
  const to = referenceEnd.value.toLocaleDateString('it-IT')
  return `${from} - ${to}`
})

function clientiPerRange(appointments: AppuntamentoStat[]) {
  return new Set(appointments.map((item) => item.clientId).filter(Boolean)).size
}
</script>

<template>
  <div>
    <section class="card border-0 shadow-sm p-3 mb-2 clienti-summary-card">
      <p class="small text-muted mb-2">Metriche clienti (ultimi 6 mesi nel range coerente)</p>
      <p class="small text-muted mb-2">Finestra analizzata: {{ rangeLabel }}</p>

      <div class="clienti-summary-grid">
        <article class="clienti-summary-metric">
          <p class="clienti-summary-metric__label">Clienti unici (ultimi 6 mesi)</p>
          <strong class="clienti-summary-metric__value">{{ clientiUnici }}</strong>
        </article>

        <article class="clienti-summary-metric">
          <p class="clienti-summary-metric__label">Clienti unici nel filtro totale</p>
          <strong class="clienti-summary-metric__value">{{ clientiPerRange(appuntamentiFiltrati) }}</strong>
        </article>

        <article class="clienti-summary-metric">
          <p class="clienti-summary-metric__label">Spesa totale ultimi 6 mesi</p>
          <strong class="clienti-summary-metric__value">{{ formatCurrency(spesaTotaleUltimiSeiMesi) }}</strong>
        </article>

        <article class="clienti-summary-metric">
          <p class="clienti-summary-metric__label">Spesa media per cliente</p>
          <strong class="clienti-summary-metric__value">{{ formatCurrency(mediaSpesaPerCliente) }}</strong>
        </article>

        <article class="clienti-summary-metric">
          <p class="clienti-summary-metric__label">Tempo totale erogato</p>
          <strong class="clienti-summary-metric__value">{{ formatHoursFromMinutes(tempoTotaleUltimiSeiMesi) }}</strong>
        </article>
      </div>
    </section>

    <StatisticheChartCard
      title="Top 10 clienti per spesa (ultimi 6 mesi)"
      subtitle="Ordinati in modo decrescente"
      type="bar"
      :labels="topSpendSeries.labels"
      :datasets="[{ label: 'Spesa', data: topSpendSeries.values, color: '#198754' }]"
      value-mode="currency"
    />

    <StatisticheChartCard
      title="Top 10 clienti per tempo totale appuntamenti (ultimi 6 mesi)"
      subtitle="Valori in ore"
      type="bar"
      :labels="topTempoSeries.labels"
      :datasets="[{ label: 'Ore', data: topTempoSeries.values, color: '#0d6efd' }]"
      value-mode="hours"
    />
  </div>
</template>

<style scoped lang="scss">
.clienti-summary-card {
  background:
    radial-gradient(circle at 0% 0%, rgba(14, 116, 144, 0.12) 0%, transparent 38%),
    radial-gradient(circle at 100% 100%, rgba(25, 135, 84, 0.12) 0%, transparent 38%),
    rgba(255, 255, 255, 0.96);
}

.clienti-summary-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.45rem;
}

.clienti-summary-metric {
  border: 1px solid rgba(84, 44, 58, 0.18);
  border-radius: 0.7rem;
  padding: 0.52rem 0.58rem;
  background: rgba(255, 255, 255, 0.86);
}

.clienti-summary-metric__label {
  margin: 0;
  font-size: 0.7rem;
  color: rgba(84, 44, 58, 0.86);
}

.clienti-summary-metric__value {
  display: block;
  margin-top: 0.08rem;
}
</style>
