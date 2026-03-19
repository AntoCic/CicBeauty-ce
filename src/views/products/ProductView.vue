<script setup lang="ts">
import { cicKitStore, loading, toast } from 'cic-kit'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CatalogCard from '../../components/CatalogCard.vue'
import AppHeaderCatalogNav from '../../components/headers/AppHeaderCatalogNav.vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import PublicSideNavigator from '../../components/public/PublicSideNavigator.vue'
import type { PublicSideLink } from '../../components/public/types'
import { normalizeIdList } from '../../catalog/utils'
import { usePublicSeo } from '../../composables/usePublicSeo'
import type { Product } from '../../models/Product'
import { Auth } from '../../main'
import { productCategoryStore } from '../../stores/productCategoryStore'
import { productStore } from '../../stores/productStore'
import { treatmentStore } from '../../stores/treatmentStore'

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

const categoryLabelForBreadcrumb = computed(() => {
  if (!activeCategoryId.value) return 'Catalogo'
  return categoryMap.value[activeCategoryId.value] ?? 'Categoria'
})

const breadcrumbItems = computed(() => [
  { label: 'Home', to: { name: 'home' } },
  { label: 'Prodotti', to: { name: 'ProductCategoriesView' } },
  activeCategoryId.value
    ? {
      label: categoryLabelForBreadcrumb.value,
      to: { name: 'ProductsView', params: { categoryId: activeCategoryId.value } },
    }
    : { label: 'Catalogo', to: { name: 'ProductsView' } },
  { label: item.value?.title ?? 'Dettaglio' },
])

const sideLinks = computed<PublicSideLink[]>(() => {
  const links: PublicSideLink[] = [
    { label: 'Categorie prodotti', to: { name: 'ProductCategoriesView' }, icon: 'category' },
    { label: 'Catalogo prodotti', to: { name: 'ProductsView' }, icon: 'inventory_2' },
  ]

  if (activeCategoryId.value) {
    links.unshift({
      label: 'Torna alla categoria',
      to: { name: 'ProductsView', params: { categoryId: activeCategoryId.value } },
      icon: 'arrow_back',
    })
  }

  links.push({ label: 'Catalogo trattamenti', to: { name: 'TreatmentsView' }, icon: 'event_available' })
  return links
})

const pageTitle = computed(() =>
  item.value?.title
    ? `${item.value.title} | Prodotto CNC Beauty`
    : 'Dettaglio Prodotto | CNC Beauty',
)

const pageDescription = computed(() =>
  item.value?.subtitle
    ? `${item.value.subtitle} - dettaglio prodotto CNC Beauty con ingredienti e consigli d'uso.`
    : 'Dettaglio prodotto CNC Beauty con informazioni, categorie e trattamenti consigliati.',
)

usePublicSeo(pageTitle, pageDescription)

