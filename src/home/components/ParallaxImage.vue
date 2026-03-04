<script setup lang="ts">
import { computed, ref } from 'vue'
import { useElementBounding, useWindowSize } from '@vueuse/core'
import { usePrefersReducedMotion } from '../composables/usePrefersReducedMotion'
import { useScrollReveal } from '../composables/useScrollReveal'

const props = withDefaults(
  defineProps<{
    src: string
    alt: string
    speed?: number
    loading?: 'lazy' | 'eager'
    fetchpriority?: 'high' | 'low' | 'auto'
    className?: string
  }>(),
  {
    speed: 0.08,
    loading: 'lazy',
    fetchpriority: 'auto',
    className: '',
  },
)

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

const rootRef = ref<HTMLElement | null>(null)
const { isReducedMotion } = usePrefersReducedMotion()
const { height: windowHeight } = useWindowSize()
const bounds = useElementBounding(rootRef)
const { revealClass, isVisible } = useScrollReveal({
  target: rootRef,
  threshold: 0.28,
  once: true,
})

const parallaxY = computed(() => {
  if (isReducedMotion.value) return 0
  const centerDelta = bounds.top.value + bounds.height.value * 0.5 - windowHeight.value * 0.5
  return clamp(-centerDelta * props.speed, -34, 34)
})

const mediaStyle = computed(() => ({
  transform: `translate3d(0, ${parallaxY.value}px, 0) scale(${isVisible.value || isReducedMotion.value ? 1 : 1.05})`,
}))

const classes = computed(() => ['home-parallax-image', props.className, revealClass.value])
</script>

<template>
  <figure ref="rootRef" :class="classes">
    <img
      class="home-parallax-image__media"
      :src="src"
      :alt="alt"
      :loading="loading"
      :fetchpriority="fetchpriority"
      decoding="async"
      :style="mediaStyle"
    />
  </figure>
</template>
