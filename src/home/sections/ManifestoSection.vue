<script setup lang="ts">
import { computed } from 'vue'
import SectionTitle from '../components/SectionTitle.vue'
import { usePrefersReducedMotion } from '../composables/usePrefersReducedMotion'
import type { HomeContent } from '../homeContent'

defineProps<{
  content: HomeContent['manifesto']
}>()

const { isReducedMotion } = usePrefersReducedMotion()

const cardMotionBase = computed(() => {
  if (isReducedMotion.value) {
    return { opacity: 1, y: 0, transition: { duration: 0 } }
  }

  return {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }
})

</script>

<template>
  <section id="metodo" class="home-manifesto home-panel">
    <aside class="home-manifesto__aside">
      <SectionTitle
        :eyebrow="content.eyebrow"
        :title="content.title"
        :description="content.description"
      />
    </aside>

    <div class="home-manifesto__cards">
      <article
        v-for="(point, index) in content.points"
        :key="point.number"
        class="home-manifesto-card"
        v-motion
        :initial="{ opacity: 0, y: 26 }"
        :visible-once="{
          ...cardMotionBase,
          transition: {
            ...(cardMotionBase.transition ?? {}),
            delay: isReducedMotion ? 0 : index * 0.1,
          },
        }"
      >
        <p class="home-manifesto-card__number">{{ point.number }}</p>
        <h3>{{ point.title }}</h3>
        <p>{{ point.description }}</p>
      </article>
    </div>
  </section>
</template>
