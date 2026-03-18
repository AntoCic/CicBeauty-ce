<script setup lang="ts">
import { cicKitStore } from 'cic-kit'
import { computed, onBeforeUnmount } from 'vue'
import AppointmentWatchRangePicker from '../../components/appointments/AppointmentWatchRangePicker.vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { buildDefaultAppointmentWatchRange, useAppointmentWatchManager } from '../../composables/useAppointmentWatchManager'
import { appointmentStore } from '../../stores/appointmentStore'
import { asDate } from '../../utils/date'

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const STATS_WATCH_REASON = 'stats-view'

const initialFromDate = buildDefaultAppointmentWatchRange(new Date()).from

type AppointmentWatchRange = {
  from: Date
  to?: Date
}

const { activateRangeWatch, releaseAppointmentWatch } = useAppointmentWatchManager()

const downloadedTreatmentsCount = computed(() => appointmentStore.itemsActiveArray.length)
const downloadedAppointmentDates = computed(() => {
  return appointmentStore.itemsActiveArray
    .map((appointment) => asDate(appointment.date_time))
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => a.getTime() - b.getTime())
    .map((date) => date.toLocaleDateString('it-IT'))
})

function onRangeChange(range: AppointmentWatchRange) {
  activateRangeWatch({
    from: range.from,
    to: range.to,
    reason: STATS_WATCH_REASON,
  })
}

onBeforeUnmount(() => {
  releaseAppointmentWatch(STATS_WATCH_REASON)
})
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Statistiche" :to="{ name: 'home' }" />

    <div class="px-2 pb-4">
      <AppointmentWatchRangePicker :initial-from="initialFromDate" @change="onRangeChange" />

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

