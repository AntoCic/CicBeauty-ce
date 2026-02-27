<script setup lang="ts">
import { cicKitStore, useChangeHeader } from 'cic-kit'
import { computed, ref } from 'vue'
import HeaderApp from '../../components/HeaderApp.vue'
import LegalLinks from '../../components/LegalLinks.vue'
import { firebaseConfig } from '../../firebase-config'
import { readCookieConsentChoice, saveCookieConsentChoice } from '../../legal/cookieConsent'
import { APP_CONFIG_DEFAULTS } from '../../models/AppConfig'
import { appConfigStore } from '../../stores/appConfigStore'

useChangeHeader('Cookie Policy', { name: 'home' })
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const consent = ref(readCookieConsentChoice())
const currentConfig = computed(() => appConfigStore.getConfig())
const legalConfig = computed(() => ({ ...APP_CONFIG_DEFAULTS, ...(currentConfig.value?.toData() ?? {}) }))

function acceptAnalytics() {
  saveCookieConsentChoice('accepted', firebaseConfig.measurementId)
  consent.value = 'accepted'
}

function rejectAnalytics() {
  saveCookieConsentChoice('rejected', firebaseConfig.measurementId)
  consent.value = 'rejected'
}
</script>

<template>
  <div class="legal-page container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Cookie Policy" :to="{ name: 'home' }" />

    <article class="legal-card">
      <p class="legal-updated">Ultimo aggiornamento: {{ legalConfig.legalLastUpdated }}</p>

      <section class="legal-html" v-html="legalConfig.cookiePolicyBodyHtml" />

      <h2>Analytics opzionali</h2>
      <p>
        Se fornisci consenso, abilitiamo analytics Firebase per statistiche aggregate di utilizzo. In assenza di consenso,
        gli analytics restano disattivati.
      </p>

      <div class="consent-box">
        <p class="mb-2">
          Stato consenso analytics:
          <strong v-if="consent === 'accepted'">Accettato</strong>
          <strong v-else-if="consent === 'rejected'">Rifiutato</strong>
          <strong v-else>Non espresso</strong>
        </p>
        <div class="consent-actions">
          <button type="button" class="consent-btn consent-btn--ghost" @click="rejectAnalytics">
            Rifiuta analytics
          </button>
          <button type="button" class="consent-btn consent-btn--primary" @click="acceptAnalytics">
            Accetta analytics
          </button>
        </div>
      </div>

      <h2>Contatti</h2>
      <p>Per richieste privacy/cookie puoi contattare: {{ legalConfig.privacyEmail }}.</p>

      <LegalLinks />
    </article>
  </div>
</template>

<style scoped>
.legal-page {
  color: #2f2f2f;
}

.legal-card {
  width: min(960px, 100%);
  margin: 0 auto 1.2rem;
  padding: clamp(14px, 2.6vw, 24px);
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.78);
  line-height: 1.62;
}

.legal-card h2 {
  margin: 1rem 0 0.35rem;
  color: #4b2935;
  font-size: 1rem;
}

.legal-card p {
  font-size: 0.9rem;
}

.legal-html :deep(h2) {
  margin: 1rem 0 0.35rem;
  color: #4b2935;
  font-size: 1rem;
}

.legal-html :deep(p),
.legal-html :deep(li) {
  font-size: 0.9rem;
}

.legal-updated {
  margin: 0;
  color: rgba(75, 41, 53, 0.72);
  font-size: 0.8rem;
}

.consent-box {
  margin-top: 0.45rem;
  padding: 0.65rem;
  border: 1px solid rgba(84, 44, 58, 0.24);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.7);
}

.consent-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.consent-btn {
  border: 1px solid rgba(84, 44, 58, 0.56);
  border-radius: 2px;
  padding: 6px 10px;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
}

.consent-btn--ghost {
  background: #fff;
  color: #542c3a;
}

.consent-btn--primary {
  background: #542c3a;
  color: #fff;
}
</style>
