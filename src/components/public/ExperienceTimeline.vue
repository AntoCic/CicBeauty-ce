<script setup lang="ts">
import SectionHeader from './SectionHeader.vue'

interface TimelineStep {
  id: string
  phase: string
  title: string
  description: string
}

withDefaults(defineProps<{
  steps?: TimelineStep[]
}>(), {
  steps: () => [
    {
      id: 'timeline-1',
      phase: 'Fase 01',
      title: 'Accoglienza e check rapido',
      description: 'Ascoltiamo esigenze e obiettivi per definire il percorso di lavoro.',
    },
    {
      id: 'timeline-2',
      phase: 'Fase 02',
      title: 'Scelta categoria guidata',
      description: 'Partiamo dalla categoria corretta per semplificare la decisione.',
    },
    {
      id: 'timeline-3',
      phase: 'Fase 03',
      title: 'Protocollo in cabina',
      description: 'Eseguiamo il trattamento con tempi e tecniche coerenti.',
    },
    {
      id: 'timeline-4',
      phase: 'Fase 04',
      title: 'Routine di mantenimento',
      description: 'Definiamo prodotti e frequenza per consolidare il risultato.',
    },
  ],
})
</script>

<template>
  <section class="experience-timeline">
    <SectionHeader
      eyebrow="Beauty Flow"
      title="Una timeline chiara, passo dopo passo"
      description="Un percorso lineare e facile da seguire, pensato per trasmettere controllo e fiducia."
    />

    <div class="experience-timeline__list">
      <article
        v-for="(step, index) in steps"
        :key="step.id"
        v-motion-fade-up
        :delay="index * 90"
        class="experience-timeline__item"
      >
        <p class="experience-timeline__phase">{{ step.phase }}</p>
        <h3 class="experience-timeline__title">{{ step.title }}</h3>
        <p class="experience-timeline__description">{{ step.description }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.experience-timeline {
  position: relative;
  padding: clamp(1rem, 2.2vw, 1.7rem);
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 2px;
  background:
    radial-gradient(circle at 0% 50%, rgba(232, 179, 190, 0.2), transparent 30%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.73), rgba(247, 241, 242, 0.58));
  box-shadow: 0 12px 26px rgba(36, 20, 26, 0.1);
}

.experience-timeline__list {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.7rem;
}

.experience-timeline__item {
  padding: 0.86rem;
  border: 1px solid rgba(84, 44, 58, 0.14);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.78);
  transition: transform 220ms ease, box-shadow 220ms ease;
}

.experience-timeline__item:hover {
  transform: translate3d(0, -4px, 0);
  box-shadow: 0 10px 18px rgba(31, 18, 24, 0.12);
}

.experience-timeline__phase {
  margin: 0;
  color: rgba(75, 41, 53, 0.72);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
}

.experience-timeline__title {
  margin: 0.46rem 0 0;
  color: #41242f;
  font-size: 0.96rem;
  font-weight: 700;
}

.experience-timeline__description {
  margin: 0.34rem 0 0;
  color: rgba(58, 36, 44, 0.84);
  font-size: 0.82rem;
  line-height: 1.58;
}
</style>

