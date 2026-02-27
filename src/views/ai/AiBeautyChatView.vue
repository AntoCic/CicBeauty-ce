<script setup lang="ts">
import { Btn, cicKitStore, useChangeHeader, useStoreWatch } from 'cic-kit'
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HeaderApp from '../../components/HeaderApp.vue'
import CatalogCard from '../../components/CatalogCard.vue'
import { callCatalogChatAgent, type CatalogChatHistoryItem, type CatalogChatAgentResponse } from '../../call/callCatalogChatAgent'
import { parseAiError } from '../../call/_utilityApi'
import { Auth } from '../../main'
import type { Product } from '../../models/Product'
import type { Treatment } from '../../models/Treatment'
import { productStore } from '../../stores/productStore'
import { treatmentStore } from '../../stores/treatmentStore'
import { UserPermission } from '../../enums/UserPermission'

type UserMessage = {
  id: string
  role: 'user'
  text: string
}

type AssistantMessage = {
  id: string
  role: 'assistant'
  text: string
  result?: CatalogChatAgentResponse
  isError?: boolean
}

type ChatMessage = UserMessage | AssistantMessage

useChangeHeader('Beauty AI Chat', { name: 'home' })
useStoreWatch([
  {
    store: productStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
    checkLogin: false,
  },
  {
    store: treatmentStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
    checkLogin: false,
  },
])

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const hasAiPermission = computed(() => Auth?.user?.hasPermission(UserPermission.AI) ?? false)
const composer = ref('')
const isSending = ref(false)
const messages = ref<ChatMessage[]>([])
const chatBodyRef = ref<HTMLElement | null>(null)
const NO_RESULTS_MESSAGE =
  'Data la specificità della richiesta, ti consigliamo di rivolgerti a un operatore per una consulenza gratuita dedicata.'

const productById = computed(() => new Map(productStore.itemsActiveArray.map((item) => [item.id, item])))
const treatmentById = computed(() => new Map(treatmentStore.itemsActiveArray.map((item) => [item.id, item])))

function createMessageId(prefix: 'user' | 'assistant') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function isNoResultResponse(result: CatalogChatAgentResponse) {
  return (
    !result.products.length &&
    !result.treatments.length &&
    !result.finalAdvice.treatmentIds.length &&
    !result.finalAdvice.productIds.length
  )
}

function getAssistantDisplayText(result: CatalogChatAgentResponse) {
  const summary = result.finalAdvice.summary.trim()
  if (isNoResultResponse(result)) return NO_RESULTS_MESSAGE
  return summary || NO_RESULTS_MESSAGE
}

function buildAssistantHistoryText(message: AssistantMessage) {
  if (!message.result) return message.text.trim()

  const parts: string[] = []
  const summaryText = message.text.trim()
  if (summaryText) parts.push(`Risposta assistente: ${summaryText}`)

  const treatmentRows = suggestedTreatments(message.result)
  if (treatmentRows.length) {
    parts.push(
      `Trattamenti suggeriti:\n${treatmentRows.map((row, index) => `${index + 1}. ${row.item.title} - ${row.entry.reason}`).join('\n')}`,
    )
  }

  const productRows = suggestedProducts(message.result)
  if (productRows.length) {
    parts.push(
      `Prodotti suggeriti:\n${productRows.map((row, index) => `${index + 1}. ${row.item.title} - ${row.entry.reason}`).join('\n')}`,
    )
  }

  const routeTitle = message.result.finalAdvice.title.trim()
  if (routeTitle && !isNoResultResponse(message.result)) {
    parts.push(`Percorso consigliato: ${routeTitle}`)
  }

  const routeSummary = message.result.finalAdvice.summary.trim()
  if (routeSummary) parts.push(`Sintesi percorso: ${routeSummary}`)

  const frequency = message.result.finalAdvice.frequency.trim()
  if (frequency) parts.push(`Frequenza: ${frequency}`)

  const quantity = message.result.finalAdvice.quantity.trim()
  if (quantity) parts.push(`Quantita: ${quantity}`)

  return parts.join('\n').slice(0, 900).trim()
}

