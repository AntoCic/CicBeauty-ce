<script setup lang="ts">
import type { PublicBreadcrumbItem } from './types'

defineProps<{
  items: PublicBreadcrumbItem[]
}>()
</script>

<template>
  <nav v-motion-fade-in class="public-breadcrumb" aria-label="Breadcrumb">
    <ol class="public-breadcrumb__list">
      <li v-for="(item, index) in items" :key="`${item.label}-${index}`" class="public-breadcrumb__item">
        <RouterLink
          v-if="item.to"
          v-motion-tap-scale
          :to="item.to"
          class="public-breadcrumb__link text-decoration-none"
        >
          {{ item.label }}
        </RouterLink>
        <span v-else class="public-breadcrumb__current" aria-current="page">{{ item.label }}</span>

        <span v-if="index < items.length - 1" class="public-breadcrumb__separator" aria-hidden="true">/</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.public-breadcrumb {
  margin-bottom: 0.72rem;
}

.public-breadcrumb__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.26rem;
}

.public-breadcrumb__item {
  display: inline-flex;
  align-items: center;
  gap: 0.26rem;
  min-height: 24px;
}

.public-breadcrumb__link {
  color: rgba(70, 43, 54, 0.78);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
  transition: color 180ms ease;
}

.public-breadcrumb__link:hover {
  color: #4f2a39;
}

.public-breadcrumb__current {
  color: #4d2937;
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 700;
}

.public-breadcrumb__separator {
  color: rgba(77, 41, 55, 0.4);
  font-size: 0.74rem;
}
</style>

