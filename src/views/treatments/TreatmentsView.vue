<script setup lang="ts">
import { Btn, cicKitStore } from 'cic-kit'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CatalogCard from '../../components/CatalogCard.vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import AppHeaderCatalogNav from '../../components/headers/AppHeaderCatalogNav.vue'
import SectionHeader from '../../components/public/SectionHeader.vue'
import { filterBySearch } from '../../catalog/utils'
import { usePublicSeo } from '../../composables/usePublicSeo'
import { useStructuredData } from '../../composables/useStructuredData'
import { Auth } from '../../main'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { treatmentStore } from '../../stores/treatmentStore'
import '../../styles/catalog-view.scss'

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const isLoggedIn = computed(() => Boolean(Auth.isLoggedIn))
const search = ref('')

const categoryId = computed(() => String(route.params.categoryId ?? '').trim())
const selectedCategory = computed(() => treatmentCategoryStore.findItemsById(categoryId.value))

const filteredItems = computed(() => {
  const source = categoryId.value
    ? treatmentStore.itemsActiveArray.filter((item) => item.categoryIds.includes(categoryId.value))
    : treatmentStore.itemsActiveArray

  return filterBySearch(source, search.value, (item) => [item.title, item.subtitle])
})
const categoryMap = computed(() => {
  const map: Record<string, string> = {}
  for (const category of treatmentCategoryStore.itemsActiveArray) {
    map[category.id] = category.title
  }
  return map
})

const tableRows = computed(() => filteredItems.value.map((item) => ({
  id: item.id,
  title: item.title,
  subtitle: item.subtitle,
  duration: item.duration,
  categoryLabel: categoryMap.value[item.categoryIds[0] ?? ''] ?? 'Trattamenti estetici',
  price: item.price,
  blockedNote: item.storeDisabeld,
})))

const pageTitle = computed(() => categoryId.value
  ? `Trattamenti ${selectedCategory.value?.title ?? ''} | CNC Beauty`
  : 'Catalogo Trattamenti con Prezzi | CNC Beauty')
const pageDescription = computed(() => categoryId.value
  ? `Trattamenti della categoria ${selectedCategory.value?.title ?? 'selezionata'} con prezzo e dettagli.`
  : 'Catalogo trattamenti CNC Beauty con prezzi, durata e categorie in formato leggibile.')
usePublicSeo(pageTitle, pageDescription, {
  canonicalPath: categoryId.value ? `/treatments/category/${categoryId.value}` : '/treatments/category',
})

const structuredData = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Catalogo trattamenti CNC Beauty',
  itemListElement: tableRows.value.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `${window.location.origin}/treatment/${item.id}`,
    item: {
      '@type': 'Service',
      name: item.title,
      description: item.subtitle || undefined,
      category: item.categoryLabel,
      offers: typeof item.price === 'number'
        ? {
          '@type': 'Offer',
          price: String(item.price),
          priceCurrency: 'EUR',
        }
        : undefined,
    },
  })),
}))
useStructuredData('treatments-list-schema', structuredData)

function goPageAdd() {
  router.push({ name: 'TreatmentEditView', params: { id: 'new' } })
}

function goToManageCategories() {
  router.push({ name: 'TreatmentCategoriesManageView' })
}
</script>

<template>
  <div class="container-fluid pb-t pt-3 pt-md-4 overflow-auto vh-100" :style="bgStyle">
    <HeaderApp :to="{ name: 'TreatmentCategoriesView' }">
      <AppHeaderCatalogNav />
      <div v-if="isLoggedIn" class="d-inline-flex align-items-center gap-1">
        <Btn icon="edit_note" variant="ghost" @click="goToManageCategories" />
        <Btn icon="add" variant="ghost" @click="goPageAdd" />
      </div>
    </HeaderApp>

    <section class="catalog-view">
      <div class="row g-3 g-md-4 mt-1 mb-3 mb-lg-4">
        <div class="col-12 col-md-6 col-lg-8">
          <SectionHeader
            eyebrow="Categorie"
            title="Trattamenti"
            :description="categoryId
              ? 'Catalogo trattamenti filtrato: entra nella scheda per vedere durata, protocollo e prodotti collegati.'
              : 'Catalogo completo trattamenti CNC Beauty: usa la ricerca per individuare subito il percorso migliore.'"
          />
          <p v-if="selectedCategory?.subtitle" class="catalog-meta mb-0 mt-2">
            {{ selectedCategory.subtitle }}
          </p>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <input
            v-model="search"
            type="search"
            class="form-control catalog-search"
            placeholder="Cerca trattamenti..."
            aria-label="Cerca trattamenti"
          />
        </div>
      </div>

      <div class="row g-3 g-lg-4 mt-1">
        <div v-for="item in filteredItems" :key="item.id" class="col-6 col-md-4 col-xl-3">
          <CatalogCard
            :title="item.title"
            :subtitle="item.subtitle"
            :price="item.price"
            :store-disabeld="item.storeDisabeld"
            :to="{ name: 'TreatmentView', params: { id: item.id }, query: { categoryId: categoryId || undefined } }"
          />
        </div>
      </div>

      <p v-if="!filteredItems.length" class="text-muted small mt-4 mb-0 text-center">
        {{ categoryId ? 'Nessun trattamento trovato per questa categoria.' : 'Nessun trattamento trovato.' }}
      </p>
    </section>
  </div>
</template>
