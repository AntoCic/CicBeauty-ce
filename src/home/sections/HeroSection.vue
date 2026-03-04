<script setup lang="ts">
import { computed } from 'vue'
import heroImage from '../../assets/home/hero-editorial.svg'
import RevealText from '../components/RevealText.vue'
import ParallaxImage from '../components/ParallaxImage.vue'
import { usePrefersReducedMotion } from '../composables/usePrefersReducedMotion'
import { useScrollReveal } from '../composables/useScrollReveal'

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
      <p class="home-kicker">Studio editoriale per brand beauty</p>

      <RevealText
        as="h1"
        class-name="home-hero__title"
        :lines="[
          'Diamo voce ai trattamenti',
          'e presenza ai prodotti',
          'con una direzione narrativa chiara',
        ]"
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
          Costruiamo percorsi visivi e verbali che rendono ogni categoria comprensibile, desiderabile e coerente.
        </p>

        <div
          class="home-hero__actions"
          v-motion
          :initial="{ opacity: 0, y: 14 }"
          :visible-once="actionMotion"
        >
          <RouterLink class="home-btn home-btn--primary" :to="{ name: 'TreatmentCategoriesView' }">
            Esplora trattamenti
          </RouterLink>
          <RouterLink class="home-btn home-btn--ghost" :to="{ name: 'ProductCategoriesView' }">
            Esplora prodotti
          </RouterLink>
          <a class="home-inline-link" href="#case-studies">Vedi i case studies</a>
        </div>
      </div>
    </div>

    <div class="home-hero__visual">
      <ParallaxImage
        :src="heroImage"
        alt="Visual editoriale con composizione beauty"
        :speed="0.06"
        loading="eager"
        fetchpriority="high"
        class-name="home-hero__image"
      />
    </div>
  </section>
</template>
