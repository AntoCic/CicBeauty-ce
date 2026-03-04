<script setup lang="ts">
import { computed } from 'vue'
import abstractImage from '../../assets/home/case-07.svg'
import { usePrefersReducedMotion } from '../composables/usePrefersReducedMotion'

const { isReducedMotion } = usePrefersReducedMotion()

const ctaMotion = computed(() => {
  if (isReducedMotion.value) {
    return { opacity: 1, scale: 1, y: 0, transition: { duration: 0 } }
  }

  return {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  }
})
</script>

<template>
  <section id="contatti" class="home-final-cta home-panel" v-motion :initial="{ opacity: 0, scale: 0.98, y: 18 }" :visible-once="ctaMotion">
    <div class="home-final-cta__texture" aria-hidden="true">
      <img :src="abstractImage" alt="" loading="lazy" decoding="async" />
    </div>

    <div class="home-final-cta__content">
      <p class="home-kicker">Prossimo step</p>
      <h2>Parti da cio che serve oggi: trattamenti o prodotti</h2>
      <p>
        Seleziona il percorso piu utile adesso. La Home rimane una porta chiara verso entrambe le aree principali.
      </p>

      <div class="home-final-cta__actions">
        <RouterLink class="home-btn home-btn--primary" :to="{ name: 'TreatmentCategoriesView' }">
          Vai ai trattamenti
        </RouterLink>
        <RouterLink class="home-btn home-btn--ghost" :to="{ name: 'ProductCategoriesView' }">
          Vai ai prodotti
        </RouterLink>
      </div>

      <div class="home-final-cta__links">
        <a href="mailto:hello@cicbeauty.it">hello@cicbeauty.it</a>
        <a href="tel:+390212345678">+39 02 1234 5678</a>
        <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
      </div>
    </div>
  </section>
</template>
