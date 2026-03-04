<script setup lang="ts">
import SectionHeader from './SectionHeader.vue'
import type { FaqItem } from './types'

withDefaults(defineProps<{
  items?: FaqItem[]
}>(), {
  items: () => [
    {
      id: 'faq-1',
      question: 'Come scelgo il trattamento giusto?',
      answer: 'Partiamo sempre da una consulenza iniziale: in base alle esigenze, ti indirizziamo alla categoria piu adatta.',
    },
    {
      id: 'faq-2',
      question: 'I prodotti sono acquistabili online?',
      answer: 'No, il sito e vetrina informativa. Puoi vedere categorie e dettagli prodotto, poi ricevere consulenza in sede.',
    },
    {
      id: 'faq-3',
      question: 'Posso prenotare direttamente dal sito?',
      answer: 'Puoi inviare una richiesta di prenotazione o contattarci dai riferimenti nella sezione contatti.',
    },
  ],
})
</script>

<template>
  <section class="faq">
    <SectionHeader
      eyebrow="FAQ"
      title="Domande frequenti"
      description="Risposte rapide per orientarti prima della consulenza."
    />

    <div class="faq__list">
      <details
        v-for="(item, index) in items"
        :key="item.id"
        v-motion-fade-up
        :delay="index * 60"
        class="faq__item"
      >
        <summary class="faq__question">{{ item.question }}</summary>
        <p class="faq__answer">{{ item.answer }}</p>
      </details>
    </div>
  </section>
</template>

<style scoped>
.faq {
  padding: clamp(1rem, 2.2vw, 1.7rem);
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 2px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.74), rgba(246, 239, 243, 0.58));
  box-shadow: 0 12px 26px rgba(36, 20, 26, 0.1);
}

.faq__list {
  display: grid;
  gap: 0.55rem;
}

.faq__item {
  border: 1px solid rgba(84, 44, 58, 0.18);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.8);
  padding: 0.66rem 0.78rem;
}

.faq__question {
  cursor: pointer;
  color: #432632;
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.45;
}

.faq__answer {
  margin: 0.48rem 0 0;
  color: rgba(58, 36, 44, 0.84);
  font-size: 0.82rem;
  line-height: 1.6;
}
</style>

