<script setup lang="ts">
import { cicKitStore } from 'cic-kit'
import { computed, ref } from 'vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'

type QrGalleryItem = {
  id: string
  src: string
  alt: string
}

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())

const qrItems: QrGalleryItem[] = [
  { id: 'qr-1', src: '/img/qr/1.png', alt: 'QR 1' },
  { id: 'qr-2', src: '/img/qr/2.png', alt: 'QR 2' },
  { id: 'qr-3', src: '/img/qr/3.png', alt: 'QR 3' },
  { id: 'qr-4', src: '/img/qr/4.png', alt: 'QR 4' },
]

const selectedQr = ref<QrGalleryItem | undefined>(undefined)

function openQr(item: QrGalleryItem) {
  selectedQr.value = item
}

function closeQr() {
  selectedQr.value = undefined
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="QR" :to="{ name: 'homeApp' }" />

    <div class="qr-page px-2 pb-4">
      <div class="qr-list">
        <button
          v-for="item in qrItems"
          :key="item.id"
          type="button"
          class="qr-thumb"
          :aria-label="`Apri ${item.alt}`"
          @click="openQr(item)"
        >
          <img :src="item.src" :alt="item.alt" />
        </button>
      </div>

      <p v-if="!qrItems.length" class="text-muted small mb-0">Nessun QR disponibile.</p>
    </div>

    <div v-if="selectedQr" class="qr-modal" role="dialog" aria-modal="true" :aria-label="`${selectedQr.alt} ingrandito`">
      <div class="qr-modal__backdrop" @click="closeQr"></div>
      <div class="qr-modal__content">
        <button type="button" class="btn-close qr-modal__close" aria-label="Chiudi QR ingrandito" @click="closeQr"></button>
        <img class="qr-modal__image" :src="selectedQr.src" :alt="`${selectedQr.alt} ingrandito`" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.qr-page {
  max-width: 640px;
  margin: 0 auto;
}

.qr-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.8rem;
}

.qr-thumb {
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 12px;
  padding: 0.7rem;
  background: rgba(255, 255, 255, 0.86);
}

.qr-thumb img {
  width: 100%;
  height: auto;
  display: block;
}

.qr-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.qr-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
}

.qr-modal__content {
  position: relative;
  width: min(calc(100vw - 2rem), 560px);
  max-height: calc(100vh - 2rem);
}

.qr-modal__close {
  position: absolute;
  top: -0.35rem;
  right: -0.35rem;
}

.qr-modal__image {
  width: 100%;
  height: auto;
  max-height: calc(100vh - 2rem);
  object-fit: contain;
}
</style>
