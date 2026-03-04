<script setup lang="ts">
import { useMotion, useReducedMotion, type Variant } from '@vueuse/motion'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const reduceMotion = useReducedMotion()

const linksRootRef = ref<HTMLElement | null>(null)
const indicatorRef = ref<HTMLElement | null>(null)
const homeRef = ref<HTMLElement | null>(null)
const productsRef = ref<HTMLElement | null>(null)
const treatmentsRef = ref<HTMLElement | null>(null)

const indicatorMotion = useMotion(indicatorRef, {
  initial: { x: 0, width: 0, opacity: 0 },
  enter: { opacity: 1 },
}, {
  eventListeners: false,
  visibilityHooks: false,
  lifeCycleHooks: false,
})

const activeTab = computed<'home' | 'treatments' | 'products'>(() => {
  if ([
    'TreatmentCategoriesView',
    'TreatmentsView',
    'TreatmentView',
  ].includes(String(route.name ?? ''))) {
    return 'treatments'
  }

  if ([
    'ProductCategoriesView',
    'ProductsView',
    'ProductView',
  ].includes(String(route.name ?? ''))) {
    return 'products'
  }

  return 'home'
})

function getActiveElement() {
  if (activeTab.value === 'products') return productsRef.value
  if (activeTab.value === 'treatments') return treatmentsRef.value
  return homeRef.value
}

function updateIndicator() {
  const root = linksRootRef.value
  const activeElement = getActiveElement()
  if (!root || !activeElement) return

  const rootRect = root.getBoundingClientRect()
  const activeRect = activeElement.getBoundingClientRect()

  const nextVariant: Variant = {
    x: activeRect.left - rootRect.left,
    width: activeRect.width,
    opacity: 1,
    transition: reduceMotion.value
      ? { duration: 0 }
      : { type: 'spring', stiffness: 290, damping: 30, mass: 0.76 },
  }

  void indicatorMotion.apply(nextVariant)
}

function onWindowResize() {
  updateIndicator()
}

onMounted(async () => {
  await nextTick()
  updateIndicator()
  window.addEventListener('resize', onWindowResize, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
})

watch(
  () => route.fullPath,
  async () => {
    await nextTick()
    updateIndicator()
  },
)
</script>

<template>
  <header class="public-nav-shell">
    <div class="public-nav">
      <RouterLink :to="{ name: 'home' }" class="public-nav__brand text-decoration-none" aria-label="Vai alla home CNC Beauty">
        <img src="/img/logo/logo-bk.png" alt="Logo CNC Beauty" class="public-nav__logo" />
      </RouterLink>

      <nav ref="linksRootRef" class="public-nav__links" aria-label="Navigazione principale">
        <span ref="homeRef" class="public-nav__item">
          <RouterLink
            v-motion-tap-scale
            :to="{ name: 'home' }"
            class="public-nav__link text-decoration-none"
            :class="{ 'is-active': activeTab === 'home' }"
          >
            Home
          </RouterLink>
        </span>
        <span ref="productsRef" class="public-nav__item">
          <RouterLink
            v-motion-tap-scale
            :to="{ name: 'ProductCategoriesView' }"
            class="public-nav__link text-decoration-none"
            :class="{ 'is-active': activeTab === 'products' }"
          >
            Prodotti
          </RouterLink>
        </span>
        <span ref="treatmentsRef" class="public-nav__item">
          <RouterLink
            v-motion-tap-scale
            :to="{ name: 'TreatmentCategoriesView' }"
            class="public-nav__link text-decoration-none"
            :class="{ 'is-active': activeTab === 'treatments' }"
          >
            Trattamenti
          </RouterLink>
        </span>
        <span ref="indicatorRef" class="public-nav__indicator" aria-hidden="true"></span>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.public-nav-shell {
  position: sticky;
  top: 0;
  z-index: 1020;
  padding: 10px clamp(12px, 2.4vw, 30px);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  background: linear-gradient(180deg, rgba(247, 243, 245, 0.72), rgba(247, 243, 245, 0.18));
}

.public-nav {
  width: min(1260px, 100%);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 58px;
  padding: 8px clamp(8px, 2vw, 14px);
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 2px;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.78), rgba(246, 239, 243, 0.58));
  box-shadow: 0 12px 24px rgba(32, 19, 24, 0.09);
}

.public-nav::before,
.public-nav::after {
  content: "";
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(84, 44, 58, 0.38), transparent);
}

.public-nav::before {
  margin-right: 6px;
}

.public-nav::after {
  margin-left: 6px;
}

.public-nav__brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.public-nav__logo {
  width: clamp(104px, 13vw, 138px);
  height: auto;
  object-fit: contain;
}

.public-nav__links {
  position: relative;
  display: flex;
  align-items: center;
  gap: clamp(4px, 1.2vw, 10px);
  padding: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.66);
}

.public-nav__link {
  position: relative;
  z-index: 1;
  min-height: 34px;
  padding: 0 0.8rem;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(55, 32, 40, 0.86);
  font-size: 0.74rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
  transition: color 220ms ease;
}

.public-nav__item {
  position: relative;
  z-index: 1;
  display: inline-flex;
}

.public-nav__link:hover {
  color: #2f1922;
}

.public-nav__link.is-active {
  color: #3b1f2b;
}

.public-nav__indicator {
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 0;
  border-radius: 2px;
  pointer-events: none;
  background: linear-gradient(120deg, rgba(232, 179, 190, 0.68), rgba(226, 204, 173, 0.74));
  box-shadow: 0 8px 16px rgba(51, 29, 37, 0.15);
}

@media (max-width: 767.98px) {
  .public-nav::before,
  .public-nav::after {
    display: none;
  }

  .public-nav {
    flex-direction: column;
    align-items: stretch;
    min-height: auto;
  }

  .public-nav__brand {
    align-self: center;
  }

  .public-nav__links {
    justify-content: space-between;
    width: 100%;
    overflow-x: auto;
  }

  .public-nav__link {
    flex: 1 0 auto;
    font-size: 0.66rem;
    padding: 0 0.62rem;
  }
}
</style>
