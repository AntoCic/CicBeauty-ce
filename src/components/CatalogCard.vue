<script setup lang="ts">
import { computed } from "vue";

interface CatalogCardProps {
  title: string;
  subtitle?: string;
  price?: number;
  imgUrls?: string[];
  storeDisabeld?: string;
}

const props = defineProps<CatalogCardProps>();
const priceFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

const hasMedia = computed(() => Array.isArray(props.imgUrls));
const primaryImage = computed(() => props.imgUrls?.find((url) => String(url ?? "").trim()) ?? "");
const subtitleLabel = computed(() => props.subtitle?.trim() || "-");
const storeDisabledLabel = computed(() => String(props.storeDisabeld ?? "").trim());
const formattedPrice = computed(() => {
  if (typeof props.price !== "number" || Number.isNaN(props.price)) return "-";
  return priceFormatter.format(props.price);
});
</script>

<template>
  <article class="catalog-card w-100 h-100">
    <div v-if="hasMedia" class="catalog-media">
      <img v-if="primaryImage" :src="primaryImage" :alt="title" class="img-fluid catalog-img" />
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

    <div v-if="$slots.actions" class="catalog-actions">
      <slot name="actions" />
    </div>
  </article>
</template>

<style scoped>
.catalog-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.1rem;
  border: 1px solid rgba(0, 0, 0, 0.18);
  background-color: rgba(255, 255, 255, 0.42);
}

.catalog-media {
  min-height: 12.5rem;
  display: grid;
  place-items: center;
}

.catalog-img {
  max-height: 12.5rem;
  object-fit: contain;
}

.catalog-media-placeholder {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.62);
}

.catalog-info {
  text-align: center;
}

.catalog-title {
  margin-bottom: 0.35rem;
  font-size: 1rem;
  font-weight: 500;
}

.catalog-subtitle {
  margin-bottom: 0.35rem;
  color: rgba(0, 0, 0, 0.72);
}

.catalog-price {
  margin-bottom: 0;
  font-weight: 600;
}

.catalog-disabled-label {
  margin-bottom: 0.4rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #8a1a1a;
}

.catalog-actions {
  margin-top: auto;
  display: grid;
  gap: 0.55rem;
}

:deep(.catalog-actions .btn) {
  border-radius: 0;
  box-shadow: none;
}

:deep(.catalog-actions .btn:focus-visible) {
  box-shadow: none;
}
</style>
