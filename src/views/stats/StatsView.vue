<script setup lang="ts">
import { cicKitStore, useStoreWatch } from 'cic-kit'
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js'
import { computed } from 'vue'
import { Bar, Line, Pie } from 'vue-chartjs'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { couponStore } from '../../stores/couponStore'
import { expenseStore } from '../../stores/expenseStore'
import { treatmentStore } from '../../stores/treatmentStore'
import { typeExpenseStore } from '../../stores/typeExpenseStore'
import {
  buildCouponUsage,
  buildCustomerMetrics,
  buildDailyLoadSeries,
  buildTreatmentUsage,
  buildTypeExpenseCosts,
} from '../../utils/businessStats'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Legend, Tooltip)

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())

useStoreWatch([
  { store: appointmentStore, getOpts: {  } },
  { store: expenseStore, getOpts: {  } },
  { store: couponStore, getOpts: {  } },
])

const fallbackDuration = computed(() => 60)
const treatmentsById = computed(() => new Map(treatmentStore.itemsActiveArray.map((item) => [item.id, item])))
const clientsById = computed(() => new Map(clientStore.itemsActiveArray.map((item) => [item.id, item])))
const couponsById = computed(() => new Map(couponStore.itemsActiveArray.map((item) => [item.id, item])))
const typeExpenseNames = computed(() => new Map(typeExpenseStore.itemsActiveArray.map((item) => [item.id, item.name])))

const customerMetrics = computed(() =>
  buildCustomerMetrics(appointmentStore.itemsActiveArray, clientsById.value, treatmentsById.value, fallbackDuration.value),
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
  buildTreatmentUsage(appointmentStore.itemsActiveArray, treatmentsById.value)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10),
)
const expenseByType = computed(() =>
  buildTypeExpenseCosts(expenseStore.itemsActiveArray, typeExpenseNames.value)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10),
)
const couponUsage = computed(() =>
  buildCouponUsage(appointmentStore.itemsActiveArray, couponsById.value).sort((a, b) => b.usage - a.usage),
)
const dailyLoad = computed(() => buildDailyLoadSeries(appointmentStore.itemsActiveArray, treatmentsById.value, fallbackDuration.value))

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
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Statistiche" :to="{ name: 'home' }" />

    <div class="px-2 pb-4">
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

