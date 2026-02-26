<script setup lang="ts">
import { cicKitStore, loading, toast, useChangeHeader, useStoreWatch } from 'cic-kit'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productStore } from '../../stores/productStore'
import type { Product } from '../../models/Product'
import { Auth } from '../../main'
import HeaderApp from '../../components/HeaderApp.vue'
import CatalogCard from '../../components/CatalogCard.vue'
import { productCategoryStore } from '../../stores/productCategoryStore'
import { treatmentStore } from '../../stores/treatmentStore'

useChangeHeader('Dettaglio prodotto', { name: 'ProductCategoriesView' })
useStoreWatch([
  {
    store: productStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
    checkLogin: false,
  },
  {
    store: productCategoryStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
    checkLogin: false,
  },
  {
    store: treatmentStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
    checkLogin: false,
  },
])

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const item = ref<Product | undefined>(undefined)
const isLoading = ref(false)
const canManage = computed(() => Auth.isAdmin || Auth.isSuperAdmin)
const priceFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const imageUrls = computed(() => (item.value?.imgUrls ?? []).filter((url): url is string => !!url))
const hasImages = computed(() => imageUrls.value.length > 0)
const currentImageIndex = ref(0)
let carouselTimer: ReturnType<typeof setInterval> | undefined

const activeCategoryId = computed(() => {
  const routeCategoryId = String(route.query.categoryId ?? '').trim()
  if (routeCategoryId) return routeCategoryId
  return item.value?.categoryIds[0] ?? ''
})

const headerTo = computed(() => {
  if (activeCategoryId.value) {
    return { name: 'ProductsView', params: { categoryId: activeCategoryId.value } }
  }
  return { name: 'ProductCategoriesView' }
})

const categoryMap = computed(() => {
  const nextMap: Record<string, string> = {}
  for (const category of productCategoryStore.itemsActiveArray) {
    nextMap[category.id] = category.title
  }
  return nextMap
})

const itemCategoryLabels = computed(() =>
  (item.value?.categoryIds ?? [])
    .map((categoryId) => categoryMap.value[categoryId])
    .filter((label): label is string => Boolean(label)),
)

function normalizeRelationIds(ids: string[] | undefined) {
  return [...new Set((ids ?? []).map((id) => String(id ?? '').trim()).filter(Boolean))]
}

const recommendedTreatments = computed(() => {
  const current = item.value
  if (!current) return []
  const linkedIds = normalizeRelationIds(current.trattamentiConsogliatiIds)
  if (!linkedIds.length) return []

  const treatmentById = new Map(
    treatmentStore.itemsActiveArray
      .filter((candidate) => candidate.storeVisible)
      .map((candidate) => [candidate.id, candidate]),
  )

  return linkedIds
    .map((id) => treatmentById.get(id))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
})

function collectProductImageUrls(product: { imgUrls?: string[]; imgDescriptionUrls?: string[] }) {
  return [...(product.imgUrls ?? []), ...(product.imgDescriptionUrls ?? [])]
}

async function loadItem() {
  const id = String(route.params.id ?? '')
  if (!id) return

  isLoading.value = true
  try {
    item.value = await productStore.ensureOne(id)
    if (!item.value) {
      toast.warning('Prodotto non trovato')
    }
  } catch (error) {
    console.error(error)
    toast.error('Errore caricamento prodotto')
  } finally {
    isLoading.value = false
  }
}

function formatPrice(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return priceFormatter.format(value)
}

function stopCarousel() {
  if (!carouselTimer) return
  clearInterval(carouselTimer)
  carouselTimer = undefined
}

function startCarousel() {
  stopCarousel()
  if (imageUrls.value.length <= 1) return

  carouselTimer = setInterval(() => {
    currentImageIndex.value = (currentImageIndex.value + 1) % imageUrls.value.length
  }, 3200)
}

function setCurrentImage(index: number) {
  if (!imageUrls.value.length) return
  const total = imageUrls.value.length
  currentImageIndex.value = ((index % total) + total) % total
  startCarousel()
}

function prevImage() {
  setCurrentImage(currentImageIndex.value - 1)
}

function nextImage() {
  setCurrentImage(currentImageIndex.value + 1)
}

onMounted(() => {
  loadItem()
})

watch(() => route.params.id, loadItem)

