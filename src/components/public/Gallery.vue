<script setup lang="ts">
import { computed, ref } from 'vue'
import SectionHeader from './SectionHeader.vue'
import type { GalleryItem } from './types'

const props = withDefaults(defineProps<{
  items?: GalleryItem[]
}>(), {
  items: () => [],
})

const safeItems = computed(() =>
  props.items.filter((item) => String(item.imageUrl ?? '').trim()),
)
const selectedIndex = ref<number | null>(null)

const selectedImage = computed(() => {
  if (selectedIndex.value === null) return null
  return safeItems.value[selectedIndex.value] ?? null
})

function openLightbox(index: number) {
  selectedIndex.value = index
}

function closeLightbox() {
  selectedIndex.value = null
}

function showNext() {
  if (selectedIndex.value === null || !safeItems.value.length) return
  selectedIndex.value = (selectedIndex.value + 1) % safeItems.value.length
}

function showPrev() {
  if (selectedIndex.value === null || !safeItems.value.length) return
  selectedIndex.value = ((selectedIndex.value - 1) % safeItems.value.length + safeItems.value.length) % safeItems.value.length
}
</script>

<template>
  <section class="gallery">
    <SectionHeader
      eyebrow="Atmosfera"
      title="Dentro il centro"
      description="Scorci dell'ambiente e dei dettagli che definiscono l'esperienza CNC Beauty."
    />

    <div class="gallery__grid">
      <button
        v-for="(item, index) in safeItems"
        :key="item.id"
        v-motion-hover-lift
        :delay="index * 40"
        type="button"
        class="gallery__item"
        :aria-label="`Apri immagine ${item.alt}`"
        @click="openLightbox(index)"
      >
        <img :src="item.imageUrl" :alt="item.alt" loading="lazy" />
        <span class="gallery__overlay">
          <span class="material-symbols-outlined" aria-hidden="true">open_in_full</span>
        </span>
      </button>
    </div>

    <div v-if="selectedImage" class="gallery__lightbox" role="dialog" aria-modal="true" :aria-label="selectedImage.alt">
      <button type="button" class="gallery__backdrop" aria-label="Chiudi galleria" @click="closeLightbox"></button>

      <div v-motion-scale-in class="gallery__lightbox-content">
        <button v-motion-tap-scale type="button" class="gallery__lightbox-btn gallery__lightbox-btn--close" aria-label="Chiudi" @click="closeLightbox">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <button v-motion-tap-scale type="button" class="gallery__lightbox-btn gallery__lightbox-btn--prev" aria-label="Immagine precedente" @click="showPrev">
          <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
        </button>
        <img :src="selectedImage.imageUrl" :alt="selectedImage.alt" class="gallery__lightbox-image" />
        <button v-motion-tap-scale type="button" class="gallery__lightbox-btn gallery__lightbox-btn--next" aria-label="Immagine successiva" @click="showNext">
          <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.gallery {
  padding: clamp(1rem, 2.2vw, 1.7rem);
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 2px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.73), rgba(247, 241, 242, 0.58));
  box-shadow: 0 12px 26px rgba(36, 20, 26, 0.1);
}

.gallery__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.62rem;
}

.gallery__item {
  position: relative;
  height: 190px;
  border: 0;
  border-radius: 2px;
  overflow: hidden;
  padding: 0;
  background: rgba(255, 255, 255, 0.58);
}

.gallery__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery__overlay {
  position: absolute;
  inset: 0;
  opacity: 0;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(130deg, rgba(56, 32, 40, 0.22), rgba(56, 32, 40, 0.5));
  transition: opacity 220ms ease;
}

.gallery__item:hover .gallery__overlay,
.gallery__item:focus-visible .gallery__overlay {
  opacity: 1;
}

.gallery__lightbox {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.gallery__backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(18, 11, 14, 0.64);
}

.gallery__lightbox-content {
  position: relative;
  z-index: 1;
  width: min(94vw, 980px);
  height: min(84vh, 680px);
  border: 1px solid rgba(255, 255, 255, 0.48);
  border-radius: 2px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
}

.gallery__lightbox-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #120b0e;
}

.gallery__lightbox-btn {
  position: absolute;
  z-index: 2;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 2px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.82);
  color: #3f2330;
}

.gallery__lightbox-btn--close {
  top: 0.48rem;
  right: 0.48rem;
}

.gallery__lightbox-btn--prev {
  left: 0.48rem;
  top: 50%;
  transform: translateY(-50%);
}

.gallery__lightbox-btn--next {
  right: 0.48rem;
  top: 50%;
  transform: translateY(-50%);
}

@media (max-width: 575.98px) {
  .gallery__item {
    height: 160px;
  }

  .gallery__lightbox-content {
    width: calc(100vw - 1rem);
    height: min(72vh, 420px);
  }
}
</style>

