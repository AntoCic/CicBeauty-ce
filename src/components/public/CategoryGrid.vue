<script setup lang="ts">
import { computed } from 'vue'
import type { ShowcaseCategory } from './types'

const props = withDefaults(defineProps<{
  items: ShowcaseCategory[]
  countLabel?: string
  emptyText?: string
}>(), {
  countLabel: 'elementi',
  emptyText: 'Categorie in aggiornamento.',
})

const normalizedItems = computed(() =>
  props.items.map((item) => ({
    ...item,
    subtitle: String(item.subtitle ?? '').trim(),
    emoji: String(item.emoji ?? '').trim(),
    count: typeof item.count === 'number' && item.count >= 0 ? item.count : 0,
  })),
)
</script>

<template>
  <div class="category-grid">
    <RouterLink
      v-for="(item, index) in normalizedItems"
      :key="item.id"
      v-motion-hover-lift
      :delay="index * 60"
      :to="item.to"
      class="category-grid__card text-decoration-none"
    >
      <div class="category-grid__visual">
        <img v-if="item.imageUrl" :src="item.imageUrl" :alt="`Categoria ${item.title}`" loading="lazy" />
      <div v-else class="category-grid__placeholder">
          <span>{{ item.emoji || '*' }}</span>
      </div>
      </div>

      <div class="category-grid__body">
        <h3 class="category-grid__title">
          <span v-if="item.emoji" class="category-grid__emoji" aria-hidden="true">{{ item.emoji }}</span>
          {{ item.title }}
        </h3>
        <p class="category-grid__subtitle">{{ item.subtitle || 'Percorso personalizzato' }}</p>
        <p class="category-grid__meta">{{ item.count }} {{ countLabel }}</p>
      </div>
    </RouterLink>

    <p v-if="!normalizedItems.length" class="category-grid__empty">{{ emptyText }}</p>
  </div>
</template>

<style scoped>
.category-grid {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}

.category-grid__card {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-rows: 126px minmax(0, auto);
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 2px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(247, 241, 242, 0.48));
  box-shadow: 0 8px 20px rgba(36, 20, 26, 0.11);
}

.category-grid__visual {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(120deg, rgba(84, 44, 58, 0.08), rgba(229, 207, 176, 0.2));
}

.category-grid__visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.category-grid__placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: rgba(84, 44, 58, 0.7);
  font-size: 1.6rem;
}

.category-grid__body {
  padding: 0.78rem 0.82rem 0.9rem;
  display: grid;
  gap: 0.26rem;
}

.category-grid__title {
  margin: 0;
  color: #442532;
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: 1.24rem;
  line-height: 1.1;
}

.category-grid__emoji {
  margin-right: 0.2rem;
}

.category-grid__subtitle {
  margin: 0;
  color: rgba(68, 37, 50, 0.78);
  font-size: 0.82rem;
  line-height: 1.4;
}

.category-grid__meta {
  margin: 0.18rem 0 0;
  justify-self: start;
  min-height: 24px;
  padding: 0 0.56rem;
  border: 1px solid rgba(84, 44, 58, 0.24);
  border-radius: 2px;
  color: #4f2b38;
  background: rgba(255, 255, 255, 0.72);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

.category-grid__empty {
  margin: 0;
  text-align: center;
  color: rgba(75, 41, 53, 0.65);
  font-size: 0.86rem;
}
</style>
