<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWindowSize } from '@vueuse/core'
import SectionTitle from '../components/SectionTitle.vue'
import { usePrefersReducedMotion } from '../composables/usePrefersReducedMotion'
import type { HomeContent } from '../homeContent'

const props = defineProps<{
  content: HomeContent['services']
}>()

const services = computed(() => props.content.items)

const { width } = useWindowSize()
const { isReducedMotion } = usePrefersReducedMotion()
const isMobile = computed(() => width.value <= 900)
const activeId = ref(services.value[0]?.id ?? '')

watch(
  services,
  (nextServices) => {
    if (!nextServices.some((item) => item.id === activeId.value)) {
      activeId.value = nextServices[0]?.id ?? ''
    }
  },
  { immediate: true },
)

function setActive(id: string) {
  if (isMobile.value) return
  activeId.value = id
}
</script>

<template>
  <section id="servizi" class="home-services home-panel">
    <SectionTitle
      :eyebrow="content.eyebrow"
      :title="content.title"
      :description="content.description"
    />

    <div v-if="!isMobile" class="home-services__grid">
      <article
        v-for="(service, index) in services"
        :key="service.id"
        class="home-service-card"
        :class="{ 'is-active': activeId === service.id }"
        tabindex="0"
        @mouseenter="setActive(service.id)"
        @focusin="setActive(service.id)"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :visible-once="{
          opacity: 1,
          y: 0,
          transition: {
            duration: isReducedMotion ? 0 : 0.46,
            ease: [0.16, 1, 0.3, 1],
            delay: isReducedMotion ? 0 : index * 0.08,
          },
        }"
      >
        <img :src="service.icon" :alt="`Icona ${service.title}`" loading="lazy" decoding="async" />
        <h3>{{ service.title }}</h3>
        <p class="home-service-card__summary">{{ service.summary }}</p>
        <p class="home-service-card__details">{{ service.details }}</p>
      </article>
    </div>

    <div v-else class="home-services__accordion">
      <details v-for="service in services" :key="service.id" class="home-service-accordion">
        <summary>
          <img :src="service.icon" :alt="`Icona ${service.title}`" loading="lazy" decoding="async" />
          <span>{{ service.title }}</span>
        </summary>
        <p>{{ service.summary }}</p>
        <p>{{ service.details }}</p>
      </details>
    </div>
  </section>
</template>
