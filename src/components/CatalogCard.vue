<script setup lang="ts">
import { computed } from "vue";
import { useRouter, type RouteLocationRaw } from "vue-router";

interface CatalogCardProps {
  title: string;
  subtitle?: string;
  price?: number;
  imgUrls?: string[];
  storeDisabeld?: string;
  to?: RouteLocationRaw;
}

const props = defineProps<CatalogCardProps>();
const router = useRouter();
const priceFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

const normalizedImages = computed(() =>
  (props.imgUrls ?? [])
    .map((url) => String(url ?? "").trim())
    .filter(Boolean),
);
const hasMedia = computed(() => Array.isArray(props.imgUrls));
const primaryImage = computed(() => normalizedImages.value[0] ?? "");
const secondaryImage = computed(() => normalizedImages.value[1] ?? "");
const hasSecondaryImage = computed(() => Boolean(secondaryImage.value));
const subtitleLabel = computed(() => props.subtitle?.trim() || "-");
const storeDisabledLabel = computed(() => String(props.storeDisabeld ?? "").trim());
const isClickable = computed(() => Boolean(props.to));
const formattedPrice = computed(() => {
  if (typeof props.price !== "number" || Number.isNaN(props.price)) return "-";
  return priceFormatter.format(props.price);
});

function isInteractiveTarget(target: EventTarget | null, root: HTMLElement | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const interactive = target.closest("a,button,input,textarea,select,label,[role='button'],[role='link']");
  return Boolean(interactive && interactive !== root);
}

function openDetail() {
  if (!props.to) {
    return;
  }
  router.push(props.to);
}

function onCardClick(event: MouseEvent) {
  const root = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  if (!props.to || isInteractiveTarget(event.target, root)) {
    return;
  }
  openDetail();
}

function onCardKeydown(event: KeyboardEvent) {
  if (!props.to) {
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openDetail();
  }
}
</script>

<template>
  <article
    class="catalog-card w-100 h-100"
    :class="{ 'catalog-card--clickable': isClickable, 'catalog-card--has-secondary': hasSecondaryImage }"
    :role="isClickable ? 'link' : undefined"
    :tabindex="isClickable ? 0 : undefined"
    @click="onCardClick"
    @keydown="onCardKeydown"
  >
    <div v-if="hasMedia" class="catalog-media">
      <div v-if="primaryImage" class="catalog-media-stack">
        <img :src="primaryImage" :alt="title" class="img-fluid catalog-img catalog-img--primary" />
        <img v-if="hasSecondaryImage" :src="secondaryImage" :alt="`${title} preview`" class="img-fluid catalog-img catalog-img--secondary" />
      </div>
      <div v-else class="catalog-media-placeholder">Nessuna immagine</div>
    </div>

    <div class="catalog-info">
      <h2 class="catalog-title">{{ title }}</h2>
      <p class="catalog-subtitle">{{ subtitleLabel }}</p>
      <p v-if="storeDisabledLabel" class="catalog-disabled-label">
        {{ storeDisabledLabel }}
      </p>
      <p class="catalog-price">{{ formattedPrice }}</p>
    </div>

    <div v-if="$slots.actions" class="catalog-actions" @click.stop>
      <slot name="actions" />
    </div>
  </article>
</template>

<style scoped>
.catalog-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 2px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.56), rgba(247, 241, 242, 0.36));
  backdrop-filter: blur(10px) saturate(145%);
  -webkit-backdrop-filter: blur(10px) saturate(145%);
  box-shadow: 0 8px 20px rgba(45, 23, 31, 0.12);
  animation: card-enter 420ms cubic-bezier(0.22, 0.85, 0.22, 1) both;
}

.catalog-card--clickable {
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.catalog-card--clickable:hover {
  transform: translateY(-2px);
  border-color: rgba(84, 44, 58, 0.32);
  box-shadow: 0 12px 22px rgba(45, 23, 31, 0.16);
}

.catalog-card--clickable:focus-visible {
  outline: none;
  border-color: rgba(84, 44, 58, 0.52);
  box-shadow: 0 0 0 2px rgba(232, 179, 190, 0.32), 0 10px 20px rgba(45, 23, 31, 0.14);
}

.catalog-card::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(125deg, rgba(255, 255, 255, 0.3), transparent 46%);
}

.catalog-media {
  width: 100%;  
  aspect-ratio: 4/3;
  display: grid;
  place-items: center;
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.22));
  border-radius: 2px;
}

.catalog-media-stack {
  position: relative;
  width: 100%;
  height: 100%;
}

.catalog-img {
  position: absolute;
  inset: 0;
  margin: auto;
  max-width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 360ms ease, transform 360ms ease;
}

.catalog-img--primary {
  opacity: 1;
  transform: scale(1);
}

.catalog-img--secondary {
  opacity: 0;
  transform: scale(1.03);
}

.catalog-card--has-secondary:hover .catalog-img--primary,
.catalog-card--has-secondary:focus-visible .catalog-img--primary {
  opacity: 0;
  transform: scale(0.98);
}

.catalog-card--has-secondary:hover .catalog-img--secondary,
.catalog-card--has-secondary:focus-visible .catalog-img--secondary {
  opacity: 1;
  transform: scale(1);
}

.catalog-media-placeholder {
  font-size: 0.85rem;
  color: rgba(75, 41, 53, 0.62);
}

.catalog-info {
  text-align: center;
}

.catalog-title {
  margin: 0 0 0.28rem;
  color: #4b2935;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.catalog-subtitle {
  margin: 0 0 0.45rem;
  color: rgba(75, 41, 53, 0.78);
  font-size: 0.84rem;
  font-weight: 500;
  line-height: 1.35;
}

.catalog-price {
  margin: 0;
  color: #2f2f2f;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.catalog-disabled-label {
  margin: 0 0 0.4rem;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8a1a1a;
}

.catalog-actions {
  margin-top: auto;
  display: grid;
  gap: 0.5rem;
}

:deep(.catalog-actions .btn) {
  border-radius: 2px;
  box-shadow: none;
}

:deep(.catalog-actions .btn:focus-visible) {
  box-shadow: none;
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .catalog-card {
    animation: none;
  }
}
</style>
