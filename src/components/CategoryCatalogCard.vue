<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'

interface CategoryCatalogCardProps {
  title: string
  subtitle?: string
  imgUrls?: string[]
  count?: number
  countLabel?: string
  to?: RouteLocationRaw
}

const props = withDefaults(defineProps<CategoryCatalogCardProps>(), {
  countLabel: 'elementi'
})

const router = useRouter()
const imageUrl = computed(() =>
  (props.imgUrls ?? [])
    .map((url) => String(url ?? '').trim())
    .find(Boolean) ?? ''
)
const safeCount = computed(() => (typeof props.count === 'number' && props.count >= 0 ? props.count : 0))
const isClickable = computed(() => Boolean(props.to))

function openDetail() {
  if (!props.to) return
  router.push(props.to)
}

function isInteractiveTarget(target: EventTarget | null, root: HTMLElement | null) {
  if (!(target instanceof HTMLElement)) return false
  const interactive = target.closest('a,button,input,textarea,select,label,[role=\'button\'],[role=\'link\']')
  return Boolean(interactive && interactive !== root)
}

function onCardClick(event: MouseEvent) {
  const root = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  if (!props.to || isInteractiveTarget(event.target, root)) return
  openDetail()
}

function onCardKeydown(event: KeyboardEvent) {
  if (!props.to) return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    openDetail()
  }
}
</script>

<template>
  <article
    class="category-card"
    :class="{ 'category-card--clickable': isClickable }"
    :role="isClickable ? 'link' : undefined"
    :tabindex="isClickable ? 0 : undefined"
    @click="onCardClick"
    @keydown="onCardKeydown"
  >
    <div class="category-card__media">
      <img v-if="imageUrl" :src="imageUrl" :alt="title" class="category-card__image" />
      <div v-else class="category-card__placeholder">Nessuna immagine</div>
      <div class="category-card__overlay"></div>
    </div>

    <div class="category-card__content">
      <h2 class="category-card__title">{{ title }}</h2>
      <p class="category-card__subtitle">{{ subtitle || 'Categoria' }}</p>
      <p class="category-card__count">{{ safeCount }} {{ countLabel }}</p>
    </div>
  </article>
</template>

<style scoped>
.category-card {
  position: relative;
  overflow: hidden;
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.62), rgba(247, 241, 242, 0.38));
  box-shadow: 0 10px 24px rgba(45, 23, 31, 0.14);
  min-height: 240px;
  animation: card-enter 360ms cubic-bezier(0.22, 0.85, 0.22, 1) both;
}

.category-card--clickable {
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.category-card--clickable:hover {
  transform: translateY(-3px);
  border-color: rgba(84, 44, 58, 0.36);
  box-shadow: 0 14px 28px rgba(45, 23, 31, 0.18);
}

.category-card--clickable:focus-visible {
  outline: none;
  border-color: rgba(84, 44, 58, 0.58);
  box-shadow: 0 0 0 2px rgba(232, 179, 190, 0.34), 0 14px 28px rgba(45, 23, 31, 0.18);
}

.category-card__media {
  position: absolute;
  inset: 0;
}

.category-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.01);
}

.category-card__placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 0.86rem;
  color: rgba(75, 41, 53, 0.58);
  background: rgba(247, 241, 242, 0.6);
}

.category-card__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(170deg, rgba(39, 21, 28, 0.04) 0%, rgba(39, 21, 28, 0.68) 95%);
}

.category-card__content {
  position: relative;
  z-index: 1;
  height: 100%;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.3rem;
  padding: 1rem;
}

.category-card__title {
  margin: 0;
  color: #fffafc;
  font-size: clamp(1.15rem, 2.1vw, 1.6rem);
  font-weight: 700;
  line-height: 1.12;
}

.category-card__subtitle {
  margin: 0;
  color: rgba(255, 248, 251, 0.86);
  font-size: 0.85rem;
  line-height: 1.4;
}

.category-card__count {
  margin: 0.15rem 0 0;
  width: fit-content;
  min-height: 24px;
  padding: 0 0.55rem;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.8);
  color: #4b2935;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .category-card {
    animation: none;
  }
}
</style>
