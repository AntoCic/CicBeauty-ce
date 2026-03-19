<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  if (typeof window === 'undefined') return
  window.location.assign('/')
})
</script>

<template>
  <div class="container py-5 text-center">
    <p class="mb-0 text-muted">Aggiornamento in corso...</p>
  </div>
</template>
