<script setup lang="ts">
import SectionHeader from './SectionHeader.vue'

interface MethodStep {
  title: string
  description: string
}

withDefaults(defineProps<{
  steps?: MethodStep[]
}>(), {
  steps: () => [
    {
      title: 'Analisi iniziale',
      description: 'Valutiamo cute e obiettivi per impostare un piano realistico e misurabile.',
    },
    {
      title: 'Protocollo personalizzato',
      description: 'Combiniamo tecnica, tempi e prodotti in base alle esigenze reali della persona.',
    },
    {
      title: 'Follow-up e mantenimento',
      description: 'Monitoriamo i progressi e adattiamo la routine per consolidare il risultato.',
    },
  ],
})
</script>

<template>
  <section class="method-story">
    <SectionHeader
      eyebrow="Metodo"
      title="Prima ascolto, poi azione"
      description="Un percorso costruito su consulenza, protocollo e continuita: la base dei risultati estetici duraturi."
    />

    <div class="method-story__grid">
      <article
        v-for="(step, index) in steps"
        :key="step.title"
        v-motion-fade-up
        :delay="index * 90"
        class="method-story__step"
      >
        <span class="method-story__step-index">{{ index + 1 }}</span>
        <h3 class="method-story__step-title">{{ step.title }}</h3>
        <p class="method-story__step-description">{{ step.description }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.method-story {
  padding: clamp(1rem, 2.2vw, 1.7rem);
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 2px;
  background:
    radial-gradient(circle at 88% 8%, rgba(232, 179, 190, 0.16), transparent 42%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.74), rgba(245, 239, 230, 0.55));
  box-shadow: 0 12px 26px rgba(36, 20, 26, 0.1);
}

.method-story__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.74rem;
}

.method-story__step {
  padding: 0.92rem 0.84rem;
  border: 1px solid rgba(84, 44, 58, 0.14);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.74);
  display: grid;
  gap: 0.3rem;
}

.method-story__step-index {
  width: 28px;
  height: 28px;
  border-radius: 2px;
  display: grid;
  place-items: center;
  color: #402330;
  background: linear-gradient(120deg, rgba(232, 179, 190, 0.62), rgba(226, 205, 177, 0.66));
  font-size: 0.74rem;
  font-weight: 700;
}

.method-story__step-title {
  margin: 0;
  color: #41242f;
  font-size: 0.95rem;
  font-weight: 700;
}

.method-story__step-description {
  margin: 0;
  color: rgba(58, 36, 44, 0.84);
  font-size: 0.82rem;
  line-height: 1.58;
}
</style>