watch(
  imageUrls,
  (urls) => {
    if (!urls.length) {
      stopCarousel()
      currentImageIndex.value = 0
      return
    }

    if (currentImageIndex.value >= urls.length) {
      currentImageIndex.value = 0
    }

    startCarousel()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  stopCarousel()
})

function goPageEdit() {
  router.push({ name: 'ProductEditView', params: { id: route.params.id } })
}

async function onDeleteItem() {
  if (!canManage.value || !item.value) return
  const confirmDelete = window.confirm(
    `Eliminare definitivamente "${item.value.title}"? Verranno eliminate anche le immagini collegate.`,
  )
  if (!confirmDelete) return
  loading.on('deliting:item')
  try {
    await Promise.allSettled(
      collectProductImageUrls(item.value)
        .map((url) => String(url ?? '').trim())
        .filter(Boolean)
        .map((url) => productStore.storageFolder?.removeFromUrl(url)),
    )
    await item.value.delete(productStore)
    toast.success('Prodotto eliminato')
    await router.replace({ name: 'ProductCategoriesView' })
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione prodotto')
  } finally {
    loading.off('deliting:item')
  }
}
</script>

<template>
  <div class="detail-page container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Dettaglio prodotto" :to="headerTo" :btn-icon="canManage ? 'edit' : undefined" @btn-click="goPageEdit"
      :btn2Icon="canManage ? 'delete' : undefined" @btn2-click="onDeleteItem" btn2-color="danger" />

    <section class="detail-shell">
      <div v-if="isLoading" class="detail-state">Caricamento...</div>

      <article v-else-if="item" class="detail-card mt-3 mb-5">
        <div class="row g-4 g-xl-5 align-items-start">
          <div v-if="hasImages" class="col-12 col-lg-6">
            <div class="detail-media">
              <div class="detail-carousel" @mouseenter="stopCarousel" @mouseleave="startCarousel">
                <img v-for="(img, index) in imageUrls" :key="`${img}-${index}`" :src="img"
                  :alt="`${item.title} ${index + 1}`" class="detail-image"
                  :class="{ 'is-active': index === currentImageIndex }" />

                <button v-if="imageUrls.length > 1" type="button" class="carousel-btn carousel-btn--prev"
                  aria-label="Immagine precedente" @click="prevImage">
                  <svg viewBox="0 -960 960 960" aria-hidden="true">
                    <path d="M561-240 321-480l240-240 56 56-184 184 184 184-56 56Z" />
                  </svg>
                </button>

                <button v-if="imageUrls.length > 1" type="button" class="carousel-btn carousel-btn--next"
                  aria-label="Immagine successiva" @click="nextImage">
                  <svg viewBox="0 -960 960 960" aria-hidden="true">
                    <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" />
                  </svg>
                </button>
              </div>

              <div v-if="imageUrls.length > 1" class="carousel-dots">
                <button v-for="(img, index) in imageUrls" :key="`dot-${img}-${index}`" type="button"
                  class="carousel-dot" :class="{ 'is-active': index === currentImageIndex }"
                  :aria-label="`Mostra immagine ${index + 1}`" @click="setCurrentImage(index)" />
              </div>
            </div>
          </div>

          <div :class="hasImages ? 'col-12 col-lg-6 d-flex flex-column' : 'col-12 d-flex flex-column'">
            <p class="detail-kicker">
              <svg class="g-icon g-icon--kicker" viewBox="0 -960 960 960" aria-hidden="true">
                <path
                  d="M280-120q-33 0-56.5-23.5T200-200v-520q0-33 23.5-56.5T280-800h400q33 0 56.5 23.5T760-720v520q0 33-23.5 56.5T680-120H280Zm200-280q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm-120-200h240v-80H360v80Z" />
              </svg>
              Prodotto
            </p>

            <div class="detail-heading">
              <h2 class="detail-title">{{ item.title }}</h2>
              <p class="detail-price">
                {{ formatPrice(item.price) }}
              </p>
            </div>

            <p v-if="item.subtitle" class="detail-subtitle">{{ item.subtitle }}</p>

            <div class="detail-badges">
              <span v-for="label in itemCategoryLabels" :key="label" class="detail-badge">
                <svg class="g-icon" viewBox="0 -960 960 960" aria-hidden="true">
                  <path
                    d="M280-120q-33 0-56.5-23.5T200-200v-560q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v560q0 33-23.5 56.5T680-120H280Zm200-360 200-120-200-120-200 120 200 120Zm0 280 200-120v-200L480-320 280-520v200l200 120Z" />
                </svg>
                {{ label }}
              </span>
              <span v-if="item.storeDisabeld" class="detail-badge detail-badge--warn">
                <svg class="g-icon" viewBox="0 -960 960 960" aria-hidden="true">
                  <path
                    d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-139 0-236.5-97.5T146-414q0-139 97.5-236.5T480-748q139 0 236.5 97.5T814-414q0 139-97.5 236.5T480-80Z" />
                </svg>
                Non disponibile: {{ item.storeDisabeld }}
              </span>
            </div>

            <p v-if="item.description" class="detail-description">{{ item.description }}</p>

            <div class="detail-extra">
              <p v-if="item.consigliUso" class="detail-extra-item">
                <strong class="detail-extra-label">
                  <svg class="g-icon" viewBox="0 -960 960 960" aria-hidden="true">
                    <path
                      d="M480-80q-83 0-156-31.5T197-197Q112-282 80-364.5T48-520q0-89 34.5-169T180-828q-11-39-2.5-73t33.5-59q25-25 59-33.5t73 2.5q73-63 153-97t169-34q89 0 169 34t153 97q39-11 73 2.5t59 33.5q25 25 33.5 59t-2.5 73q63 73 97 153t34 169q0 83-31.5 156T763-197q-85 85-167.5 116T480-80Zm0-80q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720q-117 0-198.5 81.5T200-440q0 117 81.5 198.5T480-160Zm0-120q50 0 85-35t35-85h-80q0 17-11.5 28.5T480-360q-17 0-28.5-11.5T440-400h-80q0 50 35 85t85 35ZM320-480q17 0 28.5-11.5T360-520q0-17-11.5-28.5T320-560q-17 0-28.5 11.5T280-520q0 17 11.5 28.5T320-480Zm320 0q17 0 28.5-11.5T680-520q0-17-11.5-28.5T640-560q-17 0-28.5 11.5T600-520q0 17 11.5 28.5T640-480Z" />
                  </svg>
                  Consigli d'uso:
                </strong>
                {{ item.consigliUso }}
              </p>
              <p v-if="item.ingredienti" class="detail-extra-item">
                <strong class="detail-extra-label">
                  <svg class="g-icon" viewBox="0 -960 960 960" aria-hidden="true">
                    <path
                      d="M480-120q-100-92-166-186.5T248-500q0-89 59.5-148.5T456-708q25 0 48.5 7.5T548-678q22-22 47-35t53-13q89 0 148.5 59.5T856-518q0 99-66 193.5T624-138q-27 23-62.5 20.5T480-120Zm0-82q73-71 124.5-149.5T656-500q0-56-36-92t-92-36q-23 0-44.5 9T446-592h-80q-16-18-37.5-27T284-628q-56 0-92 36t-36 92q0 70 51.5 148.5T480-202Zm0-213Z" />
                  </svg>
                  Ingredienti:
                </strong>
                {{ item.ingredienti }}
              </p>
            </div>
          </div>
        </div>
      </article>

      <section v-if="item && recommendedTreatments.length" class="recommended-section">
        <h3 class="recommended-title mb-3">Trattamenti consigliati</h3>
        <div class="row g-3 g-lg-4">
          <div v-for="treatment in recommendedTreatments" :key="treatment.id" class="col-6 col-md-4 col-xl-3">
            <CatalogCard
              :title="treatment.title"
              :subtitle="treatment.subtitle"
              :price="treatment.price"
              :store-disabeld="treatment.storeDisabeld"
              :to="{
                name: 'TreatmentView',
                params: { id: treatment.id },
                query: { categoryId: treatment.categoryIds[0] || undefined },
              }"
            />
          </div>
        </div>
      </section>

      <p v-if="!isLoading && !item" class="detail-state">Prodotto non trovato.</p>
    </section>
  </div>
