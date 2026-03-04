<script setup lang="ts">
const railAnchors = [
  { id: 'hero', label: 'Hero' },
  { id: 'quick-access', label: 'Accesso' },
  { id: 'featured-treatments', label: 'Trattamenti' },
  { id: 'featured-products', label: 'Prodotti' },
  { id: 'gallery', label: 'Galleria' },
  { id: 'contact', label: 'Contatti' },
]
</script>

<template>
  <div class="home-rails" aria-hidden="true">
    <nav class="home-rails__left">
      <a
        v-for="(anchor, index) in railAnchors"
        :key="anchor.id"
        v-motion-hover-lift
        :href="`#${anchor.id}`"
        class="home-rails__dot text-decoration-none"
        :style="{ transitionDelay: `${index * 40}ms` }"
      >
        <span class="home-rails__dot-core"></span>
        <span class="home-rails__label">{{ anchor.label }}</span>
      </a>
    </nav>

    <div class="home-rails__right">
      <RouterLink v-motion-hover-lift :to="{ name: 'TreatmentCategoriesView' }" class="home-rails__chip text-decoration-none">
        Trattamenti
      </RouterLink>
      <RouterLink v-motion-hover-lift :to="{ name: 'ProductCategoriesView' }" class="home-rails__chip text-decoration-none">
        Prodotti
      </RouterLink>
      <RouterLink v-motion-hover-lift :to="{ name: 'TreatmentsView' }" class="home-rails__chip text-decoration-none">
        Catalogo
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.home-rails {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1018;
}

.home-rails__left {
  position: absolute;
  left: clamp(8px, 1.6vw, 20px);
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  gap: 0.44rem;
}

.home-rails__dot {
  pointer-events: auto;
  min-height: 26px;
  padding: 0 0.36rem;
  border: 1px solid rgba(84, 44, 58, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.74);
  color: rgba(72, 43, 53, 0.8);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.24rem;
  width: fit-content;
}

.home-rails__dot-core {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: linear-gradient(120deg, #8f5a6e, #e0b98e);
}

.home-rails__right {
  position: absolute;
  right: clamp(8px, 1.6vw, 20px);
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  gap: 0.42rem;
}

.home-rails__chip {
  pointer-events: auto;
  min-height: 30px;
  padding: 0 0.56rem;
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.78);
  color: #4a2735;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 1280px) {
  .home-rails {
    display: none;
  }
}
</style>
