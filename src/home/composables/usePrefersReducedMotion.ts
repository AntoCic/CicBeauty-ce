import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'

export function usePrefersReducedMotion() {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isReducedMotion = computed(() => Boolean(prefersReducedMotion.value))

  return {
    isReducedMotion,
  }
}
