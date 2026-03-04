<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWindowSize } from '@vueuse/core'
import iconStrategy from '../../assets/home/icons/strategy.svg'
import iconNarrative from '../../assets/home/icons/narrative.svg'
import iconContent from '../../assets/home/icons/content.svg'
import iconVisual from '../../assets/home/icons/visual.svg'
import iconExperience from '../../assets/home/icons/experience.svg'
import iconGovernance from '../../assets/home/icons/governance.svg'
import type { ServiceItem } from '../types'
import SectionTitle from '../components/SectionTitle.vue'
import { usePrefersReducedMotion } from '../composables/usePrefersReducedMotion'

const services: ServiceItem[] = [
  {
    id: 'strategy',
    title: 'Strategia',
    summary: 'Posizionamento, priorita e mappa decisionale.',
    details: 'Definiamo a chi parli, cosa prometti e con quale sequenza argomentativa.',
    icon: iconStrategy,
  },
  {
    id: 'narrative',
    title: 'Identita narrativa',
    summary: 'Tono, lessico e codici editoriali.',
    details: 'Costruiamo una voce distintiva applicabile da homepage a schede prodotto.',
    icon: iconNarrative,
  },
  {
    id: 'architecture',
    title: 'Architettura contenuti',
    summary: 'Layout informativo orientato alla scelta.',
    details: 'Organizziamo i blocchi in base al percorso reale di lettura e confronto.',
    icon: iconContent,
  },
  {
    id: 'visual',
    title: 'Direzione visiva',
    summary: 'Moodboard, texture e regole immagine.',
    details: 'Allineiamo fotografia e UI per una percezione premium coerente nel tempo.',
    icon: iconVisual,
  },
  {
    id: 'ux',
    title: 'UX editoriale',
    summary: 'Microcopy, CTA e segnali di fiducia.',
    details: 'Scriviamo interfacce che guidano verso trattamenti e prodotti senza attrito.',
    icon: iconExperience,
  },
  {
    id: 'governance',
    title: 'Governance',
    summary: 'Template e linee guida operative.',
    details: 'Consegniamo un sistema facile da mantenere anche con team distribuiti.',
    icon: iconGovernance,
  },
]

const { width } = useWindowSize()
const { isReducedMotion } = usePrefersReducedMotion()
const isMobile = computed(() => width.value <= 900)
const activeId = ref(services[0]?.id ?? '')

function setActive(id: string) {
  if (isMobile.value) return
  activeId.value = id
}
</script>

<template>
  <section id="servizi" class="home-services home-panel">
    <SectionTitle
      eyebrow="Servizi"
      title="Deliverable che diventano sistema"
      description="Dalla direzione strategica ai moduli pronti per homepage, prodotti e trattamenti."
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
