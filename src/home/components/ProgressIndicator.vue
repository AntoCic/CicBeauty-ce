<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  current: number
  total: number
  progress: number
}>()

const clampedProgress = computed(() => Math.min(1, Math.max(0, props.progress)))
const currentLabel = computed(() => String(props.current).padStart(2, '0'))
const totalLabel = computed(() => String(props.total).padStart(2, '0'))
</script>

<template>
  <div class="home-progress-indicator" role="status" aria-live="polite">
    <p class="home-progress-indicator__numbers">{{ currentLabel }} / {{ totalLabel }}</p>
    <div class="home-progress-indicator__bar" aria-hidden="true">
      <span class="home-progress-indicator__fill" :style="{ transform: `scaleX(${clampedProgress})` }"></span>
    </div>
  </div>
</template>
