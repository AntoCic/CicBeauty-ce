<script setup lang="ts">
import { cicKitStore, useStoreWatch } from 'cic-kit'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import HeaderApp from '../../components/HeaderApp.vue'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { hasOperatorAccess } from '../../utils/permissions'

const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const search = ref('')
const canOperate = computed(() => hasOperatorAccess())

useStoreWatch(
  canOperate.value
    ? [
        {
          store: clientStore,
          getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' }, forceLocalSet: true },
        },
        {
          store: appointmentStore,
          getOpts: { orderBy: { fieldPath: 'date_time', directionStr: 'desc' }, forceLocalSet: true },
        },
      ]
    : [],
)

const appointmentCountByClient = computed(() => {
  const map = new Map<string, number>()
  for (const appointment of appointmentStore.itemsActiveArray) {
    const clientId = String(appointment.client_id ?? appointment.user_id ?? '').trim()
    if (!clientId) continue
    map.set(clientId, (map.get(clientId) ?? 0) + 1)
  }
  return map
})

const filteredClients = computed(() => {
  const term = search.value.trim().toLowerCase()
  const source = [...clientStore.itemsActiveArray].sort((a, b) =>
    `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`, 'it'),
  )
  if (!term) return source

  return source.filter((client) => {
    const phoneText = [client.phone_number, ...(client.phone_numbers ?? [])].join(' ')
    const emailText = [client.email, ...(client.emails ?? [])].join(' ')
    return [client.name, client.surname, phoneText, emailText, client.note]
      .map((v) => String(v ?? '').toLowerCase())
      .some((v) => v.includes(term))
  })
})

function openClientEditor(id: string) {
  router.push({ name: 'ClientEditView', params: { id } })
}

function openCreateClient() {
  router.push({ name: 'ClientEditView', params: { id: 'new' } })
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp
      title="Clienti"
      :to="{ name: 'home' }"
      v-model="search"
      search-placeholder="Cerca cliente..."
      :btn2-icon="canOperate ? 'add' : undefined"
      @btn2-click="openCreateClient"
    />

    <div class="px-2 pb-4">
      <p v-if="!canOperate" class="text-muted small mt-3">
        Permesso `OPERATORE` richiesto per visualizzare i clienti.
      </p>

      <div v-else class="vstack gap-2">
        <article
          v-for="client in filteredClients"
          :key="client.id"
          class="card border-0 shadow-sm p-3"
          @click="openClientEditor(client.id)"
        >
          <div class="d-flex justify-content-between align-items-center gap-2">
            <div class="min-w-0">
              <p class="fw-semibold mb-0 text-truncate">{{ client.name }} {{ client.surname }}</p>
              <p class="small text-muted mb-0 text-truncate">
                {{ [client.phone_number, ...(client.phone_numbers ?? [])].filter(Boolean).join(' | ') || 'Nessun telefono' }}
              </p>
              <p class="small text-muted mb-0 text-truncate">
                {{ [client.email, ...(client.emails ?? [])].filter(Boolean).join(' | ') || 'Nessuna email' }}
              </p>
            </div>
            <span class="badge text-bg-secondary">
              {{ appointmentCountByClient.get(client.id) ?? 0 }} app.
            </span>
          </div>
        </article>

        <p v-if="!filteredClients.length" class="text-muted small mt-2 mb-0">Nessun cliente trovato.</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
article {
  cursor: pointer;
}

.min-w-0 {
  min-width: 0;
}
</style>
