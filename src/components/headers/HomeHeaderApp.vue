<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { HomeContent } from '../../home/homeContent'

defineProps<{
  content: HomeContent['header']
}>()

const route = useRoute()
const routeName = computed(() => String(route.name ?? ''))

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

function isCatalogActive(key: 'products' | 'treatments') {
  const current = routeName.value
  if (key === 'products') return productRouteNames.has(current)
  if (key === 'treatments') return treatmentRouteNames.has(current)
  return false
}
</script>

<template>
  <header class="home-header">
    <div class="home-header__row row align-items-center g-2">
      <div class="col-auto">
        <RouterLink
          :to="{ name: 'home' }"
          class="home-header__brand text-decoration-none"
          :aria-label="`Vai alla home ${content.brandTitle}`"
        >
          <img class="home-header__logo" src="/img/logo/logo.png" :alt="`Logo ${content.brandTitle}`" />
          <span class="home-header__title">{{ content.brandTitle }}</span>
        </RouterLink>
      </div>

      <div class="col-12 col-lg">
        <nav class="home-header__catalog-nav" aria-label="Navigazione home">
          <a class="home-header__catalog-link text-decoration-none" href="#metodo">{{ content.methodLabel }}</a>
          <a class="home-header__catalog-link text-decoration-none" href="#case-studies">{{ content.pathsLabel }}</a>
          <RouterLink
            :to="{ name: 'ProductCategoriesView' }"
            class="home-header__catalog-link text-decoration-none"
            :class="{ 'is-active': isCatalogActive('products') }"
          >
            {{ content.productsLabel }}
          </RouterLink>
          <RouterLink
            :to="{ name: 'TreatmentCategoriesView' }"
            class="home-header__catalog-link text-decoration-none"
            :class="{ 'is-active': isCatalogActive('treatments') }"
          >
            {{ content.treatmentsLabel }}
          </RouterLink>
        </nav>
      </div>
    </div>
  </header>
</template>

<style scoped>
.home-header {
  position: sticky;
  top: 0;
  z-index: 20;
  width: var(--home-shell);
  margin: 0 auto;
  padding: clamp(0.55rem, 1.2vw, 0.85rem) 0.1rem;
}

.home-header__row {
  min-height: 56px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.56);
  backdrop-filter: blur(12px) saturate(145%);
  -webkit-backdrop-filter: blur(12px) saturate(145%);
  box-shadow: 0 10px 20px rgba(27, 16, 21, 0.1);
}

.home-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}

.home-header__logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.home-header__title {
  margin: 0;
  color: #4b2935;
  font-size: clamp(0.96rem, 2.2vw, 1.15rem);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: 'Cormorant Garamond', 'Times New Roman', Georgia, serif;
  white-space: nowrap;
}

.home-header__catalog-nav {
  flex: 1 0 100%;
  display: flex;
  justify-content: end;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.home-header__catalog-link {
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

.home-header__catalog-link::after {
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

.home-header__catalog-link:hover,
.home-header__catalog-link:focus-visible {
  color: #542c3a;
}

.home-header__catalog-link:hover::after,
.home-header__catalog-link.is-active::after {
  transform: scaleX(1);
}

.home-header__catalog-link.is-active {
  color: #542c3a;
}

@media (max-width: 991.98px) {
  .home-header__catalog-nav {
    justify-content: flex-start;
  }
}

@media (max-width: 575.98px) {
  .home-header {
    padding-left: 0;
    padding-right: 0;
  }

  .home-header__row {
    padding: 6px 8px;
  }

  .home-header__logo {
    width: 42px;
    height: 42px;
  }

  .home-header__title {
    font-size: 0.88rem;
  }

  .home-header__catalog-nav {
    gap: 0.85rem;
    overflow-x: auto;
    flex-wrap: nowrap;
    scrollbar-width: thin;
  }

  .home-header__catalog-link {
    white-space: nowrap;
    font-size: 0.72rem;
  }
}
</style>
