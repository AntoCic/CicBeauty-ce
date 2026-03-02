<script setup lang="ts">
import { Btn } from 'cic-kit'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { UserPermission } from '../../enums/UserPermission'
import { Auth } from '../../main'

const router = useRouter()
const advisorPrompt = ref('')

const canUseAiChat = computed(
  () =>
    (Auth?.user?.hasPermission(UserPermission.AI) ?? false) &&
    (Auth?.user?.hasPermission(UserPermission.AI_BETA_FEATURES) ?? false),
)

function sendToAdvisor() {
  if (!canUseAiChat.value) return
  const text = advisorPrompt.value.trim()
  if (!text) return
  void router.push({ name: 'AiBeautyChatView', query: { q: text } })
}

function onPromptKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey) return
  event.preventDefault()
  sendToAdvisor()
}
</script>

<template>
  <section class="card border-0 shadow-sm p-3 p-md-4">
    <h2 class="h6 text-uppercase mb-1">Aurea Prompt Launcher</h2>
    <p class="small text-muted mb-3">
      Componente estratto dalla home per test e sviluppo continuo.
    </p>

    <p v-if="!canUseAiChat" class="small text-muted mb-0">
      Permessi richiesti: `AI` + `AI_BETA_FEATURES`.
    </p>

    <template v-else>
      <textarea
        v-model="advisorPrompt"
        class="form-control home-ai-input"
        rows="4"
        placeholder="Scrivi il prompt per Aurea..."
        @keydown="onPromptKeydown"
      />
      <div class="home-ai-actions">
        <small>Invio con Enter, nuova riga con Shift+Enter</small>
        <Btn type="button" color="dark" icon="chat" :disabled="!advisorPrompt.trim()" @click="sendToAdvisor">
          Apri Chat AI
        </Btn>
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
.home-ai-input {
  resize: vertical;
  min-height: 92px;
}

.home-ai-actions {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 0.72rem;
  color: rgba(61, 35, 44, 0.72);
}

@media (max-width: 575.98px) {
  .home-ai-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
