<script setup lang="ts">
import { Btn, cicKitStore, useStoreWatch } from 'cic-kit'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import HeaderApp from '../../components/HeaderApp.vue'
import { treatmentStore } from '../../stores/treatmentStore'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { Auth } from '../../main'

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
const priceFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

const categoryMap = computed(() => {
  const map: Record<string, string> = {}
  for (const category of treatmentCategoryStore.itemsActiveArray) {
    map[category.id] = category.title
  }
  return map
})

function categoryLabels(categoryIds: string[]) {
  return categoryIds
    .map((id) => categoryMap.value[id] ?? '')
    .filter(Boolean)
    .join(' | ')
}

function formatPrice(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return priceFormatter.format(value)
}

const filteredItems = computed(() => {
  const term = search.value.trim().toLowerCase()
  const source = [...treatmentStore.itemsActiveArray].sort((a, b) => a.title.localeCompare(b.title, 'it'))
  if (!term) return source

  return source.filter((item) => {
    const categoryText = categoryLabels(item.categoryIds)
    const rawPrice = typeof item.price === 'number' && Number.isFinite(item.price) ? String(item.price) : ''
    const formattedPrice = formatPrice(item.price).toLowerCase()
    return [item.title, item.subtitle, categoryText, rawPrice, formattedPrice].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(term),
    )
  })
})

function goToCreate() {
  router.push({ name: 'TreatmentEditView', params: { id: 'new' } })
}

function goToEdit(treatmentId: string) {
  router.push({ name: 'TreatmentEditView', params: { id: treatmentId } })
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp
      title="Trattamenti"
      :to="{ name: 'home' }"
      v-model="search"
      search-placeholder="Cerca per titolo, sottotitolo, prezzo o categoria..."
      :btn2-icon="canManage ? 'add' : undefined"
      @btn2-click="goToCreate"
    />

    <section class="compact-list">
      <p v-if="!canManage" class="text-muted small mt-2">
        Questa sezione e riservata ad amministratori e super amministratori.
      </p>

      <div v-if="canManage" class="vstack gap-1">
        <article v-for="item in filteredItems" :key="item.id" class="card border-0 shadow-sm compact-item">
          <div class="d-flex align-items-center justify-content-between gap-2">
            <div class="min-w-0">
              <p class="compact-title mb-0">
                {{ item.storeVisible ? '🟢' : '🔴' }} {{ formatPrice(item.price) }} {{ item.title }}
              </p>
              <p class="compact-meta mb-0">
                {{ item.subtitle || '-' }} | {{ categoryLabels(item.categoryIds) || 'Nessuna categoria' }}
              </p>
            </div>

            <Btn type="button" color="dark" variant="outline" icon="edit" @click="goToEdit(item.id)">
              Edit
            </Btn>
          </div>
        </article>

        <p v-if="!filteredItems.length" class="text-muted small mb-0 mt-1">Nessun trattamento.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.compact-list {
  padding: 0 8px 1.1rem;
}

.compact-item {
  padding: 0.55rem 0.7rem;
}

.compact-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: #3d232c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.compact-meta {
  font-size: 0.76rem;
  color: rgba(61, 35, 44, 0.72);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.min-w-0 {
  min-width: 0;
}

@media (max-width: 575.98px) {
  .compact-list {
    padding: 0 6px 1rem;
  }

  .compact-item {
    padding: 0.5rem 0.58rem;
  }
}
</style>
