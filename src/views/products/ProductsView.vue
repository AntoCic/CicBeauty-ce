<script setup lang="ts">
import { cicKitStore, useStoreWatch } from "cic-kit";
import { computed, ref } from "vue";
import CatalogCard from "../../components/CatalogCard.vue";
import { productStore } from "../../stores/productStore";
import { Auth } from "../../main";
import HeaderApp from "../../components/HeaderApp.vue";
import { useRouter } from "vue-router";

useStoreWatch([
  {
    store: productStore,
    getOpts: { orderBy: { fieldPath: "updatedAt", directionStr: "desc" } },
    checkLogin: false,
  },
]);

const router = useRouter();
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle());
const canManage = computed(() => Auth.isAdmin || Auth.isSuperAdmin);
const search = ref("");

const filteredItems = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) {
    return productStore.itemsActiveArray;
  }
  return productStore.itemsActiveArray.filter((item) =>
    [item.title, item.subtitle, item.type_expense_id].some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(term),
    ),
  );
});

function goPageAdd() {
  router.push({ name: 'ProductEditView', params: { id: 'new' } });
}
</script>

<template>
  <div class="container-fluid pb-t pt-3 pt-md-4 overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Prodotti" v-model="search" search-placeholder="Cerca prodotti..."
      :btn-icon="canManage ? 'add' : undefined" @btn-click="goPageAdd" />

    <section class="catalog-view">

      <div class="row g-3 g-lg-4 mt-1">
        <div v-for="item in filteredItems" :key="item.id" class="col-6 col-md-4 col-xl-3">
          <CatalogCard :title="item.title" :subtitle="item.subtitle" :price="item.price" :img-urls="item.imgUrls ?? []"
            :store-disabeld="item.storeDisabeld" :to="{ name: 'ProductView', params: { id: item.id } }" />
        </div>
      </div>

      <p v-if="!filteredItems.length" class="text-muted small mt-4 mb-0 text-center">
        Nessun prodotto trovato.
      </p>
    </section>
  </div>
</template>

<style scoped>
.catalog-page {
  min-height: 100%;
  overflow-y: auto;
}

.catalog-view {
  padding: 0 12px 1.5rem;
}

.catalog-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
}

@media (max-width: 575.98px) {
  .catalog-view {
    padding: 0 10px 1.25rem;
  }

  .catalog-toolbar {
    margin-bottom: 0.5rem;
  }
}

:deep(.catalog-toolbar .btn) {
  border-radius: 2px;
}

:deep(.catalog-toolbar .btn:focus-visible) {
  box-shadow: none;
}
</style>
