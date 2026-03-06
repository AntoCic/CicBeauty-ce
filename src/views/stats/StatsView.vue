<script setup lang="ts">
import { cicKitStore, useStoreWatch } from 'cic-kit'
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Bar, Line, Pie } from 'vue-chartjs'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { useAppointmentWatchManager } from '../../composables/useAppointmentWatchManager'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { couponStore } from '../../stores/couponStore'
import { expenseStore } from '../../stores/expenseStore'
import { treatmentStore } from '../../stores/treatmentStore'
import { typeExpenseStore } from '../../stores/typeExpenseStore'
import { asDate } from '../../utils/date'
import {
  buildCouponUsage,
  buildCustomerMetrics,
  buildDailyLoadSeries,
  buildTreatmentUsage,
  buildTypeExpenseCosts,
} from '../../utils/businessStats'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Legend, Tooltip)

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const STATS_WATCH_REASON = 'stats-view'
const { activateRangeWatch, releaseAppointmentWatch, appointmentWatchState } = useAppointmentWatchManager()
const rangePreset = ref<'current-year' | 'manual'>('current-year')
const manualFrom = ref('')
const manualTo = ref('')

const now = new Date()
const today = startOfDay(now)
manualFrom.value = dateToInput(startOfYear(now))
manualTo.value = dateToInput(today)

useStoreWatch([
  { store: expenseStore, getOpts: {  } },
  { store: couponStore, getOpts: {  } },
])

const selectedRange = computed(() => {
  if (rangePreset.value === 'current-year') {
    const from = startOfYear(new Date())
    const to = new Date(from.getFullYear() + 1, 0, 1, 0, 0, 0, 0)
    return { from, to }
  }

  const manualFromDate = inputToDate(manualFrom.value)
  const manualToDate = inputToDate(manualTo.value)
  const fallbackFrom = startOfYear(new Date())

  const from = manualFromDate ?? fallbackFrom
  const to = manualToDate ? startOfNextDay(manualToDate) : undefined
  if (to && to.getTime() <= from.getTime()) {
    return { from, to: startOfNextDay(from) }
  }
  return { from, to }
})

watch(
  selectedRange,
  (range) => {
    activateRangeWatch({
      from: range.from,
      to: range.to,
      reason: STATS_WATCH_REASON,
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  releaseAppointmentWatch(STATS_WATCH_REASON)
})

const fallbackDuration = computed(() => 60)
const treatmentsById = computed(() => new Map(treatmentStore.itemsActiveArray.map((item) => [item.id, item])))
const clientsById = computed(() => new Map(clientStore.itemsActiveArray.map((item) => [item.id, item])))
const couponsById = computed(() => new Map(couponStore.itemsActiveArray.map((item) => [item.id, item])))
const typeExpenseNames = computed(() => new Map(typeExpenseStore.itemsActiveArray.map((item) => [item.id, item.name])))

const appointmentsInRange = computed(() => {
  const fromMs = selectedRange.value.from.getTime()
  const toMs = selectedRange.value.to?.getTime()
  return appointmentStore.itemsActiveArray.filter((appointment) => {
    const start = asDate(appointment.date_time)
    if (!start) return false
    const time = start.getTime()
    if (time < fromMs) return false
    if (typeof toMs === 'number' && time >= toMs) return false
    return true
  })
})

const rangeLabel = computed(() => {
  const from = selectedRange.value.from.toLocaleDateString('it-IT')
  if (!selectedRange.value.to) return `${from} in avanti`
  const toInclusive = new Date(selectedRange.value.to.getTime() - 1)
  return `${from} - ${toInclusive.toLocaleDateString('it-IT')}`
})

const customerMetrics = computed(() =>
  buildCustomerMetrics(appointmentsInRange.value, clientsById.value, treatmentsById.value, fallbackDuration.value),
)
const topCustomersBySpend = computed(() =>
  [...customerMetrics.value].sort((a, b) => b.spend - a.spend).slice(0, 8),
)
const topCustomersByMinutes = computed(() =>
  [...customerMetrics.value].sort((a, b) => b.minutes - a.minutes).slice(0, 8),
)
const topCustomersByVisits = computed(() =>
  [...customerMetrics.value].sort((a, b) => b.appointments - a.appointments).slice(0, 8),
)

const treatmentUsage = computed(() =>
  buildTreatmentUsage(appointmentsInRange.value, treatmentsById.value)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10),
)
const expenseByType = computed(() =>
  buildTypeExpenseCosts(expenseStore.itemsActiveArray, typeExpenseNames.value)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10),
)
const couponUsage = computed(() =>
  buildCouponUsage(appointmentsInRange.value, couponsById.value).sort((a, b) => b.usage - a.usage),
)
const dailyLoad = computed(() => buildDailyLoadSeries(appointmentsInRange.value, treatmentsById.value, fallbackDuration.value))

const customersSpendChart = computed(() => ({
  labels: topCustomersBySpend.value.map((item) => item.label),
  datasets: [
    {
      label: 'Spesa cliente (EUR)',
      data: topCustomersBySpend.value.map((item) => Number(item.spend.toFixed(2))),
      backgroundColor: '#e8b3be',
      borderColor: '#542c3a',
      borderWidth: 1,
    },
  ],
}))

