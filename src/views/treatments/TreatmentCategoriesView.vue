<script setup lang="ts">
import { Btn, cicKitStore, useStoreWatch } from 'cic-kit'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import CategoryCatalogCard from '../../components/CategoryCatalogCard.vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import AppHeaderCatalogNav from '../../components/headers/AppHeaderCatalogNav.vue'
import SectionHeader from '../../components/public/SectionHeader.vue'
import { buildCategoryItemCount, filterBySearch } from '../../catalog/utils'
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

const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const canManage = computed(() => Auth.isAdmin || Auth.isSuperAdmin)
const search = ref('')

const countsByCategoryId = computed(() => {
  return buildCategoryItemCount(treatmentStore.itemsActiveArray, (treatment) => treatment.categoryIds)
})

const categoryCards = computed(() => {
  const sorted = [...treatmentCategoryStore.itemsActiveArray]
    .sort((a, b) => a.title.localeCompare(b.title, 'it'))
    .map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle ?? '',
      imgUrls: item.imgUrls ?? [],
      count: countsByCategoryId.value[item.id] ?? 0,
      to: { name: 'TreatmentsView', params: { categoryId: item.id } },
    }))

  const cards = [
    ...sorted,
    {
      id: '__all-treatments__',
      title: 'Tutti i trattamenti',
      subtitle: 'Catalogo completo',
      imgUrls: ['/img/logo/bg-pattern.png'],
      count: treatmentStore.itemsActiveArray.length,
      to: { name: 'TreatmentsView' },
    },
  ]

  return filterBySearch(cards, search.value, (item) => [item.title, item.subtitle])
})

function goToManageCategories() {
  router.push({ name: 'TreatmentCategoriesManageView' })
}

function goToNewTreatment() {
  router.push({ name: 'TreatmentEditView', params: { id: 'new' } })
}
</script>

<template>
  <div class="container-fluid pb-t pt-3 pt-md-4 overflow-auto vh-100" :style="bgStyle">
    <HeaderApp :to="{ name: 'home' }">
      <AppHeaderCatalogNav />
      <div v-if="canManage" class="d-inline-flex align-items-center gap-1">
        <Btn icon="edit_note" variant="ghost" @click="goToManageCategories" />
        <Btn icon="add" variant="ghost" @click="goToNewTreatment" />
      </div>
    </HeaderApp>

    <section class="catalog-view">
      <div class="row g-3 g-md-4 mt-1 mb-3 mb-lg-4">
        <div class="col-12 col-md-6 col-lg-8">
          <SectionHeader
            eyebrow="Categorie"
            title="Trattamenti"
            description="Scegli una categoria trattamenti CNC Beauty e apri il catalogo per confrontare durata, obiettivo e risultato atteso."
          />
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <input
            v-model="search"
            type="search"
            class="form-control catalog-search"
            placeholder="Cerca categoria..."
            aria-label="Cerca categoria trattamenti"
          />
        </div>
      </div>

      <div class="row g-3 g-lg-4 mt-1">
        <div v-for="item in categoryCards" :key="item.id" class="col-12 col-md-6">
          <CategoryCatalogCard
            :title="item.title"
            :subtitle="item.subtitle"
            :img-urls="item.imgUrls"
            :count="item.count"
            count-label="trattamenti"
            :to="item.to"
          />
        </div>
      </div>

      <p v-if="!categoryCards.length" class="text-muted small mt-4 mb-0 text-center">
        Nessuna categoria trattamenti disponibile.
      </p>

      <div v-if="canManage && !treatmentCategoryStore.itemsActiveArray.length" class="text-center mt-3">
        <Btn color="secondary" icon="add" @click="goToManageCategories">Crea categorie trattamenti</Btn>
      </div>
    </section>
  </div>
</template>