function buildHistoryFromMessages(source: ChatMessage[]): CatalogChatHistoryItem[] {
  return source
    .map((message) => {
      if (message.role === 'assistant') {
        return { role: message.role, text: buildAssistantHistoryText(message) }
      }
      return { role: message.role, text: message.text.trim() }
    })
    .filter((message) => message.text.trim())
    .slice(-8)
}

function shouldShowRoutePanel(result: CatalogChatAgentResponse) {
  if (isNoResultResponse(result)) return false
  return Boolean(
    result.finalAdvice.title.trim() ||
      result.finalAdvice.summary.trim() ||
      result.finalAdvice.frequency.trim() ||
      result.finalAdvice.quantity.trim() ||
      finalAdviceTreatments(result).length ||
      finalAdviceProducts(result).length,
  )
}

async function scrollToBottom() {
  await nextTick()
  if (!chatBodyRef.value) return
  chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
}

async function sendMessage(forcedText?: string) {
  if (!hasAiPermission.value) return
  if (isSending.value) return

  const text = (forcedText ?? composer.value).trim()
  if (!text) return

  const history = buildHistoryFromMessages(messages.value)
  const userMessage: UserMessage = {
    id: createMessageId('user'),
    role: 'user',
    text,
  }
  messages.value.push(userMessage)
  composer.value = ''
  await scrollToBottom()

  isSending.value = true
  try {
    const result = await callCatalogChatAgent({
      message: text,
      history,
      productLimit: 3,
      treatmentLimit: 3,
    })
    messages.value.push({
      id: createMessageId('assistant'),
      role: 'assistant',
      text: getAssistantDisplayText(result),
      result,
    })
  } catch (error) {
    messages.value.push({
      id: createMessageId('assistant'),
      role: 'assistant',
      text: parseAiError(error),
      isError: true,
    })
  } finally {
    isSending.value = false
    await scrollToBottom()
  }
}

function onComposerKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey) return
  event.preventDefault()
  void sendMessage()
}

function consumeQueryPrompt() {
  if (!hasAiPermission.value) return
  const fromQuery = String(route.query.q ?? '').trim()
  if (!fromQuery || isSending.value) return

  composer.value = fromQuery
  void sendMessage(fromQuery)

  const nextQuery = { ...route.query }
  delete nextQuery.q
  void router.replace({ query: nextQuery })
}

function suggestedProducts(result: CatalogChatAgentResponse) {
  return result.products
    .map((entry) => ({ entry, item: productById.value.get(entry.id) }))
    .filter((row): row is { entry: CatalogChatAgentResponse['products'][number]; item: Product } => Boolean(row.item))
}

function suggestedTreatments(result: CatalogChatAgentResponse) {
  return result.treatments
    .map((entry) => ({ entry, item: treatmentById.value.get(entry.id) }))
    .filter((row): row is { entry: CatalogChatAgentResponse['treatments'][number]; item: Treatment } => Boolean(row.item))
}

function finalAdviceTreatments(result: CatalogChatAgentResponse) {
  return result.finalAdvice.treatmentIds
    .map((id) => treatmentById.value.get(id))
    .filter((item): item is Treatment => Boolean(item))
}

function finalAdviceProducts(result: CatalogChatAgentResponse) {
  return result.finalAdvice.productIds
    .map((id) => productById.value.get(id))
    .filter((item): item is Product => Boolean(item))
}

watch(
  () => route.query.q,
  () => {
    consumeQueryPrompt()
  },
  { immediate: true },
)
</script>

