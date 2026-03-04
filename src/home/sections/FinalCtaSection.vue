<script setup lang="ts">
import { computed } from 'vue'
import { usePrefersReducedMotion } from '../composables/usePrefersReducedMotion'
import type { HomeContent } from '../homeContent'

defineProps<{
  content: HomeContent['finalCta']
}>()

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
      <img :src="content.image" alt="" loading="lazy" decoding="async" />
    </div>

    <div class="home-final-cta__content">
      <p class="home-kicker">{{ content.kicker }}</p>
      <h2>{{ content.title }}</h2>
      <p>{{ content.description }}</p>

      <div class="home-final-cta__actions">
        <RouterLink class="home-btn home-btn--primary" :to="{ name: 'TreatmentCategoriesView' }">
          {{ content.primaryCtaLabel }}
        </RouterLink>
        <RouterLink class="home-btn home-btn--ghost" :to="{ name: 'ProductCategoriesView' }">
          {{ content.secondaryCtaLabel }}
        </RouterLink>
      </div>

      <div class="home-final-cta__links">
        <a
          v-for="link in content.links"
          :key="link.href + link.label"
          :href="link.href"
          :target="link.isExternal ? '_blank' : undefined"
          :rel="link.isExternal ? 'noreferrer' : undefined"
        >
          {{ link.label }}
        </a>
      </div>
    </div>
  </section>
</template>
