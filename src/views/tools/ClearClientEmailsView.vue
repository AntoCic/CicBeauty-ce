<script setup lang="ts">
import { Btn, cicKitStore, toast, useStoreWatch } from 'cic-kit'
import { computed, ref } from 'vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { clientStore } from '../../stores/clientStore'

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const isRunning = ref(false)

useStoreWatch([{ store: clientStore, getOpts: {} }])

const clientsWithEmailCount = computed(() => {
  return clientStore.itemsActiveArray.filter((client) => String(client.email ?? '').trim().length > 0).length
})

async function clearAllClientEmails() {
  if (isRunning.value) return
  isRunning.value = true
  try {
    const clientsWithEmail = clientStore.itemsActiveArray.filter((client) => String(client.email ?? '').trim())
    for (const client of clientsWithEmail) {
      await client.update({
        email: '',
      })
    }
    toast.success(`Email cancellate per ${clientsWithEmail.length} clienti`)
  } catch (error) {
    console.error(error)
    toast.error('Errore durante la cancellazione email clienti')
  } finally {
    isRunning.value = false
  }
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Reset Email Clienti" :to="{ name: 'home' }" />

    <div class="clear-email-wrap px-2 pb-4">
      <section class="card border-0 shadow-sm p-3 p-md-4">
        <p class="small text-muted mb-2">
          Questa azione cancella solo il campo email in tutti i clienti.
        </p>
        <p class="small mb-3">
          Clienti con email valorizzata: <strong>{{ clientsWithEmailCount }}</strong>
        </p>

        <Btn
          type="button"
          color="danger"
          icon="email_off"
          :loading="isRunning"
          :disabled="isRunning || clientsWithEmailCount === 0"
          @click="clearAllClientEmails"
        >
          Cancella tutte le email clienti
        </Btn>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.clear-email-wrap {
  max-width: 760px;
  margin-inline: auto;
}
</style>

