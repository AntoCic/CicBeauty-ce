<script setup lang="ts">
import { computed } from 'vue'
import RevealText from '../components/RevealText.vue'
import ParallaxImage from '../components/ParallaxImage.vue'
import { usePrefersReducedMotion } from '../composables/usePrefersReducedMotion'
import { useScrollReveal } from '../composables/useScrollReveal'
import type { HomeContent } from '../homeContent'

defineProps<{
  content: HomeContent['hero']
}>()

const { isReducedMotion } = usePrefersReducedMotion()
const { target, revealClass } = useScrollReveal({ threshold: 0.3, once: true })
void target

const subtitleMotion = computed(() => {
  if (isReducedMotion.value) {
    return {
      opacity: 1,
      y: 0,
      transition: { duration: 0 },
    }
  }

  return {
    opacity: 1,
    y: 0,
    transition: { duration: 0.56, ease: [0.16, 1, 0.3, 1], delay: 0.24 },
  }
})

const actionMotion = computed(() => {
  if (isReducedMotion.value) {
    return {
      opacity: 1,
      y: 0,
      transition: { duration: 0 },
    }
  }

  return {
    opacity: 1,
    y: 0,
    transition: { duration: 0.56, ease: [0.16, 1, 0.3, 1], delay: 0.34 },
  }
})
</script>

<template>
  <section id="hero" class="home-hero home-panel">
    <div class="home-hero__copy">
      <p class="home-kicker">{{ content.kicker }}</p>

      <RevealText
        as="h1"
        class-name="home-hero__title"
        :lines="content.titleLines"
      />

      <div
        ref="target"
        class="home-hero__body home-reveal"
        :class="revealClass"
        v-motion
        :initial="{ opacity: 0, y: 18 }"
        :visible-once="subtitleMotion"
      >
        <p class="home-hero__subtitle">
          {{ content.subtitle }}
        </p>

        <div
          class="home-hero__actions"
          v-motion
          :initial="{ opacity: 0, y: 14 }"
          :visible-once="actionMotion"
        >
          <RouterLink class="home-btn home-btn--primary" :to="{ name: 'TreatmentCategoriesView' }">
            {{ content.primaryCtaLabel }}
          </RouterLink>
          <RouterLink class="home-btn home-btn--ghost" :to="{ name: 'ProductCategoriesView' }">
            {{ content.secondaryCtaLabel }}
          </RouterLink>
          <a class="home-inline-link" :href="content.inlineCtaHref">{{ content.inlineCtaLabel }}</a>
        </div>
      </div>
    </div>

    <div class="home-hero__visual">
      <ParallaxImage
        :src="content.image"
        :alt="content.imageAlt"
        :speed="0.06"
        loading="eager"
        fetchpriority="high"
        class-name="home-hero__image"
      />
    </div>
  </section>
</template>
