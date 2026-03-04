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
  <HeaderApp
    title="Calendario"
    :to="{ name: 'home' }"
  >
    <Btn
      icon="add"
      variant="ghost"
      color="dark"
      @click="$emit('createAppointment')"
    />
    <Btn
      icon="tune"
      variant="ghost"
      :color="hasActiveFilters ? 'warning' : 'dark'"
      @click="$emit('openFilters')"
    />
  </HeaderApp>
</template>

