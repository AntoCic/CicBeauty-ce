<script setup lang="ts">
import { VCodeBlock as CodeBlock } from '@wdns/vue-code-block'
import '@wdns/vue-code-block/dist/scss/main.scss'
import { Btn, cicKitStore, toast, useChangeHeader } from 'cic-kit'
import { computed, ref } from 'vue'
import HeaderApp from '../../components/HeaderApp.vue'
import { callMarketingAgent, type MarketingAgentResponse } from '../../call/callMarketingAgent'
import { callProductChatAgent, type ProductChatAgentResponse } from '../../call/callProductChatAgent'
import { parseAiError } from '../../call/_utilityApi'

useChangeHeader('Demo AI Agents', { name: 'home' })

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())

const marketingTitle = ref('')
const marketingContext = ref('')
const marketingOutput = ref<MarketingAgentResponse | null>(null)
const isRunningMarketing = ref(false)

const productMessage = ref('')
const productLimit = ref(3)
const productOutput = ref<ProductChatAgentResponse>({ recommended: [] })
const isRunningProductChat = ref(false)

const marketingOutputJson = computed(() => JSON.stringify(marketingOutput.value ?? {}, null, 2))
const productOutputJson = computed(() => JSON.stringify(productOutput.value, null, 2))

const marketingCode = `const response = await callMarketingAgent({
  title: "Rituale viso illuminante",
  context: "Per pelli spente, con focus su glow naturale"
})

console.log(response.subtitle)
console.log(response.description)`

const productCode = `const response = await callProductChatAgent({
  message: "Cerco un siero idratante leggero per pelle sensibile",
  limit: 3
})

console.log(response.recommended)`

const seedProductExample = `{
  "title": "Siero Lenitivo Hydra",
  "subtitle": "Idratazione quotidiana per pelli sensibili",
  "description": "Formula leggera con attivi calmanti.",
  "tag": ["idratazione", "pelle sensibile", "viso"],
  "storeVisible": true
}`

async function runMarketingAgent() {
  const title = marketingTitle.value.trim()
  if (!title) {
    toast.warning('Inserisci un titolo prima di generare.')
    return
  }

  isRunningMarketing.value = true
  try {
    const response = await callMarketingAgent({
      title,
      context: marketingContext.value.trim() || undefined,
    })
    marketingOutput.value = response
    toast.success('Contenuto marketing generato')
  } catch (error) {
    console.error(error)
    toast.error(parseAiError(error))
  } finally {
    isRunningMarketing.value = false
  }
}

async function runProductChatAgent() {
  const message = productMessage.value.trim()
  if (!message) {
    toast.warning('Inserisci una richiesta prodotto.')
    return
  }

  isRunningProductChat.value = true
  try {
    const response = await callProductChatAgent({
      message,
      limit: Number.isInteger(productLimit.value) ? productLimit.value : 3,
    })
    productOutput.value = response
    toast.success('Consigli prodotto generati')
  } catch (error) {
    console.error(error)
    toast.error(parseAiError(error))
  } finally {
    isRunningProductChat.value = false
  }
}

function runMarketingCodeBlock() {
  void runMarketingAgent()
}

function runProductCodeBlock() {
  void runProductChatAgent()
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Demo Firebase AI Logic" :to="{ name: 'home' }" />

    <div class="container py-3 py-md-4">
      <div class="row g-3">
        <div class="col-12 col-xl-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex flex-column gap-3">
              <div>
                <h2 class="h5 mb-1">Marketing Agent</h2>
                <p class="text-muted small mb-0">Genera sottotitolo e descrizione per trattamenti.</p>
              </div>

              <div>
                <label class="form-label">Title</label>
                <input v-model="marketingTitle" class="form-control" placeholder="Es. Rituale Viso Detox" />
              </div>

              <div>
                <label class="form-label">Context (opzionale)</label>
                <textarea
                  v-model="marketingContext"
                  class="form-control"
                  rows="3"
                  placeholder="Pubblico, beneficio principale, stagionalità..."
                />
              </div>

              <div class="d-flex gap-2 flex-wrap">
                <Btn
                  icon="wand_stars"
                  color="dark"
                  class="gemini-btn"
                  :loading="isRunningMarketing"
                  :disabled="isRunningMarketing"
                  @click="runMarketingAgent"
                >
                  Genera
                </Btn>
              </div>

              <div class="output-shell">
                <div class="small fw-semibold mb-1">Output JSON live</div>
                <pre class="output-json mb-0">{{ marketingOutputJson }}</pre>
              </div>

              <CodeBlock
                lang="typescript"
                label="Callable sample"
                :code="marketingCode"
                :run-tab="true"
                run-text="Esegui"
                @run="runMarketingCodeBlock"
              />
            </div>
          </div>
        </div>

        <div class="col-12 col-xl-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex flex-column gap-3">
              <div>
                <h2 class="h5 mb-1">Product Chat Agent</h2>
                <p class="text-muted small mb-0">Cerca i migliori prodotti dalla collection Firestore.</p>
              </div>

              <div>
                <label class="form-label">Message</label>
                <textarea
                  v-model="productMessage"
                  class="form-control"
                  rows="3"
                  placeholder="Es. Ho pelle sensibile e cerco idratazione leggera"
                />
              </div>

              <div>
                <label class="form-label">Limit risultati (1-3)</label>
                <input v-model.number="productLimit" class="form-control" type="number" min="1" max="3" />
              </div>

              <div class="d-flex gap-2 flex-wrap">
                <Btn
                  icon="wand_stars"
                  color="dark"
                  class="gemini-btn"
                  :loading="isRunningProductChat"
                  :disabled="isRunningProductChat"
                  @click="runProductChatAgent"
                >
                  Cerca prodotti
                </Btn>
              </div>

              <div class="output-shell">
                <div class="small fw-semibold mb-1">UUID consigliati</div>
                <pre class="output-json mb-0">{{ productOutputJson }}</pre>
              </div>

              <CodeBlock
                lang="typescript"
                label="Callable sample"
                :code="productCode"
                :run-tab="true"
                run-text="Esegui"
                @run="runProductCodeBlock"
              />
            </div>
          </div>
        </div>

        <div class="col-12">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <h3 class="h6 mb-2">Esempio documento Firestore products</h3>
              <CodeBlock lang="json" label="products/{id}" :code="seedProductExample" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.output-shell {
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.85);
  padding: 10px;
}

.output-json {
  max-height: 200px;
  overflow: auto;
  font-size: 0.8rem;
  color: #2c2135;
}

.gemini-btn {
  border-color: transparent !important;
  background:
    linear-gradient(rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.94)) padding-box,
    linear-gradient(115deg, #4285f4, #34a853, #fbbc05, #ea4335, #4285f4) border-box;
  background-size: 100% 100%, 250% 250%;
  animation: geminiBorderFlow 7s linear infinite;
}

.gemini-btn:deep(.material-symbols-outlined) {
  background: linear-gradient(110deg, #4285f4, #34a853, #fbbc05, #ea4335, #4285f4);
  background-size: 250% 250%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: geminiIconFlow 4.5s linear infinite;
}

@keyframes geminiBorderFlow {
  0% {
    background-position: 0 0, 0% 50%;
  }
  100% {
    background-position: 0 0, 200% 50%;
  }
}

@keyframes geminiIconFlow {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gemini-btn,
  .gemini-btn:deep(.material-symbols-outlined) {
    animation: none;
  }
}
</style>
