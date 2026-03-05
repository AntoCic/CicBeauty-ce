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

      <div class="home-final-cta__contact-card">
        <p class="home-final-cta__contact-kicker">Contatto rapido</p>
        <a
          v-if="content.phoneHref"
          class="home-final-cta__phone-link"
          :href="content.phoneHref"
        >
          {{ content.phoneLabel }}
        </a>
        <p v-else class="home-final-cta__phone-link mb-0">{{ content.phoneLabel }}</p>

        <a
          v-if="content.whatsappHref"
          class="home-final-cta__wa-link"
          :href="content.whatsappHref"
          target="_blank"
          rel="noreferrer"
          aria-label="Apri chat WhatsApp"
        >
          <span class="home-final-cta__wa-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
              <path
                d="M12 2.8a9.18 9.18 0 0 0-8.15 13.4L2.8 21.2l5.1-1.34A9.2 9.2 0 1 0 12 2.8Zm0 16.72a7.48 7.48 0 0 1-3.82-1.05l-.27-.16-2.88.75.77-2.8-.18-.3A7.47 7.47 0 1 1 12 19.52Zm4.1-5.63c-.23-.12-1.36-.67-1.57-.74-.2-.08-.35-.12-.5.11-.14.23-.56.74-.68.89-.13.15-.25.18-.47.06-.23-.11-.96-.35-1.82-1.13-.67-.6-1.12-1.34-1.25-1.57-.13-.23-.01-.35.1-.46.1-.1.23-.25.34-.38.11-.13.15-.22.23-.38.08-.15.04-.29-.02-.4-.06-.12-.5-1.22-.69-1.67-.18-.43-.37-.38-.5-.39h-.43c-.15 0-.39.05-.6.29-.2.23-.78.76-.78 1.86 0 1.1.8 2.16.92 2.31.11.15 1.56 2.37 3.77 3.33.53.23.94.37 1.26.47.53.17 1 .14 1.38.09.42-.07 1.36-.56 1.55-1.1.2-.54.2-1 .14-1.1-.06-.11-.21-.17-.44-.29Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span>{{ content.whatsappLabel }}</span>
        </a>
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
