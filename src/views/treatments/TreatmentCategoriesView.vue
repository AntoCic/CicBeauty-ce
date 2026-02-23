<script setup lang="ts">
import { Btn, cicKitStore, useStoreWatch } from 'cic-kit'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import HeaderApp from '../../components/HeaderApp.vue'
import CategoryCatalogCard from '../../components/CategoryCatalogCard.vue'
import { Auth } from '../../main'
import { treatmentStore } from '../../stores/treatmentStore'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'

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
  const counts: Record<string, number> = {}
  for (const treatment of treatmentStore.itemsActiveArray) {
    for (const categoryId of treatment.categoryIds) {
      counts[categoryId] = (counts[categoryId] ?? 0) + 1
    }
  }
  return counts
})

const categoryCards = computed(() => {
  const term = search.value.trim().toLowerCase()
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
    {
      id: '__all-treatments__',
      title: 'Tutti i trattamenti',
      subtitle: 'Catalogo completo',
      imgUrls: ['/img/logo/bg-pattern.png'],
      count: treatmentStore.itemsActiveArray.length,
      to: { name: 'TreatmentsView' },
    },
    ...sorted,
  ]

  if (!term) return cards
  return cards.filter((item) =>
    [item.title, item.subtitle].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(term),
    ),
  )
})

function goToManageCategories() {
  router.push({ name: 'TreatmentCategoriesManageView' })
}

function goToNewTreatment() {
  router.push({ name: 'TreatmentEditView', params: { id: 'new' } })
}
</script>

<template>
  <div class="container-fluid pb-t pt-3 pt-md-4 overflow-auto h-100" :style="bgStyle">
    <HeaderApp
      title="Categorie trattamenti"
      :to="{ name: 'home' }"
      v-model="search"
      search-placeholder="Cerca categoria..."
      :btn-icon="canManage ? 'edit_note' : undefined"
      :btn2-icon="canManage ? 'add' : undefined"
      @btn-click="goToManageCategories"
      @btn2-click="goToNewTreatment"
    />

    <section class="catalog-view">
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
