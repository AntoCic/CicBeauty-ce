<script setup lang="ts">
import type { PublicBreadcrumbItem, PublicSideLink } from './types'

withDefaults(defineProps<{
  title?: string
  subtitle?: string
  breadcrumbs: PublicBreadcrumbItem[]
  links?: PublicSideLink[]
}>(), {
  title: 'Navigazione',
  subtitle: '',
  links: () => [],
})
</script>

<template>
  <aside class="side-nav">
    <div v-motion-soft-spring class="side-nav__card">
      <p class="side-nav__eyebrow">Orientation</p>
      <h2 class="side-nav__title">{{ title }}</h2>
      <p v-if="subtitle" class="side-nav__subtitle">{{ subtitle }}</p>

      <ol class="side-nav__path" aria-label="Percorso corrente">
        <li v-for="(item, index) in breadcrumbs" :key="`${item.label}-${index}`" class="side-nav__path-item">
          <RouterLink
            v-if="item.to"
            v-motion-tap-scale
            :to="item.to"
            class="side-nav__path-link text-decoration-none"
          >
            {{ item.label }}
          </RouterLink>
          <span v-else class="side-nav__path-current">{{ item.label }}</span>
        </li>
      </ol>

      <nav v-if="links.length" class="side-nav__links" aria-label="Link rapidi pagina">
        <RouterLink
          v-for="(link, index) in links"
          :key="`${link.label}-${index}`"
          v-motion-hover-lift
          :to="link.to"
          class="side-nav__link text-decoration-none"
        >
          <span v-if="link.icon" class="material-symbols-outlined side-nav__link-icon" aria-hidden="true">
            {{ link.icon }}
          </span>
          <span>{{ link.label }}</span>
        </RouterLink>
      </nav>
    </div>
  </aside>
</template>

<style scoped>
.side-nav {
  position: relative;
}

.side-nav__card {
  position: sticky;
  top: 88px;
  padding: 0.95rem 0.82rem;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 2px;
  background:
    radial-gradient(circle at 100% 0%, rgba(232, 179, 190, 0.22), transparent 45%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.78), rgba(245, 239, 231, 0.66));
  box-shadow: 0 12px 22px rgba(31, 18, 24, 0.11);
}

.side-nav__eyebrow {
  margin: 0;
  color: rgba(78, 43, 56, 0.68);
  font-size: 0.62rem;
  letter-spacing: 0.17em;
  text-transform: uppercase;
  font-weight: 700;
}

.side-nav__title {
  margin: 0.34rem 0 0;
  color: #412330;
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: 1.42rem;
  line-height: 1.1;
}

.side-nav__subtitle {
  margin: 0.32rem 0 0;
  color: rgba(59, 38, 46, 0.82);
  font-size: 0.78rem;
  line-height: 1.5;
}

.side-nav__path {
  margin: 0.78rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.26rem;
}

.side-nav__path-item {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
}

.side-nav__path-link {
  color: rgba(67, 40, 50, 0.8);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 700;
}

.side-nav__path-current {
  color: #422531;
  font-size: 0.72rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  font-weight: 700;
}

.side-nav__links {
  margin-top: 0.8rem;
  display: grid;
  gap: 0.36rem;
}

.side-nav__link {
  min-height: 36px;
  padding: 0 0.55rem;
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 2px;
  color: #472733;
  background: rgba(255, 255, 255, 0.78);
  font-size: 0.67rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
}

.side-nav__link-icon {
  font-size: 1rem;
}

@media (max-width: 991.98px) {
  .side-nav {
    display: none;
  }
}
</style>

