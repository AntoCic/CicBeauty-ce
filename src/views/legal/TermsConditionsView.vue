<script setup lang="ts">
import { cicKitStore, useChangeHeader } from 'cic-kit'
import { computed } from 'vue'
import HeaderApp from '../../components/HeaderApp.vue'
import LegalLinks from '../../components/LegalLinks.vue'
import { APP_CONFIG_DEFAULTS } from '../../models/AppConfig'
import { appConfigStore } from '../../stores/appConfigStore'

useChangeHeader('Termini e Condizioni', { name: 'home' })
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const currentConfig = computed(() => appConfigStore.getConfig())
const legalConfig = computed(() => ({ ...APP_CONFIG_DEFAULTS, ...(currentConfig.value?.toData() ?? {}) }))
</script>

<template>
  <div class="legal-page container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Termini e Condizioni" :to="{ name: 'home' }" />

    <article class="legal-card">
      <p class="legal-updated">Ultimo aggiornamento: {{ legalConfig.legalLastUpdated }}</p>

      <h2>Oggetto del sito</h2>
      <p>
        {{ legalConfig.brandName }} pubblica un catalogo informativo di trattamenti e prodotti. Il sito non integra
        carrello, pagamento online o conclusione di contratti a distanza.
      </p>

      <section class="legal-html" v-html="legalConfig.termsConditionsBodyHtml" />

      <h2>Contatti</h2>
      <p>
        Per richieste legali o privacy: {{ legalConfig.privacyEmail }}.
      </p>

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
</style>
