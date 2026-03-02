<script setup lang="ts">
import { Auth } from '../main';

</script>

<template>
  <nav class="legal-links" aria-label="Link legali">
    <RouterLink class="legal-link" :to="{ name: 'PrivacyPolicyView' }">Privacy</RouterLink>
    <RouterLink class="legal-link" :to="{ name: 'CookiePolicyView' }">Cookie</RouterLink>
    <RouterLink class="legal-link" :to="{ name: 'TermsConditionsView' }">Termini</RouterLink>
    <RouterLink class="legal-link" :to="{ name: 'AiTransparencyView' }">AI</RouterLink>
    <RouterLink v-if="!Auth.isLoggedIn" class="legal-link" :to="{ name: 'login' }"><span
        class="material-symbols-outlined" style="font-size: 0.7rem; vertical-align: middle;">
        lock_person
      </span> Admin
    </RouterLink>
  </nav>
</template>

<style scoped>
.legal-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 14px;
}

.legal-link {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(61, 35, 44, 0.82);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.legal-link:hover {
  color: #542c3a;
  border-color: rgba(84, 44, 58, 0.6);
}
</style>
