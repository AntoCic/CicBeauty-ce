<script setup lang="ts">
import SectionTitle from '../components/SectionTitle.vue'
import { useScrollReveal } from '../composables/useScrollReveal'
import type { HomeContent } from '../homeContent'

defineProps<{
  content: HomeContent['credibility']
}>()

const { target: lineTarget, revealClass } = useScrollReveal({ threshold: 0.35, once: true })
void lineTarget
</script>

<template>
  <section id="credibilita" class="home-credibility home-panel">
    <SectionTitle
      :eyebrow="content.eyebrow"
      :title="content.title"
      :description="content.description"
    />

    <div ref="lineTarget" class="home-credibility__logos home-reveal" :class="revealClass">
      <p class="home-credibility__logos-label">{{ content.technologiesLabel }}</p>
      <div class="home-credibility__logos-grid">
        <span v-for="item in content.technologies" :key="item">{{ item }}</span>
      </div>
    </div>

    <div class="home-credibility__line home-draw-line" :class="revealClass"></div>

    <div class="home-credibility__stats">
      <article v-for="item in content.stats" :key="item.label" class="home-credibility__stat home-reveal" :class="revealClass">
        <p class="home-credibility__value">{{ item.value }}</p>
        <p class="home-credibility__label">{{ item.label }}</p>
      </article>
    </div>

    <div class="home-credibility__quotes">
      <blockquote v-for="quote in content.quotes" :key="quote.author" class="home-credibility__quote home-reveal" :class="revealClass">
        <p>"{{ quote.text }}"</p>
        <cite>{{ quote.author }}</cite>
      </blockquote>
    </div>
  </section>
</template>
