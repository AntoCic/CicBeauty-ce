<script setup lang="ts">
import { cicKitStore } from 'cic-kit'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { buildDefaultAppointmentWatchRange, useAppointmentWatchManager } from '../../composables/useAppointmentWatchManager'
import { appointmentStore } from '../../stores/appointmentStore'
import { startOfDay } from '../../utils/calendar'
import { asDate } from '../../utils/date'

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const STATS_WATCH_REASON = 'stats-view'

const initialFromDate = buildDefaultAppointmentWatchRange(new Date()).from
const fromDateInput = ref(toInputDate(initialFromDate))

const { activateRangeWatch, releaseAppointmentWatch } = useAppointmentWatchManager()

const fromDate = computed(() => {
  return parseInputDate(fromDateInput.value) ?? initialFromDate
})

const downloadedTreatmentsCount = computed(() => appointmentStore.itemsActiveArray.length)
const downloadedAppointmentDates = computed(() => {
  return appointmentStore.itemsActiveArray
    .map((appointment) => asDate(appointment.date_time))
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => a.getTime() - b.getTime())
    .map((date) => date.toLocaleDateString('it-IT'))
})

watch(
  fromDate,
  (value) => {
    activateRangeWatch({
      from: value,
      reason: STATS_WATCH_REASON,
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  releaseAppointmentWatch(STATS_WATCH_REASON)
})

function toInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseInputDate(value: string) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return undefined
  const date = new Date(`${normalized}T12:00:00`)
  if (Number.isNaN(date.getTime())) return undefined
  return startOfDay(date)
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Statistiche" :to="{ name: 'home' }" />

    <div class="px-2 pb-4">
      <section class="card border-0 shadow-sm p-3 mb-2">
        <label for="statsFromDate" class="form-label small mb-1">Da che data devo scaricare</label>
        <input id="statsFromDate" v-model="fromDateInput" type="date" class="form-control" />
      </section>

      <section class="card border-0 shadow-sm p-3">
        <p class="small text-muted mb-1">Trattamenti attualmente scaricati</p>
        <strong class="display-6">{{ downloadedTreatmentsCount }}</strong>

        <div class="mt-3">
          <p class="small text-muted mb-1">Appuntamenti scaricati (date)</p>
          <ul v-if="downloadedAppointmentDates.length" class="small mb-0 ps-3">
            <li v-for="(date, index) in downloadedAppointmentDates" :key="`${date}-${index}`">{{ date }}</li>
          </ul>
          <p v-else class="small text-muted mb-0">Nessun appuntamento scaricato.</p>
        </div>
      </section>
    </div>
  </div>
</template>

