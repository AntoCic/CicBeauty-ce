<script setup lang="ts">
import { cicKitStore, useStoreWatch } from 'cic-kit'
import { computed, ref } from 'vue'
import CatalogCard from '../../components/CatalogCard.vue'
import { productStore } from '../../stores/productStore'
import { Auth } from '../../main'
import HeaderApp from '../../components/HeaderApp.vue'
import { useRoute, useRouter } from 'vue-router'
import { productCategoryStore } from '../../stores/productCategoryStore'

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
const canManage = computed(() => Auth.isAdmin || Auth.isSuperAdmin)
const search = ref('')

const categoryId = computed(() => String(route.params.categoryId ?? '').trim())
const selectedCategory = computed(() => productCategoryStore.findItemsById(categoryId.value))
const title = computed(() => selectedCategory.value?.title ?? 'Prodotti')

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
  <div class="container-fluid pb-t pt-3 pt-md-4 overflow-auto h-100" :style="bgStyle">
    <HeaderApp
      :title="title"
      :to="{ name: 'ProductCategoriesView' }"
      v-model="search"
      search-placeholder="Cerca prodotti..."
      :btn-icon="canManage ? 'edit_note' : undefined"
      :btn2-icon="canManage ? 'add' : undefined"
      @btn-click="goToManageCategories"
      @btn2-click="goPageAdd"
    />

    <section class="catalog-view">
      <p v-if="selectedCategory?.subtitle" class="small text-muted mb-2">{{ selectedCategory.subtitle }}</p>

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

@media (max-width: 575.98px) {
  .catalog-view {
    padding: 0 10px 1.25rem;
  }
}
</style>