<template>
  <div class="chat-page container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Beauty Advisor AI" :to="{ name: 'home' }" />

    <div v-if="hasAiPermission" class="chat-shell">
      <section ref="chatBodyRef" class="chat-body">
        <div v-if="!messages.length && !isSending" class="chat-empty">
          Scrivi il tuo obiettivo estetico e ti costruisco una proposta con trattamenti, prodotti e percorso consigliato.
        </div>

        <article
          v-for="message in messages"
          :key="message.id"
          class="chat-row"
          :class="message.role === 'user' ? 'chat-row--user' : 'chat-row--assistant'"
        >
          <div class="chat-bubble" :class="message.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--assistant'">
            {{ message.text }}
          </div>

          <div v-if="message.role === 'assistant' && message.result" class="result-shell">
            <div v-if="suggestedTreatments(message.result).length" class="result-block">
              <h3 class="result-title">Trattamenti suggeriti</h3>
              <div class="row g-3">
                <div
                  v-for="row in suggestedTreatments(message.result)"
                  :key="`treatment-${message.id}-${row.item.id}`"
                  class="col-12 col-md-6"
                >
                  <CatalogCard
                    :title="row.item.title"
                    :subtitle="row.item.subtitle"
                    :price="row.item.price"
                    :store-disabeld="row.item.storeDisabeld"
                    :to="{ name: 'TreatmentView', params: { id: row.item.id }, query: { categoryId: row.item.categoryIds[0] || undefined } }"
                  />
                  <p class="result-reason">{{ row.entry.reason }}</p>
                </div>
              </div>
            </div>

            <div v-if="suggestedProducts(message.result).length" class="result-block">
              <h3 class="result-title">Prodotti suggeriti</h3>
              <div class="row g-3">
                <div
                  v-for="row in suggestedProducts(message.result)"
                  :key="`product-${message.id}-${row.item.id}`"
                  class="col-12 col-md-6"
                >
                  <CatalogCard
                    :title="row.item.title"
                    :subtitle="row.item.subtitle"
                    :price="row.item.price"
                    :img-urls="row.item.imgUrls ?? []"
                    :store-disabeld="row.item.storeDisabeld"
                    :to="{ name: 'ProductView', params: { id: row.item.id }, query: { categoryId: row.item.categoryIds[0] || undefined } }"
                  />
                  <p class="result-reason">{{ row.entry.reason }}</p>
                </div>
              </div>
            </div>

            <div v-if="shouldShowRoutePanel(message.result)" class="route-panel">
              <p class="route-kicker">Beauty Route Signature</p>
              <h3 class="route-title">{{ message.result.finalAdvice.title }}</h3>
              <p class="route-summary">{{ message.result.finalAdvice.summary }}</p>
              <p v-if="message.result.finalAdvice.frequency" class="route-line">
                <strong>Frequenza:</strong> {{ message.result.finalAdvice.frequency }}
              </p>
              <p v-if="message.result.finalAdvice.quantity" class="route-line">
                <strong>Quantita:</strong> {{ message.result.finalAdvice.quantity }}
              </p>

              <div v-if="finalAdviceTreatments(message.result).length" class="route-links">
                <p class="route-links-label">Trattamenti nel percorso</p>
                <div class="d-flex flex-wrap gap-2">
                  <RouterLink
                    v-for="item in finalAdviceTreatments(message.result)"
                    :key="`route-treatment-${message.id}-${item.id}`"
                    class="route-chip"
                    :to="{ name: 'TreatmentView', params: { id: item.id }, query: { categoryId: item.categoryIds[0] || undefined } }"
                  >
                    {{ item.title }}
                  </RouterLink>
                </div>
              </div>

              <div v-if="finalAdviceProducts(message.result).length" class="route-links">
                <p class="route-links-label">Prodotti di supporto</p>
                <div class="d-flex flex-wrap gap-2">
                  <RouterLink
                    v-for="item in finalAdviceProducts(message.result)"
                    :key="`route-product-${message.id}-${item.id}`"
                    class="route-chip"
                    :to="{ name: 'ProductView', params: { id: item.id }, query: { categoryId: item.categoryIds[0] || undefined } }"
                  >
                    {{ item.title }}
                  </RouterLink>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article v-if="isSending" class="chat-row chat-row--assistant">
          <div class="chat-bubble chat-bubble--assistant loading-bubble">Analizzo la richiesta...</div>
        </article>
      </section>

      <section class="composer-shell">
        <label class="composer-label" for="advisorPrompt">Scrivi qui la tua richiesta</label>
        <textarea
          id="advisorPrompt"
          v-model="composer"
          class="form-control composer-input"
          rows="3"
          placeholder="Es. Pelle sensibile con macchie leggere, voglio un percorso 4 settimane"
          @keydown="onComposerKeydown"
        />
        <div class="composer-actions">
          <small class="text-muted">Invio con Enter, nuova riga con Shift+Enter</small>
          <Btn
            type="button"
            color="dark"
            icon="send"
            :loading="isSending"
            :disabled="isSending || !composer.trim()"
            @click="sendMessage()"
          >
            Invia
          </Btn>
        </div>
      </section>
    </div>

    <div v-else class="chat-shell">
      <section class="chat-body d-flex align-items-center justify-content-center">
        <p class="chat-empty mb-0">Funzionalita AI non disponibile per il tuo utente.</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.chat-shell {
  width: min(1040px, 100%);
  margin: 0 auto;
  padding: 0.9rem 0.8rem 1.2rem;
  display: grid;
  gap: 0.85rem;
}

