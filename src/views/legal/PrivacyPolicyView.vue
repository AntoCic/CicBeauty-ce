<script setup lang="ts">
import { cicKitStore, useChangeHeader } from 'cic-kit'
import { computed } from 'vue'
import HeaderApp from '../../components/HeaderApp.vue'
import LegalLinks from '../../components/LegalLinks.vue'
import { APP_CONFIG_DEFAULTS, hasLegalPlaceholdersInConfig } from '../../models/AppConfig'
import { appConfigStore } from '../../stores/appConfigStore'

useChangeHeader('Privacy Policy', { name: 'home' })
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const currentConfig = computed(() => appConfigStore.getConfig())
const legalConfig = computed(() => ({ ...APP_CONFIG_DEFAULTS, ...(currentConfig.value?.toData() ?? {}) }))
const hasLegalPlaceholders = computed(() => hasLegalPlaceholdersInConfig(legalConfig.value))
</script>

<template>
  <div class="legal-page container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Privacy Policy" :to="{ name: 'home' }" />

    <article class="legal-card">
      <p class="legal-updated">Ultimo aggiornamento: {{ legalConfig.legalLastUpdated }}</p>
      <p v-if="hasLegalPlaceholders" class="legal-warning">
        Completa i dati del titolare in App Config prima della pubblicazione definitiva.
      </p>

      <h2>Titolare del trattamento</h2>
      <p>
        Titolare: {{ legalConfig.ownerName }} ({{ legalConfig.legalEntity }}), P.IVA/C.F. {{ legalConfig.vatOrTaxCode
        }}, sede {{ legalConfig.officeAddress }}.
      </p>
      <p>
        Contatti privacy: {{ legalConfig.privacyEmail }}<span v-if="legalConfig.pec"> - PEC: {{ legalConfig.pec
          }}</span>.
      </p>

      <section class="legal-html" v-html="legalConfig.privacyPolicyBodyHtml" />

      <h2>Diritti interessato</h2>
      <p>
        Ai sensi degli articoli 15-22 GDPR puoi chiedere accesso, rettifica, cancellazione, limitazione, opposizione e
        portabilita, scrivendo a {{ legalConfig.privacyEmail }}.
      </p>
      <p>
        Resta fermo il diritto di proporre reclamo al Garante per la protezione dei dati personali.
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

.legal-warning {
  margin: 0.7rem 0 0;
  padding: 0.55rem;
  border: 1px solid rgba(183, 111, 30, 0.42);
  border-radius: 2px;
  background: rgba(255, 245, 231, 0.8);
  color: #71420c;
  font-size: 0.8rem;
}
</style>
