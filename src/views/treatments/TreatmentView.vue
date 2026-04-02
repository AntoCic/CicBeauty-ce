<script setup lang="ts">
import { cicKitStore, loading, toast } from 'cic-kit'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CatalogCard from '../../components/CatalogCard.vue'
import AppHeaderCatalogNav from '../../components/headers/AppHeaderCatalogNav.vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import PublicSideNavigator from '../../components/public/PublicSideNavigator.vue'
import type { PublicSideLink } from '../../components/public/types'
import { normalizeIdList } from '../../catalog/utils'
import { usePublicSeo } from '../../composables/usePublicSeo'
import { useStructuredData } from '../../composables/useStructuredData'
import type { Treatment } from '../../models/Treatment'
import { Auth } from '../../main'
import { productStore } from '../../stores/productStore'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { treatmentStore } from '../../stores/treatmentStore'

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const item = ref<Treatment | undefined>(undefined)
const isLoading = ref(false)
const canManage = computed(() => Auth.isAdmin || Auth.isSuperAdmin)
const priceFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

const activeCategoryId = computed(() => {
  const routeCategoryId = String(route.query.categoryId ?? '').trim()
  if (routeCategoryId) return routeCategoryId
  return item.value?.categoryIds[0] ?? ''
})

const categoryMap = computed(() => {
  const nextMap: Record<string, string> = {}
  for (const category of treatmentCategoryStore.itemsActiveArray) {
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
  { label: 'Trattamenti', to: { name: 'TreatmentCategoriesView' } },
  activeCategoryId.value
    ? {
      label: categoryLabelForBreadcrumb.value,
      to: { name: 'TreatmentsView', params: { categoryId: activeCategoryId.value } },
    }
    : { label: 'Catalogo', to: { name: 'TreatmentsView' } },
  { label: item.value?.title ?? 'Dettaglio' },
])

const sideLinks = computed<PublicSideLink[]>(() => {
  const links: PublicSideLink[] = [
    { label: 'Categorie trattamenti', to: { name: 'TreatmentCategoriesView' }, icon: 'category' },
    { label: 'Catalogo trattamenti', to: { name: 'TreatmentsView' }, icon: 'spa' },
  ]

  if (activeCategoryId.value) {
    links.unshift({
      label: 'Torna alla categoria',
      to: { name: 'TreatmentsView', params: { categoryId: activeCategoryId.value } },
      icon: 'arrow_back',
    })
  }

  links.push({ label: 'Catalogo prodotti', to: { name: 'ProductsView' }, icon: 'event_available' })
  return links
})

const pageTitle = computed(() =>
  item.value?.title
    ? `${item.value.title} | Trattamento CNC Beauty`
    : 'Dettaglio Trattamento | CNC Beauty',
)

const pageDescription = computed(() =>
  item.value?.subtitle
    ? `${item.value.subtitle} - dettaglio trattamento CNC Beauty con durata e prodotti consigliati.`
    : 'Dettaglio trattamento CNC Beauty con informazioni, durata e prodotti consigliati.',
)

usePublicSeo(pageTitle, pageDescription, {
  canonicalPath: computed(() => item.value?.id ? `/treatment/${item.value.id}` : '/treatments'),
  ogType: 'article',
})

const recommendedProducts = computed(() => {
  const current = item.value
  if (!current) return []
  const treatmentId = String(current.id ?? '').trim()
  if (!treatmentId) return []

  const linkedByMirrorRelation = productStore.itemsActiveArray
    .filter((candidate) => candidate.storeVisible)
    .filter((candidate) => normalizeIdList(candidate.trattamentiConsogliatiIds).includes(treatmentId))
  if (linkedByMirrorRelation.length) return linkedByMirrorRelation

  const legacyProductIds = normalizeIdList(current.prodottiConsigliatiIds)
  if (!legacyProductIds.length) return []

  const productById = new Map(
    productStore.itemsActiveArray
      .filter((candidate) => candidate.storeVisible)
      .map((candidate) => [candidate.id, candidate]),
  )

  return legacyProductIds
    .map((id) => productById.get(id))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
})

async function loadItem() {
  const id = String(route.params.id ?? '')
  if (!id) return

  isLoading.value = true
  try {
    item.value = await treatmentStore.ensureOne(id)
    if (!item.value) {
      toast.warning('Trattamento non trovato')
    }
  } catch (error) {
    console.error(error)
    toast.error('Errore caricamento trattamento')
  } finally {
    isLoading.value = false
  }
}

function formatPrice(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return priceFormatter.format(value)
}

function formatDuration(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return '-'
  return `${Math.round(value)} min`
}

const structuredData = computed(() => {
  if (!item.value) return {}
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `${window.location.origin}/treatment/${item.value.id}#service`,
        name: item.value.title,
        description: item.value.subtitle || item.value.description || undefined,
        category: itemCategoryLabels.value.join(', ') || undefined,
        offers: typeof item.value.price === 'number'
          ? {
            '@type': 'Offer',
            price: String(item.value.price),
            priceCurrency: 'EUR',
            availability: item.value.storeDisabeld ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          }
          : undefined,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.value.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.label,
          item: crumb.to ? `${window.location.origin}${router.resolve(crumb.to).path}` : undefined,
        })),
      },
    ],
  }
})
useStructuredData('treatment-detail-schema', structuredData)