</template>

<style scoped>
.detail-page {
  color: #2f2f2f;
}

.detail-shell {
  width: min(1080px, 100%);
  margin: 0 auto;
  padding: 0 12px 1.6rem;
}

.detail-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
}

.detail-state {
  text-align: center;
  font-size: 0.86rem;
  color: rgba(75, 41, 53, 0.7);
}

.detail-card {
  position: relative;
  overflow: hidden;
  padding: clamp(1rem, 2vw, 1.4rem);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 2px;
  background: linear-gradient(152deg, rgba(255, 255, 255, 0.6), rgba(247, 241, 242, 0.4));
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  box-shadow: 0 12px 24px rgba(45, 23, 31, 0.13);
}

.detail-card::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(125deg, rgba(255, 255, 255, 0.3), transparent 50%);
}

.detail-media {
  min-height: min(52vw, 440px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(0.8rem, 2vw, 1.2rem);
  border: 1px solid rgba(84, 44, 58, 0.12);
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.46), rgba(255, 255, 255, 0.24));
}

.detail-carousel {
  position: relative;
  width: 100%;
  height: clamp(240px, 48vw, 420px);
  overflow: hidden;
}

.detail-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.55s ease;
}

.detail-image.is-active {
  opacity: 1;
}

.carousel-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(84, 44, 58, 0.24);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.58);
  color: #542c3a;
  display: grid;
  place-items: center;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  transition: background 0.2s ease, color 0.2s ease;
}

