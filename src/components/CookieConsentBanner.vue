<script setup lang="ts">
import { computed, ref } from 'vue'
import { firebaseConfig } from '../firebase-config'
import { readCookieConsentChoice, saveCookieConsentChoice } from '../legal/cookieConsent'
import { APP_CONFIG_DEFAULTS } from '../models/AppConfig'
import { appConfigStore } from '../stores/appConfigStore'

const consent = ref(readCookieConsentChoice())
const isDismissed = ref(false)
const isVisible = computed(() => consent.value === null && !isDismissed.value)
const currentConfig = computed(() => appConfigStore.getConfig())
const legalConfig = computed(() => ({ ...APP_CONFIG_DEFAULTS, ...(currentConfig.value?.toData() ?? {}) }))

function acceptCookies() {
  saveCookieConsentChoice('accepted', firebaseConfig.measurementId)
  consent.value = 'accepted'
}

function rejectCookies() {
  saveCookieConsentChoice('rejected', firebaseConfig.measurementId)
  consent.value = 'rejected'
}

function closeBanner() {
  isDismissed.value = true
}
</script>

<template>
  <aside v-if="isVisible" class="cookie-banner" role="dialog" aria-live="polite" aria-label="Consenso cookie">
    <button type="button" class="cookie-close" aria-label="Chiudi banner cookie" @click="closeBanner">x</button>
    <div class="cookie-text" v-html="legalConfig.cookieBannerTextHtml" />

    <div class="cookie-footer">
      <p class="cookie-links">
        <RouterLink :to="{ name: 'CookiePolicyView' }">Cookie Policy</RouterLink>
        <RouterLink :to="{ name: 'PrivacyPolicyView' }">Privacy Policy</RouterLink>
      </p>

      <div class="cookie-actions">
        <button type="button" class="cookie-btn cookie-btn--ghost" @click="rejectCookies">{{ legalConfig.cookieBannerRejectBtnText }}</button>
        <button type="button" class="cookie-btn cookie-btn--primary" @click="acceptCookies">{{ legalConfig.cookieBannerAcceptBtnText }}</button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.cookie-banner {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 1400;
  max-width: 760px;
  margin: 0 auto;
  padding: 12px;
  border: 1px solid rgba(84, 44, 58, 0.28);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 18px rgba(45, 23, 31, 0.16);
  padding-right: 40px;
}

.cookie-text {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: #3d232c;
}

.cookie-text :deep(p) {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.45;
}

.cookie-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border: 1px solid rgba(84, 44, 58, 0.32);
  border-radius: 2;
  background: #fff;
  color: #542c3a;
  font-size: 0.8rem;
  line-height: 1;
  cursor: pointer;
}

.cookie-footer {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.cookie-links {
  margin: 0;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.cookie-links a {
  font-size: 0.74rem;
  color: #542c3a;
}

.cookie-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.cookie-btn {
  border-radius: 2px;
  border: 1px solid rgba(84, 44, 58, 0.56);
  padding: 6px 10px;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
}

.cookie-btn--ghost {
  background: #fff;
  color: #542c3a;
}

.cookie-btn--primary {
  background: #542c3a;
  color: #fff;
}

@media (max-width: 575.98px) {
  .cookie-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .cookie-actions {
    width: 100%;
  }
}
</style>
