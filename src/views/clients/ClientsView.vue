<script setup lang="ts">
import { Btn, cicKitStore } from 'cic-kit'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { useAppointmentWatchManager } from '../../composables/useAppointmentWatchManager'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import ClientPersonCard from './components/ClientPersonCard.vue'
import { appointmentClientId, buildClientAppointmentSummary } from './clientAppointmentUtils'
import { asDate } from '../../utils/date'

const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const search = ref('')
const CLIENTS_WATCH_SUSPEND_REASON = 'clients-view'
const { suspendAppointmentWatch, releaseAppointmentWatch } = useAppointmentWatchManager()

suspendAppointmentWatch(CLIENTS_WATCH_SUSPEND_REASON)
onBeforeUnmount(() => {
  releaseAppointmentWatch(CLIENTS_WATCH_SUSPEND_REASON)
})

const appointmentSummaryByClient = computed(() => {
  const grouped = new Map<string, (typeof appointmentStore.itemsActiveArray)[number][]>()
  for (const appointment of appointmentStore.itemsActiveArray) {
    const clientId = appointmentClientId(appointment)
    if (!clientId) continue
    if (!grouped.has(clientId)) {
      grouped.set(clientId, [])
    }
    grouped.get(clientId)?.push(appointment)
  }

  const map = new Map<
    string,
    ReturnType<typeof buildClientAppointmentSummary>
  >()
  for (const [clientId, appointments] of grouped.entries()) {
    map.set(clientId, buildClientAppointmentSummary(appointments))
  }

  return map
})

const filteredClientCards = computed(() => {
  const term = search.value.trim().toLowerCase()
  const source = [...clientStore.itemsActiveArray].sort((a, b) =>
    `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`, 'it'),
  )
  const filtered = term
    ? source.filter((client) =>
        [client.name, client.surname, client.note]
          .map((v) => String(v ?? '').toLowerCase())
          .some((v) => v.includes(term)),
      )
    : source

  return filtered.map((client) => ({
    client,
    summary: appointmentSummaryByClient.value.get(client.id),
  }))
})

function openClientEditor(id: string) {
  router.push({ name: 'ClientEditView', params: { id } })
}

function openCreateClient() {
  router.push({ name: 'ClientEditView', params: { id: 'new' } })
}

function appointmentMiniLabel(appointment?: { date_time?: unknown }) {
  const date = asDate(appointment?.date_time)
  if (!date) return '--'
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp
      title="Clienti"
      :to="{ name: 'home' }"
    >
      <div class="app-header__tools">
        <input
          v-model="search"
          class="app-header__search"
          type="search"
          placeholder="Cerca cliente..."
          aria-label="Cerca cliente"
        />
        <Btn
          icon="add"
          variant="ghost"
          @click="openCreateClient"
        />
      </div>
    </HeaderApp>

    <div class="px-2 pb-4">
      <div class="vstack gap-2">
        <p class="client-list-legend mb-0">
          <span>&#x25C0; precedente</span>
          <span>&#x25B6; prossimo</span>
          <span>&#x1F4C5; oggi</span>
          <span>&#x2705; consenso WA</span>
        </p>

        <article
          v-for="{ client, summary } in filteredClientCards"
          :key="client.id"
          class="client-row"
          @click="openClientEditor(client.id)"
        >
          <ClientPersonCard
            :name="client.name"
            :surname="client.surname"
            :phone-number="client.phone_number"
            :note="client.note"
            :consenso-promozioni-whatsapp="client.consenso_promozioni_whatsapp"
            :compact="true"
          >
            <div class="client-row__appointments">
              <span class="client-row__appointment client-row__appointment--prev" title="Appuntamento precedente">
                <span aria-hidden="true">&#x25C0;</span>
                <span>{{ appointmentMiniLabel(summary?.previous) }}</span>
              </span>
              <span class="client-row__appointment client-row__appointment--next" title="Prossimo appuntamento">
                <span aria-hidden="true">&#x25B6;</span>
                <span>{{ appointmentMiniLabel(summary?.next) }}</span>
              </span>
              <span
                v-if="summary?.hasTodayAppointment"
                class="client-row__appointment client-row__appointment--today"
                title="Appuntamento oggi"
                aria-label="Appuntamento oggi"
              >
                <span aria-hidden="true">&#x1F4C5;</span>
              </span>
            </div>
          </ClientPersonCard>
        </article>

        <p v-if="!filteredClientCards.length" class="text-muted small mt-2 mb-0">Nessun cliente trovato.</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.client-row {
  cursor: pointer;
}

.client-list-legend {
  display: flex;
  align-items: center;
  gap: 0.62rem;
  font-size: 0.66rem;
  color: #7a5a67;
  padding-left: 0.1rem;
}

.client-row__appointments {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.42rem;
  white-space: nowrap;
}

.client-row__appointment {
  display: inline-flex;
  align-items: center;
  gap: 0.14rem;
  font-size: 0.65rem;
  line-height: 1;
  color: #6b4a58;
  border-radius: 0.34rem;
  padding: 0.2rem 0.32rem;
}

.client-row__appointment--prev {
  background: #eef3ff;
  color: #445d95;
}

.client-row__appointment--next {
  background: #edf9f1;
  color: #2f7450;
}

.client-row__appointment--today {
  font-size: 0.74rem;
  padding: 0;
  border-radius: 0;
  background: transparent;
}
</style>