.carousel-btn:hover {
  background: rgba(232, 179, 190, 0.72);
  color: #3d1f29;
}

.carousel-btn--prev {
  left: 0.5rem;
}

.carousel-btn--next {
  right: 0.5rem;
}

.carousel-btn svg {
  width: 1rem;
  height: 1rem;
  fill: currentColor;
}

.carousel-dots {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.7rem;
}

.carousel-dot {
  width: 0.45rem;
  height: 0.45rem;
  border: 0;
  border-radius: 999px;
  background: rgba(84, 44, 58, 0.28);
  transition: width 0.22s ease, background 0.22s ease;
}

.carousel-dot.is-active {
  width: 1.1rem;
  background: rgba(84, 44, 58, 0.72);
}

.detail-kicker {
  margin: 0 0 0.35rem;
  color: rgba(84, 44, 58, 0.64);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.detail-title {
  margin: 0;
  color: #4b2935;
  font-size: clamp(1.35rem, 2.5vw, 2.15rem);
  font-weight: 700;
  line-height: 1.14;
}

.detail-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.detail-subtitle {
  margin: 0.45rem 0 0;
  color: rgba(75, 41, 53, 0.78);
  font-size: 1rem;
  font-weight: 500;
}

.detail-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 0.95rem 0 0;
}

.detail-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 28px;
  padding: 0 0.65rem;
  border: 1px solid rgba(84, 44, 58, 0.24);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.45);
  color: #542c3a;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.detail-badge--warn {
  border-color: rgba(138, 26, 26, 0.28);
  color: #7d1d1d;
  background: rgba(255, 240, 240, 0.56);
}

.detail-description {
  margin: 1rem 0 0;
  color: rgba(47, 47, 47, 0.86);
  font-size: 0.94rem;
  line-height: 1.65;
}

.detail-extra {
  margin-top: 0.75rem;
}

.detail-extra-item {
  margin: 0.35rem 0 0;
  font-size: 0.86rem;
  line-height: 1.55;
  color: rgba(47, 47, 47, 0.78);
}

.detail-extra-label {
  color: #542c3a;
  font-weight: 600;
  margin-right: 0.3rem;
}

.detail-price {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.1rem;
  margin-bottom: 0;
  color: #2f2f2f;
  font-size: clamp(1.06rem, 2.1vw, 1.55rem);
  font-weight: 800;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.recommended-section {
  margin-top: 1.25rem;
}

.recommended-title {
  color: #4b2935;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.g-icon {
  width: 1.06rem;
  height: 1.06rem;
  fill: currentColor;
  flex: 0 0 auto;
}

.g-icon--kicker {
  width: 0.95rem;
  height: 0.95rem;
}

:deep(.detail-toolbar .btn) {
  border-radius: 2px;
}

:deep(.detail-toolbar .btn:focus-visible) {
  box-shadow: none;
}

@media (max-width: 575.98px) {
  .detail-shell {
    padding: 0 10px 1.25rem;
  }

  .detail-toolbar {
    margin-bottom: 0.5rem;
  }

  .detail-subtitle {
    font-size: 0.9rem;
  }

  .detail-carousel {
    height: clamp(210px, 64vw, 320px);
  }

  .detail-heading {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .detail-price {
    font-size: 1.1rem;
  }

  .detail-description {
    font-size: 0.86rem;
  }
}
</style>
