<script setup lang="ts">
import { computed } from 'vue'
import { useScrollReveal } from '../composables/useScrollReveal'

const props = withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    description?: string
    centered?: boolean
  }>(),
  {
    eyebrow: undefined,
    description: undefined,
    centered: false,
  },
)

const { target, revealClass } = useScrollReveal({ threshold: 0.2, once: true })
void target

const classes = computed(() => [
  'home-section-title',
  revealClass.value,
  props.centered ? 'home-section-title--centered' : '',
])
</script>

<template>
  <header ref="target" :class="classes">
    <p v-if="eyebrow" class="home-section-title__eyebrow">{{ eyebrow }}</p>
    <h2 class="home-section-title__heading">{{ title }}</h2>
    <p v-if="description" class="home-section-title__description">{{ description }}</p>
  </header>
</template>
