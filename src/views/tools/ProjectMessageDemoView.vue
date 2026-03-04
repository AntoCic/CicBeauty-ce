<script setup lang="ts">
import { Btn, cicKitStore, defaultUserPermission, toast, useChangeHeader } from 'cic-kit'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { hub } from '../../call/hub'
import { defaultCatch } from '../../call/_utilityApi'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { Auth } from '../../main'

type ProjectMessageForm = {
  typeMessage: string
  title: string
  message: string
  sendPush: boolean
  payloadJson: string
}

const HUBCORTEX_TARGET_ENDPOINT = 'https://europe-west1-hubcortex-33389.cloudfunctions.net/ingestProjectMessage'

useChangeHeader('Project Message Demo', { name: 'home' })

const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const isSending = ref(false)
const responseJson = ref('')

const hasBetaFeatures = computed(() => Auth?.user?.hasPermission(defaultUserPermission.BETA_FEATURES) ?? false)

watch(
  hasBetaFeatures,
  (isAllowed) => {
    if (isAllowed) return
    void router.replace({ name: 'home' })
  },
  { immediate: true },
)

const form = reactive<ProjectMessageForm>({
  typeMessage: 'info',
  title: 'Nuova versione rilasciata',
  message: 'Deploy completato con successo da CicBeauty CE',
  sendPush: true,
  payloadJson: '{\n  "env": "staging",\n  "origin": "toolbar-demo"\n}',
})

async function submitProjectMessage() {
  const message = form.message.trim()
  if (!message) {
    toast.error('Il campo messaggio e obbligatorio')
    return
  }

  let payload: Record<string, unknown> | undefined
  if (form.payloadJson.trim()) {
    try {
      const parsed = JSON.parse(form.payloadJson)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        toast.error('payload JSON deve essere un oggetto')
        return
      }
      payload = parsed as Record<string, unknown>
    } catch {
      toast.error('payload JSON non valido')
      return
    }
  }

  isSending.value = true
  responseJson.value = ''

  try {
    const response = await hub.send(normalizeOptional(form.typeMessage) || 'info', {
      title: normalizeOptional(form.title),
      message,
      sendPush: form.sendPush,
      payload,
    })

    responseJson.value = JSON.stringify(response, null, 2)
    toast.success('Messaggio inviato')
  } catch (error) {
    console.error(error)
    const normalized = defaultCatch(error, 'Errore durante invio messaggio')
    responseJson.value = JSON.stringify({ ok: false, error: normalized.message }, null, 2)
  } finally {
    isSending.value = false
  }
}

function normalizeOptional(value: string) {
  const normalized = String(value ?? '').trim()
  return normalized || undefined
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Project Message Demo" :to="{ name: 'home' }" />

    <div class="project-message-wrapper mx-auto py-3 py-md-4">
      <section class="card border-0 shadow-sm p-3 p-md-4 mb-3">
        <h2 class="h6 text-uppercase mb-1">Invio Messaggio HubCortex</h2>
        <p class="small text-muted mb-3">
          Demo per inviare un messaggio al progetto target usando la Cloud Function
          <code>publishProjectMessage</code>.
        </p>
        <p class="small endpoint-note mb-0">
          Endpoint target: <code>{{ HUBCORTEX_TARGET_ENDPOINT }}</code>
        </p>
      </section>

      <section class="card border-0 shadow-sm p-3 p-md-4 mb-3">
        <form class="row g-3" @submit.prevent="submitProjectMessage">
          <div class="col-12 col-md-4">
            <label class="form-label">typeMessage</label>
            <input v-model="form.typeMessage" class="form-control" type="text" placeholder="info" />
          </div>

          <div class="col-12 col-md-8">
            <label class="form-label">title</label>
            <input v-model="form.title" class="form-control" type="text" placeholder="Titolo messaggio" />
          </div>

          <div class="col-12">
            <label class="form-label">message *</label>
            <textarea
              v-model="form.message"
              class="form-control"
              rows="3"
              placeholder="Testo del messaggio"
              required
            />
          </div>

          <div class="col-12 col-md-4 d-flex align-items-end">
            <div class="form-check mb-2">
              <input id="sendPush" v-model="form.sendPush" class="form-check-input" type="checkbox" />
              <label class="form-check-label" for="sendPush">sendPush</label>
            </div>
          </div>

          <div class="col-12">
            <label class="form-label">payload (JSON oggetto opzionale)</label>
            <textarea
              v-model="form.payloadJson"
              class="form-control font-monospace"
              rows="6"
              placeholder="{ &quot;env&quot;: &quot;production&quot; }"
            />
          </div>

          <div class="col-12 d-flex justify-content-end">
            <Btn type="submit" color="dark" icon="send" :loading="isSending" :disabled="isSending">
              Invia messaggio
            </Btn>
          </div>
        </form>
      </section>

      <section class="card border-0 shadow-sm p-3 p-md-4">
        <h3 class="h6 mb-2">Risposta</h3>
        <pre class="response-box mb-0">{{ responseJson || 'Nessuna chiamata eseguita.' }}</pre>
      </section>
    </div>
  </div>
</template>

<style scoped>
.project-message-wrapper {
  max-width: 920px;
}

.endpoint-note {
  padding: 0.5rem 0.65rem;
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.72);
}

.response-box {
  min-height: 140px;
  max-height: 420px;
  overflow: auto;
  background: #171717;
  color: #f5f5f5;
  border-radius: 2px;
  padding: 0.75rem;
  font-size: 0.82rem;
}
</style>