onMounted(() => {
  loadItem()
})

function goPageEdit() {
  router.push({ name: 'TreatmentEditView', params: { id: route.params.id } })
}

async function onDeleteItem() {
  if (!canManage.value || !item.value) return
  const confirmDelete = window.confirm(`Eliminare definitivamente "${item.value.title}"?`)
  if (!confirmDelete) return
  loading.on('deliting:item')
  try {
    await item.value.delete(treatmentStore)
    toast.success('Trattamento eliminato')
    await router.replace({ name: 'TreatmentCategoriesView' })
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione trattamento')
  } finally {
    loading.off('deliting:item')
  }
}
</script>

<template>
  <div class="detail-view container-fluid pt-3 pt-md-4 overflow-auto vh-100" :style="bgStyle">
    <HeaderApp :to="{ name: 'home' }">
      <AppHeaderCatalogNav />
    </HeaderApp>

    <div class="detail-shell">
      <div class="detail-layout">
        <PublicSideNavigator
          title="Dettaglio trattamento"
          subtitle="Navigazione laterale rapida per tornare a categoria e catalogo."
          :breadcrumbs="breadcrumbItems"
          :links="sideLinks"
          class="detail-side"
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
              <div class="col-12 col-xl-10 mx-auto d-flex flex-column">
                <p class="detail-kicker">Trattamento</p>

                <div class="detail-heading">
                  <h1 class="detail-title">{{ item.title }}</h1>
                  <p class="detail-price">
                    {{ formatPrice(item.price) }}
                  </p>
                </div>

                <p v-if="item.subtitle" class="detail-subtitle">{{ item.subtitle }}</p>

                <div class="detail-badges">
                  <span v-for="label in itemCategoryLabels" :key="label" class="detail-badge">
                    {{ label }}
                  </span>
                  <span class="detail-badge">
                    Durata: {{ formatDuration(item.duration) }}
                  </span>
                  <span v-if="item.storeDisabeld" class="detail-badge detail-badge--warn">
                    Non disponibile: {{ item.storeDisabeld }}
                  </span>
                </div>

                <p v-if="item.description" class="detail-description">{{ item.description }}</p>

                <div class="detail-extra">
                  <p v-if="item.tipiDiPelle" class="detail-extra-item">
                    <strong class="detail-extra-label">Tipi di pelle:</strong>
                    {{ item.tipiDiPelle }}
                  </p>

                  <p v-if="item.ingredienti" class="detail-extra-item">
                    <strong class="detail-extra-label">Ingredienti:</strong>
                    {{ item.ingredienti }}
                  </p>
                </div>
              </div>
            </div>
          </article>

          <section v-if="item && recommendedProducts.length" v-motion-fade-up :delay="80" class="recommended-section">
            <h3 class="recommended-title">Prodotti consigliati</h3>
            <div class="row g-3 g-lg-4">
              <div v-for="(product, index) in recommendedProducts" :key="product.id" class="col-6 col-md-4 col-xl-3">
                <div v-motion-stagger-children :delay="index * 28">
                  <CatalogCard
                    :title="product.title"
                    :subtitle="product.subtitle"
                    :price="product.price"
                    :img-urls="product.imgUrls ?? []"
                    :store-disabeld="product.storeDisabeld"
                    :to="{
                      name: 'ProductView',
                      params: { id: product.id },
                      query: { categoryId: product.categoryIds[0] || undefined },
                    }"
                  />
                </div>
              </div>
            </div>
          </section>

          <p v-if="!isLoading && !item" class="detail-state">Trattamento non trovato.</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-view {
  min-height: 100%;
  height: 100svh;
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  background:
    radial-gradient(circle at 8% -8%, rgba(232, 179, 190, 0.2), transparent 48%),
    radial-gradient(circle at 96% 2%, rgba(226, 205, 177, 0.2), transparent 42%);
}

.detail-shell {
  width: min(1260px, 100%);
  margin: 0 auto;
  padding: 0 0.2rem 1rem;
}

.detail-layout {
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
  .detail-shell {
    padding: 0 0.15rem 0.8rem;
  }

  .detail-card {
    padding: 0.82rem;
  }

  .detail-subtitle {
    font-size: 0.9rem;
  }

  .detail-heading {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}

@media (max-width: 991.98px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .detail-layout :deep(.side-nav) {
    display: none;
  }
}
</style>