const customerMinutesChart = computed(() => ({
  labels: topCustomersByMinutes.value.map((item) => item.label),
  datasets: [
    {
      label: 'Minuti dedicati',
      data: topCustomersByMinutes.value.map((item) => item.minutes),
      backgroundColor: '#cce5ff',
      borderColor: '#23445f',
      borderWidth: 1,
    },
  ],
}))

const treatmentUsageChart = computed(() => ({
  labels: treatmentUsage.value.map((item) => item.label),
  datasets: [
    {
      label: 'Numero appuntamenti',
      data: treatmentUsage.value.map((item) => item.count),
      backgroundColor: '#ffc9a8',
      borderColor: '#8c3f00',
      borderWidth: 1,
    },
  ],
}))

const expensePieChart = computed(() => ({
  labels: expenseByType.value.map((item) => item.label),
  datasets: [
    {
      label: 'Spese per tipo (EUR)',
      data: expenseByType.value.map((item) => Number(item.total.toFixed(2))),
      backgroundColor: ['#e8b3be', '#cce5ff', '#bde6c6', '#ffe3a3', '#d9c4ff', '#f7c6a3', '#bfe3ff'],
      borderWidth: 1,
    },
  ],
}))

const dailyLoadChart = computed(() => ({
  labels: dailyLoad.value.map((item) => item.day),
  datasets: [
    {
      label: 'Minuti prenotati',
      data: dailyLoad.value.map((item) => item.minutes),
      fill: false,
      borderColor: '#542c3a',
      backgroundColor: '#542c3a',
      tension: 0.25,
    },
  ],
}))

function euro(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
}

function dateToInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function inputToDate(value: string) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return undefined
  const date = new Date(`${normalized}T12:00:00`)
  if (Number.isNaN(date.getTime())) return undefined
  return startOfDay(date)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function startOfNextDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0)
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0)
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Statistiche" :to="{ name: 'home' }" />

    <div class="px-2 pb-4">
      <section class="card border-0 shadow-sm p-3 mb-2">
        <div class="row g-2 align-items-end">
          <div class="col-12 col-md-4">
            <label class="form-label small mb-1">Intervallo appuntamenti</label>
            <select v-model="rangePreset" class="form-select">
              <option value="current-year">Anno corrente</option>
              <option value="manual">Range manuale</option>
            </select>
          </div>
          <div v-if="rangePreset === 'manual'" class="col-6 col-md-4">
            <label class="form-label small mb-1">Dal</label>
            <input v-model="manualFrom" type="date" class="form-control" />
          </div>
          <div v-if="rangePreset === 'manual'" class="col-6 col-md-4">
            <label class="form-label small mb-1">Al</label>
            <input v-model="manualTo" type="date" class="form-control" />
          </div>
        </div>
        <small class="text-muted d-block mt-2">
          Range attivo: {{ rangeLabel }} | Record in range: {{ appointmentsInRange.length }} | Watch: {{ appointmentWatchState.activeMode }}
        </small>
      </section>

      <div class="row g-2">
        <div class="col-12 col-xl-6">
          <div class="card border-0 shadow-sm p-3 h-100">
            <h3 class="h6">Top clienti per spesa</h3>
            <Bar :data="customersSpendChart" />
          </div>
        </div>
        <div class="col-12 col-xl-6">
          <div class="card border-0 shadow-sm p-3 h-100">
            <h3 class="h6">Top clienti per tempo dedicato</h3>
            <Bar :data="customerMinutesChart" />
          </div>
        </div>
        <div class="col-12 col-xl-6">
          <div class="card border-0 shadow-sm p-3 h-100">
            <h3 class="h6">Trattamenti piu richiesti</h3>
            <Bar :data="treatmentUsageChart" />
          </div>
        </div>
        <div class="col-12 col-xl-6">
          <div class="card border-0 shadow-sm p-3 h-100">
            <h3 class="h6">Distribuzione spese per tipo</h3>
            <Pie :data="expensePieChart" />
          </div>
        </div>
        <div class="col-12">
          <div class="card border-0 shadow-sm p-3">
            <h3 class="h6">Carico giornaliero (minuti prenotati)</h3>
            <Line :data="dailyLoadChart" />
          </div>
        </div>
      </div>

      <div class="row g-2 mt-1">
        <div class="col-12 col-lg-4">
          <div class="card border-0 shadow-sm p-3 h-100">
            <h3 class="h6">Clienti top frequenza</h3>
            <ol class="small mb-0">
              <li v-for="item in topCustomersByVisits" :key="item.clientId">
                {{ item.label }} - {{ item.appointments }} appuntamenti
              </li>
            </ol>
          </div>
        </div>
        <div class="col-12 col-lg-4">
          <div class="card border-0 shadow-sm p-3 h-100">
            <h3 class="h6">Clienti top spesa</h3>
            <ol class="small mb-0">
              <li v-for="item in topCustomersBySpend" :key="item.clientId">
                {{ item.label }} - {{ euro(item.spend) }}
              </li>
            </ol>
          </div>
        </div>
        <div class="col-12 col-lg-4">
          <div class="card border-0 shadow-sm p-3 h-100">
            <h3 class="h6">Uso coupon</h3>
            <ol class="small mb-0">
              <li v-for="item in couponUsage" :key="item.couponId">
                {{ item.label }} - {{ item.usage }} usi
              </li>
            </ol>
            <p v-if="!couponUsage.length" class="small text-muted mb-0">Nessun coupon usato negli appuntamenti.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

