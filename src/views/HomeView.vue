<script setup lang="ts">
import { cicKitStore, useHideHeader } from 'cic-kit'
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Auth } from '../main'
import { UserPermission } from '../enums/UserPermission'
import LegalLinks from '../components/LegalLinks.vue'

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const router = useRouter()
const advisorPrompt = ref('')
const canUseAiChat = computed(
  () =>
    (Auth?.user?.hasPermission(UserPermission.AI) ?? false) &&
    (Auth?.user?.hasPermission(UserPermission.AI_BETA_FEATURES) ?? false),
)

useHideHeader()

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
  <div class="home-page" :style="bgStyle">
    <section class="home-main">
      <img v-if="!Auth.isLoggedIn" class="home-logo" src="/img/logo/logo.png" alt="Cic Beauty logo" />
      <img v-else class="home-logo" src="/img/qr.png" alt="Cic Beauty logo" />

      <div class="home-actions">
        <RouterLink :to="{ name: 'TreatmentCategoriesView' }" class="home-link home-btn home-btn--one">
          Treatments Catalog
        </RouterLink>
        <RouterLink :to="{ name: 'ProductCategoriesView' }" class="home-link home-btn home-btn--two">
          Products Catalog
        </RouterLink>
      </div>

      <section v-if="canUseAiChat" class="home-ai-box">
        <p class="home-ai-title">Beauty Advisor AI</p>
        <textarea
          v-model="advisorPrompt"
          class="form-control home-ai-input"
          rows="3"
          placeholder="Scrivi la tua esigenza e premi invio per aprire la chat AI"
          @keydown="onPromptKeydown"
        />
        <div class="home-ai-actions">
          <small>Invio con Enter, nuova riga con Shift+Enter</small>
          <button type="button" class="home-ai-send" :disabled="!advisorPrompt.trim()" @click="sendToAdvisor">
            Apri Chat AI
          </button>
        </div>
      </section>
    </section>

    <footer class="home-footer text-center fs-8">
      <LegalLinks />
    </footer>
  </div>
</template>

<style scoped>
.home-page {
  --rose-dark: #542c3a;
  --rose-accent: #e8b3be;
  position: relative;
  height: 100%;
  width: 100%;
  display: grid;
  place-items: center;
  padding: clamp(20px, 3vw, 36px);
  overflow-x: hidden;
  overflow-y: auto;
  isolation: isolate;
}

.home-main {
  position: relative;
  z-index: 1;
  width: min(620px, 100%);
  padding: clamp(32px, 5vw, 46px);
  text-align: center;
  border-bottom: 1px solid rgba(84, 44, 58, 0.24);
}

.home-logo {
  width: min(280px, 62vw);
  height: auto;
  margin-bottom: 12px;
  filter: drop-shadow(0 10px 24px rgba(84, 44, 58, 0.18));
}

.home-actions {
  width: min(420px, 100%);
  margin: 20px auto 0;
  display: grid;
  gap: 12px;
}

.home-link {
  display: inline-block;
  color: #2f2f2f;
  text-decoration: none;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: color 0.2s ease;
  cursor: pointer;
}

.home-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 48px;
  border-radius: 2px;
  border: 1.5px solid rgba(84, 44, 58, 0.58);
  color: #3d2630;
  font-size: 0.74rem;
  font-weight: 600;
  background: transparent;
  box-shadow: none;
  opacity: 0;
  transform: translateY(20px) scale(0.97);
  animation: button-enter 700ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  transition:
    transform 0.24s ease,
    box-shadow 0.24s ease,
    border-color 0.24s ease,
    background 0.24s ease;
}

.home-btn:hover {
  transform: translateY(-2px) scale(1);
  border-color: rgba(84, 44, 58, 0.82);
  box-shadow: 0 10px 16px rgba(84, 44, 58, 0.12);
  background: transparent;
  color: #542c3a;
}

.home-btn--one {
  animation-delay: 140ms;
}

.home-btn--two {
  animation-delay: 270ms;
}

.home-ai-box {
  margin-top: 18px;
  border: 1px solid rgba(84, 44, 58, 0.24);
  border-radius: 2px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.75);
  text-align: left;
}

.home-disclaimer {
  margin: 14px auto 0;
  width: min(420px, 100%);
  font-size: 0.77rem;
  line-height: 1.5;
  color: rgba(61, 35, 44, 0.74);
}

.home-ai-title {
  margin: 0 0 8px;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #542c3a;
  font-weight: 700;
}

.home-ai-input {
  resize: vertical;
  min-height: 88px;
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

.home-ai-send {
  border: 1px solid rgba(84, 44, 58, 0.58);
  border-radius: 2px;
  background: #542c3a;
  color: #fff;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 6px 10px;
  transition: opacity 0.2s ease;
}

.home-ai-send:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}

.home-footer {
  margin-top: 14px;
  display: grid;
  gap: 8px;
  justify-items: center;
}

.home-footer .home-link:hover {
  color: var(--rose-accent);
}

@keyframes button-enter {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.97);
  }
  70% {
    opacity: 1;
    transform: translateY(-3px) scale(1.01);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 575.98px) {
  .home-main {
    padding: 24px 18px 42px;
  }

  .home-btn {
    min-height: 46px;
    font-size: 0.68rem;
  }

  .home-ai-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
