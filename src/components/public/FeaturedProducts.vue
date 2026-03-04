<script setup lang="ts">
import SectionHeader from './SectionHeader.vue'
import type { FeaturedShowcaseItem } from './types'

withDefaults(defineProps<{
  items: FeaturedShowcaseItem[]
}>(), {
  items: () => [],
})
</script>

<template>
  <section class="featured featured--products">
    <SectionHeader
      eyebrow="Beauty Routine"
      title="Prodotti in evidenza"
      description="Formula, texture e funzione: entra nella categoria per vedere tutti i prodotti disponibili."
    />

    <div class="featured__grid">
      <article
        v-for="(item, index) in items"
        :key="item.id"
        v-motion-hover-lift
        :delay="index * 70"
        class="featured__card"
      >
        <div class="featured__media">
          <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.title" loading="lazy" />
          <div v-else class="featured__placeholder">Prodotto</div>
        </div>

        <div class="featured__body">
          <p class="featured__category">{{ item.categoryLabel || 'Categoria prodotto' }}</p>
          <h3 class="featured__title">{{ item.title }}</h3>
          <p class="featured__subtitle">{{ item.subtitle || 'Selezione professionale per la tua routine quotidiana.' }}</p>
          <RouterLink
            v-motion-tap-scale
            :to="item.to"
            class="featured__cta text-decoration-none"
          >
            Scopri categoria
          </RouterLink>
        </div>
      </article>
    </div>

    <div class="featured__footer">
      <RouterLink
        v-motion-hover-lift
        :to="{ name: 'ProductCategoriesView' }"
        class="featured__all-link text-decoration-none"
      >
        Vedi tutte le categorie
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.featured {
  padding: clamp(1rem, 2.2vw, 1.7rem);
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 2px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.74), rgba(244, 240, 233, 0.55));
  box-shadow: 0 14px 30px rgba(35, 20, 25, 0.11);
}

.featured__grid {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(240px, 29%);
  gap: 0.82rem;
  overflow-x: auto;
  padding-bottom: 0.32rem;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
}

.featured__card {
  display: grid;
  grid-template-rows: 150px minmax(0, auto);
  border: 1px solid rgba(84, 44, 58, 0.14);
  border-radius: 2px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.74);
  scroll-snap-align: start;
}

.featured__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.featured__placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: rgba(77, 43, 56, 0.68);
  background: linear-gradient(120deg, rgba(232, 179, 190, 0.2), rgba(226, 205, 177, 0.3));
  font-size: 0.84rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
}

.featured__body {
  padding: 0.82rem;
  display: grid;
  gap: 0.24rem;
}

.featured__category {
  margin: 0;
  color: rgba(75, 41, 53, 0.7);
  font-size: 0.66rem;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  font-weight: 700;
}

.featured__title {
  margin: 0;
  color: #422530;
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: 1.28rem;
  line-height: 1.1;
}

.featured__subtitle {
  margin: 0;
  color: rgba(58, 36, 44, 0.82);
  font-size: 0.82rem;
  line-height: 1.5;
}

.featured__cta {
  margin-top: 0.38rem;
  min-height: 34px;
  width: fit-content;
  padding: 0 0.72rem;
  border: 1px solid rgba(84, 44, 58, 0.22);
  border-radius: 2px;
  color: #422531;
  background: rgba(255, 255, 255, 0.74);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

.featured__footer {
  margin-top: 0.94rem;
}

.featured__all-link {
  min-height: 40px;
  width: fit-content;
  padding: 0 0.9rem;
  border-radius: 2px;
  border: 1px solid rgba(84, 44, 58, 0.22);
  background: rgba(255, 255, 255, 0.75);
  color: #462634;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

@media (max-width: 575.98px) {
  .featured__grid {
    grid-auto-columns: minmax(80%, 1fr);
  }
}
</style>
