<script setup lang="ts">
import { cicKitStore, loading, toast } from 'cic-kit'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import HeaderApp from '../../../../../components/headers/HeaderApp.vue'
import { appointmentStore } from '../../../../../stores/appointmentStore'
import { endOfDay, startOfDay } from '../../../../../utils/calendar'
import StatisticheTabs from './components/StatisticheTabs.vue'
import { setStatisticheSharedRange, statisticheSharedState } from './statisticheSharedState'

type StatsTab = 'guadagni' | 'clienti' | 'appuntamenti'

const STATS_DOWNLOAD_ALL_LOADING_KEY = 'loading:stats-download-all'
const route = useRoute()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const fromInput = ref(toInputDate(statisticheSharedState.from))
const toInput = ref(toInputDate(statisticheSharedState.to))
const isDownloadingAll = ref(false)

const activeTab = computed<StatsTab>(() => {
  const name = String(route.name ?? '')
  if (name === 'StatsClientiView') return 'clienti'
  if (name === 'StatsAppuntamentiView') return 'appuntamenti'
  return 'guadagni'
})

const appliedRangeLabel = computed(() => {
  const from = statisticheSharedState.from.toLocaleDateString('it-IT')
  const to = statisticheSharedState.to?.toLocaleDateString('it-IT') ?? 'senza fine'
  return `${from} - ${to}`
})

function applyFilters() {
  const from = parseInputDateAtStart(fromInput.value) ?? statisticheSharedState.from
  const to = parseInputDateAtEnd(toInput.value)
  const normalizedTo = to && to.getTime() >= from.getTime() ? to : undefined

  fromInput.value = toInputDate(from)
  toInput.value = toInputDate(normalizedTo)

  setStatisticheSharedRange({
    from,
    to: normalizedTo,
  })
}

function applyShortcut(months: number) {
  const today = startOfDay(new Date())
  const from = startOfDay(new Date(today.getFullYear(), today.getMonth() - months, today.getDate()))
  fromInput.value = toInputDate(from)
  toInput.value = ''
  applyFilters()
}

async function downloadAllAppointments() {
  if (isDownloadingAll.value) return

  isDownloadingAll.value = true
  loading.on(STATS_DOWNLOAD_ALL_LOADING_KEY)
  try {
    await appointmentStore.get({
      dateTime: {
        from: new Date(1970, 0, 1, 0, 0, 0, 0),
      },
    })
    toast.success(`Scaricati ${appointmentStore.itemsActiveArray.length} appuntamenti`)
  } catch (error) {
    console.error('[stats] download all appointments failed', error)
    toast.error('Errore durante il download completo degli appuntamenti')
  } finally {
    isDownloadingAll.value = false
    loading.off(STATS_DOWNLOAD_ALL_LOADING_KEY)
  }
}

function parseInputDateAtStart(value: string) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return undefined
  const date = new Date(`${normalized}T12:00:00`)
  if (Number.isNaN(date.getTime())) return undefined
  return startOfDay(date)
}

function parseInputDateAtEnd(value: string) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return undefined
  const date = new Date(`${normalized}T12:00:00`)
  if (Number.isNaN(date.getTime())) return undefined
  return endOfDay(date)
}

function toInputDate(date?: Date) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Statistiche" :to="{ name: 'home' }" />

    <div class="px-2 pb-4">
      <section class="card border-0 shadow-sm p-3 mb-2">
        <div class="d-flex flex-wrap gap-2 align-items-end">
          <div class="flex-grow-1">
            <label for="statsFilterFrom" class="form-label small mb-1">Da</label>
            <input id="statsFilterFrom" v-model="fromInput" type="date" class="form-control" />
          </div>
          <div class="flex-grow-1">
            <label for="statsFilterTo" class="form-label small mb-1">A</label>
            <input id="statsFilterTo" v-model="toInput" type="date" class="form-control" />
          </div>
          <button type="button" class="btn btn-primary d-inline-flex align-items-center gap-1" @click="applyFilters">
            <span class="material-symbols-outlined" aria-hidden="true">filter_alt</span>
            Applica filtri
          </button>
        </div>

        <div class="d-flex flex-wrap gap-2 mt-2">
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="applyShortcut(6)">Ultimi 6 mesi</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="applyShortcut(12)">Ultimo anno</button>
          <button
            type="button"
            class="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1"
            :disabled="isDownloadingAll"
            @click="downloadAllAppointments"
          >
            <span class="material-symbols-outlined" aria-hidden="true">download</span>
            Scarica tutti gli appuntamenti
          </button>
          <span class="badge text-bg-light border ms-auto">Filtro attivo: {{ appliedRangeLabel }}</span>
        </div>
      </section>

      <StatisticheTabs :active="activeTab" />

      <RouterView />
    </div>
  </div>
</template>
