<script setup lang="ts">
import { computed } from 'vue'
import type { CaseStudy } from '../types'
import ParallaxImage from './ParallaxImage.vue'
import { useScrollReveal } from '../composables/useScrollReveal'

const props = defineProps<{
  item: CaseStudy
  index: number
}>()

const { target, revealClass } = useScrollReveal({ threshold: 0.3, once: true })
void target

const paddedIndex = computed(() => String(props.index + 1).padStart(2, '0'))
</script>

<template>
  <article ref="target" class="home-case-slide home-reveal" :class="revealClass">
    <div class="home-case-slide__media">
      <ParallaxImage :src="item.image" :alt="item.title" :speed="0.055" />
    </div>

    <div class="home-case-slide__content">
      <p class="home-case-slide__index">{{ paddedIndex }}</p>
      <p class="home-case-slide__subtitle">{{ item.subtitle }}</p>
      <h3 class="home-case-slide__title">{{ item.title }}</h3>

      <ul class="home-case-slide__steps">
        <li>
          <strong>Problema</strong>
          <span>{{ item.problem }}</span>
        </li>
        <li>
          <strong>Intervento</strong>
          <span>{{ item.intervention }}</span>
        </li>
        <li>
          <strong>Risultato</strong>
          <span>{{ item.result }}</span>
        </li>
      </ul>

      <div class="home-case-slide__tags">
        <span v-for="tag in item.tags" :key="tag">{{ tag }}</span>
      </div>
    </div>
  </article>
</template>
