<script setup lang="ts">
import { Btn, cicKitStore, useStoreWatch } from 'cic-kit'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CatalogCard from '../../components/CatalogCard.vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import AppHeaderCatalogNav from '../../components/headers/AppHeaderCatalogNav.vue'
import SectionHeader from '../../components/public/SectionHeader.vue'
import { Auth } from '../../main'
import { productCategoryStore } from '../../stores/productCategoryStore'
import { productStore } from '../../stores/productStore'

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
])

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const isLoggedIn = computed(() => Boolean(Auth.isLoggedIn))
const search = ref('')

const categoryId = computed(() => String(route.params.categoryId ?? '').trim())
const selectedCategory = computed(() => productCategoryStore.findItemsById(categoryId.value))

const filteredItems = computed(() => {
  const term = search.value.trim().toLowerCase()
  const source = categoryId.value
    ? productStore.itemsActiveArray.filter((item) => item.categoryIds.includes(categoryId.value))
    : productStore.itemsActiveArray

  if (!term) return source
  return source.filter((item) =>
    [item.title, item.subtitle].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(term),
    ),
  )
})

function goPageAdd() {
  router.push({ name: 'ProductEditView', params: { id: 'new' } })
}

function goToManageCategories() {
  router.push({ name: 'ProductCategoriesManageView' })
}
</script>

<template>
  <div class="container-fluid pb-t pt-3 pt-md-4 overflow-auto vh-100" :style="bgStyle">
    <HeaderApp :to="{ name: 'ProductCategoriesView' }">
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
            title="Prodotti"
            :description="categoryId
              ? 'Catalogo filtrato per categoria: apri una scheda per vedere dettagli, ingredienti e consigli d\'uso.'
              : 'Catalogo completo prodotti CNC Beauty: usa la ricerca per trovare subito la soluzione piu adatta.'"
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
            placeholder="Cerca prodotti..."
            aria-label="Cerca prodotti"
          />
        </div>
      </div>

      <div class="row g-3 g-lg-4 mt-1">
        <div v-for="item in filteredItems" :key="item.id" class="col-6 col-md-4 col-xl-3">
          <CatalogCard
            :title="item.title"
            :subtitle="item.subtitle"
            :price="item.price"
            :img-urls="item.imgUrls ?? []"
            :store-disabeld="item.storeDisabeld"
            :to="{ name: 'ProductView', params: { id: item.id }, query: { categoryId: categoryId || undefined } }"
          />
        </div>
      </div>

      <p v-if="!filteredItems.length" class="text-muted small mt-4 mb-0 text-center">
        {{ categoryId ? 'Nessun prodotto trovato per questa categoria.' : 'Nessun prodotto trovato.' }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.catalog-view {
  padding: 0 12px 1.5rem;
}

.catalog-view :deep(.section-header) {
  margin-bottom: 0;
}

.catalog-meta {
  color: rgba(75, 41, 53, 0.62);
  font-family: 'Space Grotesk', Arial, sans-serif;
  font-size: 0.84rem;
  line-height: 1.5;
  letter-spacing: 0.01em;
}

.catalog-search {
  min-height: 44px;
  border: 1px solid rgba(84, 44, 58, 0.3);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.78);
  padding: 0 0.9rem;
  font-family: 'Space Grotesk', Arial, sans-serif;
  font-size: 0.98rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: #4b2935;
  outline: none;
}

.catalog-search::placeholder {
  color: rgba(75, 41, 53, 0.58);
  letter-spacing: 0.02em;
}

.catalog-search:focus {
  border-color: rgba(84, 44, 58, 0.55);
  box-shadow: 0 0 0 2px rgba(232, 179, 190, 0.25);
}

@media (max-width: 575.98px) {
  .catalog-view {
    padding: 0 10px 1.25rem;
  }
}
</style>
