<script setup lang="ts">
import { Btn, cicKitStore, useChangeHeader, useHeaderExtra, useStoreWatch } from "cic-kit";
import { Form, Field } from "vee-validate";
import { toTypedSchema } from "@vee-validate/yup";
import * as yup from "yup";
import { computed } from "vue";
import CatalogCard from "../../components/CatalogCard.vue";
import { productStore } from "../../stores/productStore";
import { Auth } from "../../main";

useChangeHeader("Prodotti", "/");
useStoreWatch([
  {
    store: productStore,
    getOpts: { orderBy: { fieldPath: "updatedAt", directionStr: "desc" } },
    checkLogin: false,
  },
]);

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle());
const canManage = computed(() => Auth.isAdmin || Auth.isSuperAdmin);

const filterSchema = toTypedSchema(
  yup.object({
    search: yup.string().default(""),
  }),
);

function filteredItems(search: string | undefined) {
  const term = (search ?? "").trim().toLowerCase();
  if (!term) return productStore.itemsActiveArray;

  return productStore.itemsActiveArray.filter((item) =>
    [item.title, item.subtitle, item.type_expense_id].some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(term),
    ),
  );
}

useHeaderExtra((Btn), {
  to: { name: 'ProductEditView', params: { id: 'new' } },
  variant: "ghost", icon: "add",
  class: canManage.value ? '': 'd-none'
})
</script>

<template>
  <div class="container-fluid pb-t pt-3 pt-md-4 overflow-auto h-100" :style="bgStyle">
    <Form :validation-schema="filterSchema" :initial-values="{ search: '' }" v-slot="{ values }" class="catalog-view">
      <div class="catalog-search-wrap">
        <Field name="search" class="form-control catalog-search-input" placeholder="Cerca prodotti..." />
      </div>

      <div class="row g-3 g-lg-4 mt-1">
        <div v-for="item in filteredItems(values.search)" :key="item.id" class="col-6 col-md-4 col-xl-3">
          <CatalogCard
            :title="item.title"
            :subtitle="item.subtitle"
            :price="item.price"
            :img-urls="item.imgUrls ?? []"
            :store-disabeld="item.storeDisabeld"
          >
            <template #actions>
              <Btn color="dark" icon="visibility" class="w-100" :to="{ name: 'ProductView', params: { id: item.id } }">
                Apri prodotto
              </Btn>
              <Btn v-if="canManage" color="secondary" icon="edit" class="w-100"
                :to="{ name: 'ProductEditView', params: { id: item.id } }">
                Modifica
              </Btn>
            </template>
          </CatalogCard>
        </div>
      </div>

      <p v-if="!filteredItems(values.search).length" class="text-muted small mt-4 mb-0">Nessun prodotto trovato.</p>
    </Form>
  </div>
</template>

<style scoped>
.catalog-view {
  padding-bottom: 1.5rem;
}

.catalog-search-wrap {
  width: 100%;
  max-width: 28rem;
  margin: 0 auto;
}

.catalog-search-input {
  min-height: 3rem;
  border-radius: 0;
  border-color: rgba(0, 0, 0, 0.25);
  background-color: rgba(255, 255, 255, 0.88);
}

.catalog-search-input:focus {
  border-color: #111;
  box-shadow: none;
  outline: none;
}

.catalog-search-input:focus-visible {
  outline: none;
}
</style>
