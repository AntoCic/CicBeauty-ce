<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import SectionHeader from './SectionHeader.vue'
import type { TestimonialItem } from './types'

const props = withDefaults(defineProps<{
  items?: TestimonialItem[]
}>(), {
  items: () => [
    {
      id: 'mock-1',
      quote: 'Ho percepito professionalita e cura dal primo incontro. Percorso chiaro e risultato visibile.',
      author: 'Martina R.',
      role: 'Cliente trattamento viso',
      rating: 5,
    },
    {
      id: 'mock-2',
      quote: 'Ambiente accogliente, consulenza precisa e prodotti consigliati in modo personalizzato.',
      author: 'Silvia C.',
      role: 'Cliente skincare',
      rating: 5,
    },
    {
      id: 'mock-3',
      quote: 'Finalmente un centro dove ogni step viene spiegato con trasparenza e competenza.',
      author: 'Giulia T.',
      role: 'Cliente body care',
      rating: 5,
    },
  ],
})

const sliderRef = ref<HTMLElement | null>(null)
const currentIndex = ref(0)
const safeItems = computed(() => props.items.filter((item) => String(item.quote ?? '').trim()))

function scrollToIndex(index: number) {
  const slider = sliderRef.value
  if (!slider) return
  const bounded = ((index % safeItems.value.length) + safeItems.value.length) % safeItems.value.length
  currentIndex.value = bounded
  const target = slider.children.item(bounded) as HTMLElement | null
  target?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
}

function showPrev() {
  if (!safeItems.value.length) return
  scrollToIndex(currentIndex.value - 1)
}

function showNext() {
  if (!safeItems.value.length) return
  scrollToIndex(currentIndex.value + 1)
}

onMounted(() => {
  if (safeItems.value.length) {
    scrollToIndex(0)
  }
})
</script>

<template>
  <section class="testimonials">
    <SectionHeader
      eyebrow="Social Proof"
      title="Cosa raccontano le clienti"
      description="Le recensioni aiutano a capire il tono dell'esperienza: attenzione, precisione e continuita."
    />

    <div v-motion-fade-up class="testimonials__controls">
      <button v-motion-tap-scale type="button" class="testimonials__nav-btn" aria-label="Recensione precedente" @click="showPrev">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
      </button>
      <button v-motion-tap-scale type="button" class="testimonials__nav-btn" aria-label="Recensione successiva" @click="showNext">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
      </button>
    </div>

    <div ref="sliderRef" class="testimonials__slider">
      <article
        v-for="(item, index) in safeItems"
        :key="item.id"
        v-motion-hover-lift
        :delay="index * 60"
        class="testimonials__card"
      >
        <p class="testimonials__stars" aria-label="Valutazione">
          {{ '*'.repeat(item.rating || 5) }}
        </p>
        <blockquote class="testimonials__quote">"{{ item.quote }}"</blockquote>
        <p class="testimonials__author">{{ item.author }}</p>
        <p class="testimonials__role">{{ item.role }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.testimonials {
  padding: clamp(1rem, 2.2vw, 1.7rem);
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 2px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.75), rgba(247, 241, 242, 0.58));
  box-shadow: 0 12px 26px rgba(36, 20, 26, 0.1);
}

.testimonials__controls {
  margin-top: -0.3rem;
  margin-bottom: 0.72rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
}

.testimonials__nav-btn {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(84, 44, 58, 0.24);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.76);
  color: #4d2a37;
  display: grid;
  place-items: center;
}

.testimonials__nav-btn .material-symbols-outlined {
  font-size: 1.1rem;
}

.testimonials__slider {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(240px, 1fr);
  gap: 0.72rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
}

.testimonials__card {
  scroll-snap-align: start;
  padding: 0.92rem 0.9rem;
  border: 1px solid rgba(84, 44, 58, 0.14);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.78);
}

.testimonials__stars {
  margin: 0;
  color: #ad6b30;
  font-size: 0.82rem;
  letter-spacing: 0.12em;
}

.testimonials__quote {
  margin: 0.5rem 0 0;
  color: rgba(60, 37, 45, 0.88);
  font-size: 0.9rem;
  line-height: 1.72;
}

.testimonials__author {
  margin: 0.7rem 0 0;
  color: #402430;
  font-size: 0.82rem;
  font-weight: 700;
}

.testimonials__role {
  margin: 0.08rem 0 0;
  color: rgba(64, 36, 48, 0.74);
  font-size: 0.74rem;
}
</style>
