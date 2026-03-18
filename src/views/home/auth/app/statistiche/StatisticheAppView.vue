<script setup lang="ts">
import { cicKitStore } from 'cic-kit'
import { computed, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import AppointmentWatchRangePicker from '../../../../../components/appointments/AppointmentWatchRangePicker.vue'
import HeaderApp from '../../../../../components/headers/HeaderApp.vue'
import { useAppointmentWatchManager } from '../../../../../composables/useAppointmentWatchManager'
import StatisticheTabs from './components/StatisticheTabs.vue'
import { setStatisticheSharedRange, statisticheSharedState } from './statisticheSharedState'

type StatsTab = 'guadagni' | 'clienti' | 'trattamenti'

const STATS_WATCH_REASON = 'stats-shared-view'
const route = useRoute()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const { activateRangeWatch, releaseAppointmentWatch } = useAppointmentWatchManager()

const activeTab = computed<StatsTab>(() => {
  const name = String(route.name ?? '')
  if (name === 'StatsClientiView') return 'clienti'
  if (name === 'StatsTrattamentiView') return 'trattamenti'
  return 'guadagni'
})

function onRangeChange(range: { from: Date; to?: Date }) {
  setStatisticheSharedRange({
    from: range.from,
    to: range.to,
  })

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
      <AppointmentWatchRangePicker
        :initial-from="statisticheSharedState.from"
        :initial-to="statisticheSharedState.to"
        @change="onRangeChange"
      />

      <StatisticheTabs :active="activeTab" />

      <RouterView />
    </div>
  </div>
</template>
