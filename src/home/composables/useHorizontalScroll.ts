import { computed, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useElementBounding, useResizeObserver, useScroll, useWindowSize } from '@vueuse/core'

type UseHorizontalScrollOptions = {
  mobileBreakpoint?: number
  reducedMotion?: MaybeRefOrGetter<boolean>
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function useHorizontalScroll(options: UseHorizontalScrollOptions = {}) {
  const sectionRef = ref<HTMLElement | null>(null)
  const stickyRef = ref<HTMLElement | null>(null)
  const viewportRef = ref<HTMLElement | null>(null)
  const trackRef = ref<HTMLElement | null>(null)

  const { width: windowWidth, height: windowHeight } = useWindowSize()
  const { y: scrollY } = useScroll(window, { behavior: 'auto' })
  const sectionBounds = useElementBounding(sectionRef)

  const mobileBreakpoint = options.mobileBreakpoint ?? 992
  const maxOffset = ref(0)
  const progress = ref(0)
  const fallbackProgress = ref(0)

  const isMobile = computed(() => windowWidth.value <= mobileBreakpoint)
  const isReducedMotion = computed(() => Boolean(toValue(options.reducedMotion ?? false)))
  const isPinned = computed(() => !isMobile.value && !isReducedMotion.value && maxOffset.value > 0)
  const leadInOffset = computed(() => {
    if (!isPinned.value) return 0
    return clamp(windowHeight.value * 0.12, 72, 140)
  })

  const sectionStart = computed(() => scrollY.value + sectionBounds.top.value)

  const sectionStyle = computed(() => {
    if (!isPinned.value) {
      return {
        height: 'auto',
        '--home-horizontal-pin-offset': '0px',
      }
    }

    return {
      // La sezione viene allungata esattamente della distanza orizzontale da percorrere:
      // + un lead-in iniziale per iniziare lo spostamento quando le card sono piu in alto.
      // Il tratto extra di scroll verticale "pilota" il translateX del track.
      height: `${windowHeight.value + maxOffset.value + leadInOffset.value}px`,
      '--home-horizontal-pin-offset': `${leadInOffset.value}px`,
    }
  })

  const trackStyle = computed(() => {
    if (!isPinned.value) {
      return {}
    }

    return {
      transform: `translate3d(${-progress.value * maxOffset.value}px, 0, 0)`,
      willChange: 'transform',
    }
  })

  const displayProgress = computed(() => (isPinned.value ? progress.value : fallbackProgress.value))

  function measure() {
    const stickyEl = stickyRef.value
    const viewportEl = viewportRef.value
    const trackEl = trackRef.value
    if ((!stickyEl && !viewportEl) || !trackEl) {
      maxOffset.value = 0
      return
    }

    const viewportWidth = viewportEl?.clientWidth ?? stickyEl?.clientWidth ?? 0
    const trackWidth = trackEl.scrollWidth
    maxOffset.value = Math.max(0, trackWidth - viewportWidth)
  }

  function syncProgressWithScroll() {
    if (!isPinned.value || maxOffset.value <= 0) {
      progress.value = 0
      return
    }

    // Quando il top della sezione raggiunge il top viewport, progress = 0.
    // Da quel punto il delta di scroll verticale viene normalizzato
    // sulla distanza reale scrollabile della sezione.
    const distanceInsideSection = scrollY.value - sectionStart.value
    progress.value = clamp(
      (distanceInsideSection - leadInOffset.value) / Math.max(1, maxOffset.value),
      0,
      1,
    )
  }

  function onFallbackScroll() {
    const viewportEl = viewportRef.value
    if (!viewportEl) return

    const maxScrollLeft = Math.max(1, viewportEl.scrollWidth - viewportEl.clientWidth)
    fallbackProgress.value = clamp(viewportEl.scrollLeft / maxScrollLeft, 0, 1)
  }

  watch(
    [() => windowWidth.value, () => windowHeight.value, () => isPinned.value],
    () => {
      measure()
      syncProgressWithScroll()
    },
    { immediate: true },
  )

  watch(
    [() => scrollY.value, () => sectionStart.value, () => maxOffset.value, () => leadInOffset.value, () => isPinned.value],
    () => {
      syncProgressWithScroll()
    },
    { immediate: true },
  )

  useResizeObserver(trackRef, () => {
    measure()
    syncProgressWithScroll()
  })

  useResizeObserver(stickyRef, () => {
    measure()
    syncProgressWithScroll()
  })

  useResizeObserver(viewportRef, () => {
    measure()
    syncProgressWithScroll()
  })

  return {
    sectionRef,
    stickyRef,
    viewportRef,
    trackRef,
    sectionStyle,
    trackStyle,
    displayProgress,
    isPinned,
    onFallbackScroll,
  }
}