.chat-body {
  min-height: 52vh;
  max-height: 64vh;
  overflow-y: auto;
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 2px;
  padding: 0.9rem;
  background: rgba(255, 255, 255, 0.7);
}

.chat-empty {
  text-align: center;
  color: rgba(61, 35, 44, 0.74);
  font-size: 0.9rem;
  line-height: 1.5;
  padding: 1.8rem 0.6rem;
}

.chat-row {
  margin-bottom: 0.8rem;
}

.chat-row--user {
  display: flex;
  justify-content: flex-end;
}

.chat-row--assistant {
  display: block;
}

.chat-bubble {
  max-width: min(760px, 100%);
  padding: 0.6rem 0.8rem;
  border-radius: 2px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.chat-bubble--user {
  background: #542c3a;
  color: #fff;
  border-top-right-radius: 0;
}

.chat-bubble--assistant {
  border: 1px solid rgba(84, 44, 58, 0.24);
  background: rgba(255, 255, 255, 0.92);
  color: #3d232c;
  border-top-left-radius: 0;
}

.loading-bubble {
  animation: pulse 1.4s ease-in-out infinite;
}

.result-shell {
  margin-top: 0.7rem;
  display: grid;
  gap: 0.95rem;
}

.result-block {
  padding: 0.75rem;
  border: 1px solid rgba(84, 44, 58, 0.16);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.64);
}

.result-title {
  margin: 0 0 0.65rem;
  font-size: 0.86rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4b2935;
}

.result-reason {
  margin: 0.45rem 0 0;
  font-size: 0.82rem;
  color: rgba(47, 47, 47, 0.85);
  line-height: 1.45;
}

.route-panel {
  padding: 0.9rem;
  border-radius: 2px;
  background: linear-gradient(135deg, rgba(84, 44, 58, 0.92), rgba(119, 62, 82, 0.92));
  color: rgba(255, 255, 255, 0.96);
}

.route-kicker {
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.82;
}

.route-title {
  margin: 0.24rem 0 0.42rem;
  font-size: 1.06rem;
  font-weight: 700;
}

.route-summary {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.55;
}

.route-line {
  margin: 0.34rem 0 0;
  font-size: 0.82rem;
}

.route-links {
  margin-top: 0.72rem;
}

.route-links-label {
  margin: 0 0 0.4rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.78;
}

.route-chip {
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #fff;
  padding: 0.24rem 0.46rem;
  border-radius: 2px;
  font-size: 0.74rem;
  transition: background 0.2s ease;
}

.route-chip:hover {
  background: rgba(255, 255, 255, 0.12);
}

.composer-shell {
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 2px;
  padding: 0.78rem;
  background: rgba(255, 255, 255, 0.82);
  display: grid;
  gap: 0.5rem;
}

.composer-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #4b2935;
}

.composer-input {
  resize: vertical;
  min-height: 92px;
}

.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.72;
  }
  50% {
    opacity: 1;
  }
}

@media (max-width: 767.98px) {
  .chat-shell {
    padding: 0.6rem 0.35rem 1rem;
  }

  .chat-body {
    max-height: 60vh;
    padding: 0.72rem;
  }

  .composer-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .chat-bubble {
    max-width: 100%;
  }
}
</style>
