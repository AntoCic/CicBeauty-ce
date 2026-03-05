import { computed, ref, type Ref } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'

export type ScrollRevealOptions = {
  threshold?: number
  rootMargin?: string
  once?: boolean
  target?: Ref<HTMLElement | null>
}

export function useScrollReveal(options: ScrollRevealOptions = {}) {
  const target = options.target ?? ref<HTMLElement | null>(null)
  const isVisible = ref(false)
  const once = options.once ?? true

  const observer = useIntersectionObserver(
    target,
    ([entry]) => {
      if (!entry) return

      if (entry.isIntersecting) {
        isVisible.value = true
        if (once) observer.stop()
        return
      }

      if (!once) {
        isVisible.value = false
      }
    },
    {
      threshold: options.threshold ?? 0.22,
      rootMargin: options.rootMargin ?? '0px 0px -10% 0px',
    },
  )

  const revealClass = computed(() => (isVisible.value ? 'is-visible' : ''))

  return {
    target,
    isVisible,
    revealClass,
  }
}
