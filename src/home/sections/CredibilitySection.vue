<script setup lang="ts">
import SectionTitle from '../components/SectionTitle.vue'
import { useScrollReveal } from '../composables/useScrollReveal'

const logos = ['Atelier Nova', 'Skinform', 'Linea Pura', 'Studio Onda', 'Dermalab', 'Maison Elan', 'Ritual Frame', 'Verve Clinic']

const stats = [
  { value: '+120', label: 'progetti editoriali e digitali' },
  { value: '12', label: 'anni di lavoro tra beauty e wellness' },
  { value: '9', label: 'settori serviti tra premium e medical beauty' },
]

const quotes = [
  {
    text: 'In tre settimane la home ha iniziato a guidare davvero il catalogo, non solo a mostrarlo.',
    author: 'Head of Marketing, Atelier Nova',
  },
  {
    text: 'Meno confusione, piu richieste qualificate su trattamenti specifici.',
    author: 'Founder, Dermalab Studio',
  },
  {
    text: 'Il nuovo tono editoriale ha reso prodotti e servizi finalmente parte della stessa storia.',
    author: 'Brand Manager, Skinform',
  },
]

const { target: lineTarget, revealClass } = useScrollReveal({ threshold: 0.35, once: true })
void lineTarget
</script>

<template>
  <section id="credibilita" class="home-credibility home-panel">
    <SectionTitle
      eyebrow="Credibilita"
      title="Segnali concreti di affidabilita"
      description="Numeri, prove sociali e un linguaggio uniforme tra catalogo prodotti e trattamenti."
    />

    <div ref="lineTarget" class="home-credibility__logos home-reveal" :class="revealClass">
      <p class="home-credibility__logos-label">Collaborazioni recenti</p>
      <div class="home-credibility__logos-grid">
        <span v-for="logo in logos" :key="logo">{{ logo }}</span>
      </div>
    </div>

    <div class="home-credibility__line home-draw-line" :class="revealClass"></div>

    <div class="home-credibility__stats">
      <article v-for="item in stats" :key="item.label" class="home-credibility__stat home-reveal" :class="revealClass">
        <p class="home-credibility__value">{{ item.value }}</p>
        <p class="home-credibility__label">{{ item.label }}</p>
      </article>
    </div>

    <div class="home-credibility__quotes">
      <blockquote v-for="quote in quotes" :key="quote.author" class="home-credibility__quote home-reveal" :class="revealClass">
        <p>"{{ quote.text }}"</p>
        <cite>{{ quote.author }}</cite>
      </blockquote>
    </div>
  </section>
</template>
