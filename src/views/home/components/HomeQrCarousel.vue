<script setup lang="ts">
import { computed, ref } from 'vue'

type QrItem = {
  id: string
  src: string
  alt: string
}

type CardSlot = 'prev' | 'current' | 'next'

const qrItems: QrItem[] = [
  { id: 'qr-1', src: '/img/qr/1.png', alt: 'QR 1' },
  { id: 'qr-2', src: '/img/qr/2.png', alt: 'QR 2' },
  { id: 'qr-3', src: '/img/qr/3.png', alt: 'QR 3' },
  { id: 'qr-4', src: '/img/qr/4.png', alt: 'QR 4' },
]

const currentIndex = ref(0)
const isDragging = ref(false)
const dragOffsetPx = ref(0)
const pointerStartX = ref(0)
const activePointerId = ref<number | null>(null)
const suppressClickOnce = ref(false)
const isQrModalOpen = ref(false)

const SWIPE_THRESHOLD_PX = 46
const SIDE_CARD_OFFSET_PX = 116
const DRAG_FOLLOW_FACTOR = 0.58

function normalizeIndex(index: number) {
  const total = qrItems.length
  if (!total) return 0
  return ((index % total) + total) % total
}

function goTo(index: number) {
  currentIndex.value = normalizeIndex(index)
}

function goNext() {
  if (qrItems.length < 2) return
  goTo(currentIndex.value + 1)
}

function goPrev() {
  if (qrItems.length < 2) return
  goTo(currentIndex.value - 1)
}

const currentItem = computed(() => qrItems[currentIndex.value])

const cards = computed(() => {
  if (!qrItems.length) return [] as Array<{ slot: CardSlot; index: number; item: QrItem }>

  const current = normalizeIndex(currentIndex.value)
  const prev = normalizeIndex(current - 1)
  const next = normalizeIndex(current + 1)

  if (qrItems.length === 1) {
    return [{ slot: 'current' as CardSlot, index: current, item: qrItems[current]! }]
  }

  return [
    { slot: 'prev' as CardSlot, index: prev, item: qrItems[prev]! },
    { slot: 'current' as CardSlot, index: current, item: qrItems[current]! },
    { slot: 'next' as CardSlot, index: next, item: qrItems[next]! },
  ]
})

function cardStyle(slot: CardSlot) {
  const baseOffsetPx = slot === 'prev' ? -SIDE_CARD_OFFSET_PX : slot === 'next' ? SIDE_CARD_OFFSET_PX : 0
  const followDragPx = dragOffsetPx.value * DRAG_FOLLOW_FACTOR
  const offsetPx = baseOffsetPx + followDragPx
  const scale = slot === 'current' ? 1 : 0.83
  const opacity = slot === 'current' ? 1 : 0.4

  return {
    '--card-offset-px': `${offsetPx}px`,
    '--card-scale': String(scale),
    '--card-opacity': String(opacity),
    zIndex: slot === 'current' ? '4' : '2',
  }
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (qrItems.length < 2) return

  if (event.cancelable) {
    event.preventDefault()
  }

  isDragging.value = true
  suppressClickOnce.value = false
  dragOffsetPx.value = 0
  pointerStartX.value = event.clientX
  activePointerId.value = event.pointerId

  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.setPointerCapture(event.pointerId)
  }
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value) return
  if (activePointerId.value !== event.pointerId) return
  dragOffsetPx.value = event.clientX - pointerStartX.value
}

function endDrag(event: PointerEvent) {
  if (!isDragging.value) return
  if (activePointerId.value !== event.pointerId) return

  const delta = dragOffsetPx.value
  const didMove = Math.abs(delta) > 6
  if (didMove) {
    suppressClickOnce.value = true
  }

  isDragging.value = false
  dragOffsetPx.value = 0
  activePointerId.value = null

  if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return
  if (delta < 0) {
    goNext()
  } else {
    goPrev()
  }
}

function onCardClick(slot: CardSlot) {
  if (suppressClickOnce.value) {
    suppressClickOnce.value = false
    return
  }

  if (slot === 'prev') {
    goPrev()
    return
  }
  if (slot === 'next') {
    goNext()
    return
  }
  isQrModalOpen.value = true
}

function onStageKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    goPrev()
    return
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    goNext()
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    isQrModalOpen.value = true
  }
}
</script>

<template>
  <section class="home-qr-carousel" aria-label="Carousel QR">
    <div
      class="home-qr-carousel__stage"
      :class="{ 'is-dragging': isDragging }"
      role="region"
      tabindex="0"
      aria-label="Sfoglia QR con swipe o frecce"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @keydown="onStageKeydown"
    >
      <button
        v-for="card in cards"
        :key="`${card.slot}-${card.index}`"
        type="button"
        class="home-qr-card"
        :class="`home-qr-card--${card.slot}`"
        :style="cardStyle(card.slot)"
        :aria-label="card.slot === 'current' ? `Apri ${card.item.alt}` : `Mostra ${card.item.alt}`"
        draggable="false"
        @dragstart.prevent
        @click="onCardClick(card.slot)"
      >
        <img :src="card.item.src" :alt="card.item.alt" draggable="false" />
      </button>
    </div>

    <div class="home-qr-carousel__dots" aria-hidden="true">
      <span
        v-for="item in qrItems"
        :key="item.id"
        class="home-qr-carousel__dot"
        :class="{ 'is-active': item.id === currentItem?.id }"
      />
    </div>

    <div v-if="isQrModalOpen" class="home-qr-modal" role="dialog" aria-modal="true" :aria-label="`${currentItem?.alt} ingrandito`">
      <div class="home-qr-modal__backdrop" @click="isQrModalOpen = false"></div>
      <div class="home-qr-modal__content">
        <button type="button" class="btn-close home-qr-modal__close" aria-label="Chiudi QR ingrandito" @click="isQrModalOpen = false"></button>
        <img class="home-qr-modal__image" :src="currentItem?.src" :alt="`${currentItem?.alt} ingrandito`" />
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.home-qr-carousel {
  margin-top: 1.55rem;
}

.home-qr-carousel__stage {
  position: relative;
  width: min(460px, 100%);
  height: clamp(180px, 36vw, 250px);
  margin: 0 auto;
  overflow: hidden;
  touch-action: pan-y;
  user-select: none;
  cursor: grab;
}

.home-qr-carousel__stage.is-dragging {
  cursor: grabbing;
}

.home-qr-carousel__stage:focus-visible {
  outline: 2px solid rgba(84, 44, 58, 0.52);
  outline-offset: 4px;
  border-radius: 14px;
}

.home-qr-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: clamp(150px, 33vw, 210px);
  border: 0;
  border-radius: 16px;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 28px rgba(46, 26, 34, 0.16);
  cursor: pointer;
  transform: translate3d(calc(-50% + var(--card-offset-px, 0px)), -50%, 0) scale(var(--card-scale, 1));
  opacity: var(--card-opacity, 1);
  transition: transform 260ms cubic-bezier(0.2, 0.7, 0.2, 1), opacity 220ms ease;
}

.home-qr-carousel__stage.is-dragging .home-qr-card {
  transition: none;
}

.home-qr-card img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 12px;
  pointer-events: none;
}

.home-qr-card--prev,
.home-qr-card--next {
  filter: saturate(0.78) brightness(1.03);
}

.home-qr-carousel__dots {
  margin-top: 0.44rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.36rem;
}

.home-qr-carousel__dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(84, 44, 58, 0.28);
}

.home-qr-carousel__dot.is-active {
  width: 16px;
  background: rgba(84, 44, 58, 0.84);
}

.home-qr-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.home-qr-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
}

.home-qr-modal__content {
  position: relative;
  width: min(calc(100vw - 2rem), 420px);
  max-height: calc(100vh - 2rem);
}

.home-qr-modal__close {
  position: absolute;
  top: -0.35rem;
  right: -0.35rem;
}

.home-qr-modal__image {
  width: 100%;
  height: auto;
  max-height: calc(100vh - 2rem);
  object-fit: contain;
}

@media (max-width: 575.98px) {
  .home-qr-carousel__stage {
    width: min(336px, 100%);
    height: 180px;
  }
}
</style>
