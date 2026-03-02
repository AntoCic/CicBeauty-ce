<script setup lang="ts">
import { Btn } from 'cic-kit'

defineEmits<{
  (e: 'createAppointment'): void
  (e: 'openFilters'): void
}>()
</script>

<template>
  <div class="calendar-extra-buttons d-flex flex-wrap justify-content-end gap-2 mb-2">
    <Btn type="button" color="dark" icon="add" @click="$emit('createAppointment')">Nuovo appuntamento</Btn>
    <Btn type="button" color="dark" variant="outline" icon="tune" @click="$emit('openFilters')">Filtri</Btn>
  </div>
</template>

<style scoped lang="scss">
.calendar-extra-buttons {
  width: 100%;
}
</style>
