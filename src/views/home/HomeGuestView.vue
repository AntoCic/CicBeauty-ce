<script setup lang="ts">
import { cicKitStore } from 'cic-kit'
import { computed } from 'vue'
import LegalLinks from '../../components/LegalLinks.vue'

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
</script>

<template>
  <div class="home-page" :style="bgStyle">
    <section class="home-main">
      <img class="home-logo" src="/img/logo/logo.png" alt="Cic Beauty logo" />

      <div class="home-actions">
        <RouterLink :to="{ name: 'TreatmentCategoriesView' }" class="home-link home-btn home-btn--one">
          Treatments Catalog
        </RouterLink>
        <RouterLink :to="{ name: 'ProductCategoriesView' }" class="home-link home-btn home-btn--two">
          Products Catalog
        </RouterLink>
      </div>
    </section>

    <footer class="home-footer text-center">
      <LegalLinks />
    </footer>
  </div>
</template>

<style scoped lang="scss">
.home-page {
  --rose-dark: #542c3a;
  --rose-accent: #e8b3be;
  position: relative;
  height: 100%;
  width: 100%;
  display: grid;
  place-items: center;
  padding: clamp(20px, 3vw, 36px);
  overflow-x: hidden;
  overflow-y: auto;
  isolation: isolate;
}

.home-main {
  position: relative;
  z-index: 1;
  width: min(620px, 100%);
  padding: clamp(32px, 5vw, 46px);
  text-align: center;
  border-bottom: 1px solid rgba(84, 44, 58, 0.24);
}

.home-logo {
  width: min(280px, 62vw);
  height: auto;
  margin-bottom: 14px;
  filter: drop-shadow(0 10px 24px rgba(84, 44, 58, 0.18));
}

.home-actions {
  width: min(420px, 100%);
  margin: 20px auto 0;
  display: grid;
  gap: 12px;
}

.home-link {
  display: inline-block;
  color: #2f2f2f;
  text-decoration: none;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: color 0.2s ease;
  cursor: pointer;
}

.home-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 48px;
  border-radius: 2px;
  border: 1.5px solid rgba(84, 44, 58, 0.58);
  color: #3d2630;
  font-size: 0.74rem;
  font-weight: 600;
  background: transparent;
  box-shadow: none;
  opacity: 0;
  transform: translateY(20px) scale(0.97);
  animation: button-enter 700ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  transition:
    transform 0.24s ease,
    box-shadow 0.24s ease,
    border-color 0.24s ease,
    background 0.24s ease;
}

.home-btn:hover {
  transform: translateY(-2px) scale(1);
  border-color: rgba(84, 44, 58, 0.82);
  box-shadow: 0 10px 16px rgba(84, 44, 58, 0.12);
  background: transparent;
  color: #542c3a;
}

.home-btn--one {
  animation-delay: 140ms;
}

.home-btn--two {
  animation-delay: 270ms;
}

.hr-custom {
  margin: 2em 0;
  border-bottom: 1px solid rgba(84, 44, 58, 0.24);
}

.home-footer {
  margin-top: 16px;
  display: grid;
  gap: 8px;
  justify-items: center;
}

.home-footer .home-link:hover {
  color: var(--rose-accent);
}

@keyframes button-enter {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.97);
  }

  70% {
    opacity: 1;
    transform: translateY(-3px) scale(1.01);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 575.98px) {
  .home-main {
    padding: 24px 18px 42px;
  }

  .home-btn {
    min-height: 46px;
    font-size: 0.68rem;
  }
}
</style>
