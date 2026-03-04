<script setup lang="ts">
import { computed } from 'vue'
import SectionTitle from '../components/SectionTitle.vue'
import { usePrefersReducedMotion } from '../composables/usePrefersReducedMotion'

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

const manifestoPoints = [
  {
    number: '01',
    title: 'Analisi editoriale',
    description:
      'Mappiamo tono, linguaggio e immagini per capire dove il brand e il catalogo perdono chiarezza.',
  },
  {
    number: '02',
    title: 'Architettura dei messaggi',
    description:
      'Definiamo priorita narrative per homepage, categorie e schede: promessa, prova, azione.',
  },
  {
    number: '03',
    title: 'Direzione visiva',
    description:
      'Allineiamo fotografia, texture e ritmo dei contenuti per mantenere una percezione premium coerente.',
  },
  {
    number: '04',
    title: 'Sistema operativo',
    description:
      'Trasformiamo il metodo in linee guida replicabili: headline, layout, micro-copy e CTA utili.',
  },
]
</script>

<template>
  <section id="metodo" class="home-manifesto home-panel">
    <aside class="home-manifesto__aside">
      <SectionTitle
        eyebrow="Manifesto"
        title="Metodo in quattro movimenti"
        description="Una struttura concreta per far trovare rapidamente trattamenti e prodotti."
      />
    </aside>

    <div class="home-manifesto__cards">
      <article
        v-for="(point, index) in manifestoPoints"
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
