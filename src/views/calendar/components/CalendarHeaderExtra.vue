<script setup lang="ts">
import { Btn } from 'cic-kit'
import HeaderApp from '../../../components/headers/HeaderApp.vue'

defineProps<{
  hasActiveFilters?: boolean
}>()

defineEmits<{
  (e: 'createAppointment'): void
  (e: 'openFilters'): void
}>()
</script>

<template>
  <HeaderApp :to="{ name: 'homeApp' }">
    <div class="d-flex justify-content-between align-items-center">
      <h1 class="app-header__title">Calendario</h1>
      <div>
        <Btn icon="add" variant="ghost" color="dark" @click="$emit('createAppointment')" />
        <Btn icon="tune" variant="ghost" :color="hasActiveFilters ? 'warning' : 'dark'" @click="$emit('openFilters')" />
      </div>
    </div>
  </HeaderApp>
</template>

<style scoped>
.app-header__title {
  margin: 0;
  text-align: left;
  color: var(--logo-ink);
  font-size: clamp(1rem, 2.3vw, 1.3rem);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-family: 'Cormorant Garamond', 'Times New Roman', Georgia, serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


/* Da md in giu: con titolo lo slot va a capo */
@media (max-width: 991.98px) {
  .app-header--with-title :deep(.col:last-child) {
    width: 100%;
    flex: 0 0 100%;
    max-width: 100%;
    margin-top: 0.35rem;
  }
}

@media (max-width: 575.98px) {

  .app-header__title {
    font-size: 0.95rem;
    letter-spacing: 0.04em;
    max-width: 100%;
  }
}
</style>
