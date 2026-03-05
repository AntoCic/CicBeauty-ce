<script setup lang="ts">
import { Btn, cicKitStore, useStoreWatch } from 'cic-kit'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CatalogCard from '../../components/CatalogCard.vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import AppHeaderCatalogNav from '../../components/headers/AppHeaderCatalogNav.vue'
import SectionHeader from '../../components/public/SectionHeader.vue'
import { filterBySearch } from '../../catalog/utils'
import { Auth } from '../../main'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { treatmentStore } from '../../stores/treatmentStore'
import '../../styles/catalog-view.scss'

useStoreWatch([
  {
    store: treatmentStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
    checkLogin: false,
  },
  {
    store: treatmentCategoryStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
    checkLogin: false,
  },
])

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
