<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const routeName = computed(() => String(route.name ?? ''))

const navItems = [
  { key: 'home', label: 'Home', to: { name: 'home' } },
  { key: 'products', label: 'Prodotti', to: { name: 'ProductCategoriesView' } },
  { key: 'treatments', label: 'Trattamenti', to: { name: 'TreatmentCategoriesView' } },
] as const

const productRouteNames = new Set([
  'ProductCategoriesView',
  'ProductsView',
  'ProductView',
  'ProductsManageView',
  'ProductCategoriesManageView',
  'ProductEditView',
])

const treatmentRouteNames = new Set([
  'TreatmentCategoriesView',
  'TreatmentsView',
  'TreatmentView',
  'TreatmentsManageView',
  'TreatmentCategoriesManageView',
  'TreatmentEditView',
])

function isNavActive(key: (typeof navItems)[number]['key']) {
  const current = routeName.value
  if (key === 'home') return current === 'home'
  if (key === 'products') return productRouteNames.has(current)
  if (key === 'treatments') return treatmentRouteNames.has(current)
  return false
}
</script>

<template>
  <nav class="app-header__catalog-nav" aria-label="Navigazione catalogo">
    <RouterLink
      v-for="item in navItems"
      :key="item.key"
      :to="item.to"
      class="app-header__catalog-link"
      :class="{ 'is-active': isNavActive(item.key) }"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.app-header__catalog-nav {
  flex: 1 0 100%;
  display: flex;
  justify-content: end;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.app-header__catalog-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.15rem 0.05rem 0.34rem;
  text-decoration: none;
  color: rgba(84, 44, 58, 0.72);
  font-family: 'Space Grotesk', Arial, sans-serif;
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: color 0.2s ease;
}

.app-header__catalog-link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.22s ease;
  background: linear-gradient(
    90deg,
    rgba(84, 44, 58, 0.96),
    rgba(232, 179, 190, 0.96),
    rgba(84, 44, 58, 0.96)
  );
}

.app-header__catalog-link:hover {
  color: #542c3a;
}

.app-header__catalog-link:hover::after,
.app-header__catalog-link.is-active::after {
  transform: scaleX(1);
}

.app-header__catalog-link.is-active {
  color: #542c3a;
}

@media (max-width: 575.98px) {
  .app-header__catalog-nav {
    justify-content: center;
    gap: 0.85rem;
    overflow-x: auto;
    flex-wrap: nowrap;
    scrollbar-width: thin;
  }

  .app-header__catalog-link {
    white-space: nowrap;
    font-size: 0.72rem;
  }
}
</style>
