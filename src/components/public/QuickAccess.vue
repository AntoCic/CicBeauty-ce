<script setup lang="ts">
import { useMotion, useReducedMotion, type Variant } from '@vueuse/motion'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CategoryGrid from './CategoryGrid.vue'
import SectionHeader from './SectionHeader.vue'
import type { ShowcaseCategory } from './types'

const props = defineProps<{
  treatmentCategories: ShowcaseCategory[]
  productCategories: ShowcaseCategory[]
}>()

const activeType = ref<'treatments' | 'products'>('treatments')
const tabsRef = ref<HTMLElement | null>(null)
const indicatorRef = ref<HTMLElement | null>(null)
const treatmentsTabRef = ref<HTMLElement | null>(null)
const productsTabRef = ref<HTMLElement | null>(null)

const reduceMotion = useReducedMotion()
const indicatorMotion = useMotion(indicatorRef, {
  initial: { opacity: 0, x: 0, width: 0 },
  enter: { opacity: 1 },
}, {
  eventListeners: false,
  visibilityHooks: false,
  lifeCycleHooks: false,
})

const categoriesForCurrentTab = computed(() =>
  activeType.value === 'treatments' ? props.treatmentCategories : props.productCategories,
)

const ctaRoute = computed(() =>
  activeType.value === 'treatments'
    ? { name: 'TreatmentCategoriesView' }
    : { name: 'ProductCategoriesView' },
)

const ctaLabel = computed(() =>
  activeType.value === 'treatments'
    ? 'Vedi tutte le categorie trattamenti'
    : 'Vedi tutte le categorie prodotti',
)

function updateIndicator() {
  const tabsElement = tabsRef.value
  const activeElement = activeType.value === 'treatments' ? treatmentsTabRef.value : productsTabRef.value
  if (!tabsElement || !activeElement) return

  const tabsRect = tabsElement.getBoundingClientRect()
  const activeRect = activeElement.getBoundingClientRect()

  const nextState: Variant = {
    opacity: 1,
    x: activeRect.left - tabsRect.left,
    width: activeRect.width,
    transition: reduceMotion.value
      ? { duration: 0 }
      : { type: 'spring', stiffness: 280, damping: 28, mass: 0.78 },
  }

  void indicatorMotion.apply(nextState)
}

function selectType(type: 'treatments' | 'products') {
  activeType.value = type
}

function onResize() {
  updateIndicator()
}

watch(activeType, async () => {
  await nextTick()
  updateIndicator()
})

onMounted(async () => {
  await nextTick()
  updateIndicator()
  window.addEventListener('resize', onResize, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <section class="quick-access">
    <SectionHeader
      align="center"
      eyebrow="Accesso Rapido"
      title="Scegli da dove iniziare"
      description="Apri subito la categoria giusta: prima il percorso, poi il dettaglio."
    />

    <div ref="tabsRef" class="quick-access__tabs" role="tablist" aria-label="Cataloghi disponibili">
      <button
        ref="treatmentsTabRef"
        v-motion-tap-scale
        type="button"
        class="quick-access__tab"
        :class="{ 'is-active': activeType === 'treatments' }"
        role="tab"
        :aria-selected="activeType === 'treatments'"
        @click="selectType('treatments')"
      >
        Trattamenti
      </button>
      <button
        ref="productsTabRef"
        v-motion-tap-scale
        type="button"
        class="quick-access__tab"
        :class="{ 'is-active': activeType === 'products' }"
        role="tab"
        :aria-selected="activeType === 'products'"
        @click="selectType('products')"
      >
        Prodotti
      </button>
      <span ref="indicatorRef" class="quick-access__indicator" aria-hidden="true"></span>
    </div>

    <div v-motion-fade-up :delay="120" class="quick-access__content">
      <CategoryGrid
        :items="categoriesForCurrentTab"
        :count-label="activeType === 'treatments' ? 'trattamenti' : 'prodotti'"
        empty-text="Stiamo preparando le categorie. Torna tra poco."
      />
    </div>

    <div v-motion-fade-up :delay="180" class="quick-access__cta">
      <RouterLink v-motion-hover-lift :to="ctaRoute" class="quick-access__cta-link text-decoration-none">
        {{ ctaLabel }}
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.quick-access {
  position: relative;
  padding: clamp(1.1rem, 2.2vw, 1.85rem);
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 2px;
  background: linear-gradient(130deg, rgba(255, 255, 255, 0.72), rgba(247, 241, 242, 0.56));
  box-shadow: 0 14px 28px rgba(35, 20, 25, 0.12);
}

.quick-access__tabs {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  width: min(420px, 100%);
  margin: 0 auto 1rem;
  padding: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.84);
}

.quick-access__tab {
  position: relative;
  z-index: 1;
  min-height: 40px;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: rgba(70, 40, 50, 0.85);
  font-size: 0.73rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  transition: color 200ms ease;
}

.quick-access__tab.is-active {
  color: #3a1f2b;
}

.quick-access__indicator {
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 0;
  border-radius: 2px;
  background: linear-gradient(120deg, rgba(232, 179, 190, 0.68), rgba(226, 205, 177, 0.7));
  box-shadow: 0 8px 14px rgba(49, 27, 35, 0.15);
}

.quick-access__content {
  margin-top: 0.8rem;
}

.quick-access__cta {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
}

.quick-access__cta-link {
  min-height: 42px;
  padding: 0 1rem;
  border-radius: 2px;
  border: 1px solid rgba(78, 43, 56, 0.28);
  background: rgba(255, 255, 255, 0.74);
  color: #4a2735;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 180ms ease, color 180ms ease;
}

.quick-access__cta-link:hover {
  color: #351a25;
  background: rgba(248, 239, 234, 0.88);
}

@media (max-width: 575.98px) {
  .quick-access {
    padding: 0.92rem;
  }

  .quick-access__tab {
    font-size: 0.66rem;
    min-height: 38px;
  }
}
</style>
