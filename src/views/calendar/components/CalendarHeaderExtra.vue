<script setup lang="ts">
import HeaderApp from '../../../components/HeaderApp.vue'

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
    btn-icon="add"
    btn-color="dark"
    btn2-icon="tune"
    :btn2-color="hasActiveFilters ? 'warning' : 'dark'"
    @btn-click="$emit('createAppointment')"
    @btn2-click="$emit('openFilters')"
  />
</template>