const recommendedTreatments = computed(() => {
  const current = item.value
  if (!current) return []
  const linkedIds = normalizeIdList(current.trattamentiConsogliatiIds)
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
  { immediate: true },
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
  <div class="public-page" :style="bgStyle">
    <HeaderApp :to="{ name: 'home' }">
      <AppHeaderCatalogNav />
    </HeaderApp>

    <main class="public-page__shell">
      <div class="public-layout">
        <PublicSideNavigator
          title="Dettaglio prodotto"
          subtitle="Navigazione laterale rapida per tornare a categoria e catalogo."
          :breadcrumbs="breadcrumbItems"
          :links="sideLinks"
        />

        <section class="detail-panel">
          <div v-if="canManage && item" v-motion-fade-up class="detail-actions">
            <button v-motion-tap-scale type="button" class="detail-action-btn" @click="goPageEdit">
              Modifica
            </button>
            <button v-motion-tap-scale type="button" class="detail-action-btn detail-action-btn--danger" @click="onDeleteItem">
              Elimina
            </button>
          </div>

          <div v-if="isLoading" class="detail-state">Caricamento...</div>

          <article v-else-if="item" v-motion-fade-up class="detail-card">
            <div class="row g-4 g-xl-5 align-items-start">
              <div v-if="hasImages" class="col-12 col-lg-6">
                <div class="detail-media">
                  <div class="detail-carousel" @mouseenter="stopCarousel" @mouseleave="startCarousel">
                    <img
                      v-for="(img, index) in imageUrls"
                      :key="`${img}-${index}`"
                      :src="img"
                      :alt="`${item.title} ${index + 1}`"
                      class="detail-image"
                      :class="{ 'is-active': index === currentImageIndex }"
                    />

                    <button
                      v-if="imageUrls.length > 1"
                      type="button"
                      class="carousel-btn carousel-btn--prev"
                      aria-label="Immagine precedente"
                      @click="prevImage"
                    >
                      <svg viewBox="0 -960 960 960" aria-hidden="true">
                        <path d="M561-240 321-480l240-240 56 56-184 184 184 184-56 56Z" />
                      </svg>
                    </button>

                    <button
                      v-if="imageUrls.length > 1"
                      type="button"
                      class="carousel-btn carousel-btn--next"
                      aria-label="Immagine successiva"
                      @click="nextImage"
                    >
                      <svg viewBox="0 -960 960 960" aria-hidden="true">
                        <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" />
                      </svg>
                    </button>
                  </div>

                  <div v-if="imageUrls.length > 1" class="carousel-dots">
                    <button
                      v-for="(img, index) in imageUrls"
                      :key="`dot-${img}-${index}`"
                      type="button"
                      class="carousel-dot"
                      :class="{ 'is-active': index === currentImageIndex }"
                      :aria-label="`Mostra immagine ${index + 1}`"
                      @click="setCurrentImage(index)"
                    />
                  </div>
                </div>
              </div>

              <div :class="hasImages ? 'col-12 col-lg-6 d-flex flex-column' : 'col-12 d-flex flex-column'">
                <p class="detail-kicker">Prodotto</p>

                <div class="detail-heading">
                  <h2 class="detail-title">{{ item.title }}</h2>
                  <p class="detail-price">
                    {{ formatPrice(item.price) }}
                  </p>
                </div>
                <p class="detail-legal-note">
                  Prezzo indicativo da listino fornitore. Nessuna vendita online su questo sito.
                </p>

                <p v-if="item.subtitle" class="detail-subtitle">{{ item.subtitle }}</p>

                <div class="detail-badges">
                  <span v-for="label in itemCategoryLabels" :key="label" class="detail-badge">
                    {{ label }}
                  </span>
                  <span v-if="item.storeDisabeld" class="detail-badge detail-badge--warn">
                    Non disponibile: {{ item.storeDisabeld }}
                  </span>
                </div>

                <p v-if="item.description" class="detail-description">{{ item.description }}</p>

                <div class="detail-extra">
                  <p v-if="item.consigliUso" class="detail-extra-item">
                    <strong class="detail-extra-label">Consigli d'uso:</strong>
                    {{ item.consigliUso }}
                  </p>
                  <p v-if="item.ingredienti" class="detail-extra-item">
                    <strong class="detail-extra-label">Ingredienti:</strong>
                    {{ item.ingredienti }}
                  </p>
                </div>
              </div>
            </div>
          </article>

          <section v-if="item && recommendedTreatments.length" v-motion-fade-up :delay="80" class="recommended-section">
            <h3 class="recommended-title">Trattamenti consigliati</h3>
            <div class="row g-3 g-lg-4">
              <div v-for="(treatment, index) in recommendedTreatments" :key="treatment.id" class="col-6 col-md-4 col-xl-3">
                <div v-motion-stagger-children :delay="index * 28">
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
            </div>
          </section>

          <p v-if="!isLoading && !item" class="detail-state">Prodotto non trovato.</p>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.public-page {
  min-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 8% -8%, rgba(232, 179, 190, 0.2), transparent 48%),
    radial-gradient(circle at 96% 2%, rgba(226, 205, 177, 0.2), transparent 42%);
}

.public-page__shell {
  width: min(1260px, calc(100% - 1rem));
  margin: 0 auto;
  padding: 0.35rem 0 1.4rem;
}

.public-layout {
  display: grid;
  grid-template-columns: minmax(210px, 260px) minmax(0, 1fr);
  gap: 0.72rem;
}

.detail-panel {
  padding: clamp(1rem, 2.1vw, 1.55rem);
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 2px;
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.72), rgba(246, 239, 243, 0.58));
  box-shadow: 0 14px 28px rgba(35, 20, 25, 0.11);
}

.detail-actions {
  display: flex;
  gap: 0.45rem;
  margin-top: 0;
  margin-bottom: 0.8rem;
}

.detail-action-btn {
  min-height: 34px;
  padding: 0 0.74rem;
  border: 1px solid rgba(84, 44, 58, 0.24);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.82);
  color: #4b2935;
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
}

.detail-action-btn--danger {
  border-color: rgba(138, 26, 26, 0.3);
  color: #7d1d1d;
}

.detail-state {
  text-align: center;
  font-size: 0.86rem;
  color: rgba(75, 41, 53, 0.7);
}

.detail-card {
  position: relative;
  overflow: hidden;
  margin-top: 0.2rem;
  padding: clamp(1rem, 2vw, 1.4rem);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 2px;
  background: linear-gradient(152deg, rgba(255, 255, 255, 0.6), rgba(247, 241, 242, 0.4));
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  box-shadow: 0 12px 24px rgba(45, 23, 31, 0.13);
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
  margin-top: 0.1rem;
  margin-bottom: 0;
  color: #2f2f2f;
  font-size: clamp(1.06rem, 2.1vw, 1.55rem);
  font-weight: 800;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.detail-legal-note {
  margin: 0.3rem 0 0;
  font-size: 0.76rem;
  color: rgba(75, 41, 53, 0.72);
}

.recommended-section {
  margin-top: 1.2rem;
}

.recommended-title {
  margin: 0 0 0.75rem;
  color: #4b2935;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

@media (max-width: 575.98px) {
  .public-page__shell {
    width: calc(100% - 0.6rem);
    padding-bottom: 1rem;
  }

  .detail-card {
    padding: 0.82rem;
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
}

@media (max-width: 991.98px) {
  .public-layout {
    grid-template-columns: 1fr;
  }
}
</style>
