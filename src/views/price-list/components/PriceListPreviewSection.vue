<script setup lang="ts">
import { computed } from 'vue'
import type { PriceListCategory } from '../priceListData'

type PreviewCategory = {
  id: string
  title: string
  previewItems: PriceListCategory['items']
  hiddenCount: number
}

const props = withDefaults(defineProps<{
  title: string
  description: string
  categories: PriceListCategory[]
  emptyLabel?: string
  maxItemsPerCategory?: number
}>(), {
  emptyLabel: 'Nessuna voce disponibile al momento.',
  maxItemsPerCategory: 4,
})

const previewCategories = computed<PreviewCategory[]>(() => {
  return props.categories.map((category) => ({
    id: category.id,
    title: category.title,
    previewItems: category.items.slice(0, props.maxItemsPerCategory),
    hiddenCount: Math.max(0, category.items.length - props.maxItemsPerCategory),
  }))
})
</script>

<template>
  <section class="price-preview-section">
    <header class="price-preview-section__head">
      <h2 class="price-preview-section__title">{{ title }}</h2>
      <p class="price-preview-section__description">{{ description }}</p>
    </header>

    <p v-if="!previewCategories.length" class="price-preview-section__empty">{{ emptyLabel }}</p>

    <div v-else class="price-preview-grid">
      <article v-for="category in previewCategories" :key="category.id" class="price-preview-category">
        <header class="price-preview-category__head">
          <h3 class="price-preview-category__title">{{ category.title }}</h3>
        </header>

        <ul class="price-preview-list">
          <li v-for="item in category.previewItems" :key="item.id" class="price-preview-item">
            <div class="price-preview-item__main">
              <p class="price-preview-item__title">{{ item.title }}</p>
              <p v-if="item.subtitle" class="price-preview-item__subtitle">{{ item.subtitle }}</p>
              <p v-if="item.description" class="price-preview-item__description">{{ item.description }}</p>
              <p v-if="item.storeDisabledReason" class="price-preview-item__note">
                Non disponibile: {{ item.storeDisabledReason }}
              </p>
            </div>
            <strong class="price-preview-item__price">{{ item.formattedPrice }}</strong>
          </li>
        </ul>

        <p v-if="category.hiddenCount > 0" class="price-preview-category__more">
          +{{ category.hiddenCount }} altre voci nel PDF completo
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped lang="scss">
.price-preview-section {
  display: grid;
  gap: 0.9rem;
}

.price-preview-section__head {
  display: grid;
  gap: 0.35rem;
}

.price-preview-section__title {
  margin: 0;
  color: #4b2935;
  font-size: clamp(1.05rem, 1.6vw, 1.3rem);
  letter-spacing: 0.02em;
}

.price-preview-section__description {
  margin: 0;
  color: rgba(61, 42, 50, 0.86);
  font-size: 0.88rem;
  line-height: 1.5;
}

.price-preview-section__empty {
  margin: 0;
  padding: 0.85rem 0.95rem;
  border: 1px dashed rgba(84, 44, 58, 0.34);
  border-radius: 16px;
  color: rgba(61, 42, 50, 0.78);
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.72);
}

.price-preview-grid {
  display: grid;
  gap: 0.75rem;
}

.price-preview-category {
  border: 1px solid rgba(84, 44, 58, 0.16);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.84);
  overflow: hidden;
}

.price-preview-category__head {
  padding: 0.7rem 0.9rem;
  border-bottom: 1px solid rgba(84, 44, 58, 0.1);
  background: linear-gradient(120deg, rgba(232, 179, 190, 0.3), rgba(255, 255, 255, 0.78));
}

.price-preview-category__title {
  margin: 0;
  font-size: 0.86rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4b2935;
}

.price-preview-list {
  list-style: none;
  margin: 0;
  padding: 0.25rem 0.75rem 0.55rem;
  display: grid;
  gap: 0.35rem;
}

.price-preview-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.55rem 0.4rem;
  border-bottom: 1px dashed rgba(84, 44, 58, 0.12);
}

.price-preview-item:last-child {
  border-bottom: 0;
}

.price-preview-item__main {
  min-width: 0;
}

.price-preview-item__title {
  margin: 0;
  color: #2f1f25;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.28;
}

.price-preview-item__subtitle {
  margin: 0.18rem 0 0;
  color: rgba(56, 39, 46, 0.76);
  font-size: 0.74rem;
  line-height: 1.35;
}

.price-preview-item__description {
  margin: 0.18rem 0 0;
  color: rgba(56, 39, 46, 0.72);
  font-size: 0.7rem;
  line-height: 1.34;
}

.price-preview-item__note {
  margin: 0.22rem 0 0;
  color: #8e3248;
  font-size: 0.71rem;
  line-height: 1.35;
}

.price-preview-item__price {
  font-size: 0.87rem;
  color: #4b2935;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.price-preview-category__more {
  margin: 0;
  padding: 0.15rem 1rem 0.85rem;
  color: rgba(75, 41, 53, 0.75);
  font-size: 0.73rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

@media (max-width: 767.98px) {
  .price-preview-item__price {
    font-size: 0.81rem;
  }
}
</style>
