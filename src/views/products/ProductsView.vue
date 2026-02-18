<script setup lang="ts">
import { Btn, cicKitStore, useChangeHeader, useHeaderExtra, useStoreWatch } from "cic-kit";
import { Form, Field } from "vee-validate";
import { toTypedSchema } from "@vee-validate/yup";
import * as yup from "yup";
import { computed } from "vue";
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
const priceFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

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

function primaryImage(urls: string[] | undefined) {
  return urls?.find((url) => !!url) ?? "";
}

function formatPrice(price: number | undefined) {
  if (typeof price !== "number" || Number.isNaN(price)) return "-";
  return priceFormatter.format(price);
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
        <div v-for="item in filteredItems(values.search)" :key="item.id" class="col-12 col-md-6 col-xl-4">
          <article class="catalog-card h-100">
            <div class="catalog-media">
              <img v-if="primaryImage(item.imgUrls)" :src="primaryImage(item.imgUrls)" :alt="item.title" class="img-fluid catalog-img" />
              <div v-else class="catalog-media-placeholder">Nessuna immagine</div>
            </div>

            <div class="catalog-info">
              <h2 class="catalog-title">{{ item.title }}</h2>
              <p class="catalog-subtitle">{{ item.subtitle || "-" }}</p>
              <p class="catalog-price">{{ formatPrice(item.price) }}</p>
            </div>

            <div class="catalog-actions">
              <Btn color="dark" icon="visibility" class="w-100" :to="{ name: 'ProductView', params: { id: item.id } }">
                Apri prodotto
              </Btn>
              <Btn v-if="canManage" color="secondary" icon="edit" class="w-100"
                :to="{ name: 'ProductEditView', params: { id: item.id } }">
                Modifica
              </Btn>
            </div>
          </article>
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
  max-width: 28rem;
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

.catalog-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.1rem;
  border: 1px solid rgba(0, 0, 0, 0.18);
  background-color: rgba(255, 255, 255, 0.42);
}

.catalog-media {
  min-height: 12.5rem;
  display: grid;
  place-items: center;
}

.catalog-img {
  max-height: 12.5rem;
  object-fit: contain;
}

.catalog-media-placeholder {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.62);
}

.catalog-info {
  text-align: center;
}

.catalog-title {
  margin-bottom: 0.35rem;
  font-size: 1rem;
  font-weight: 500;
}

.catalog-subtitle {
  margin-bottom: 0.35rem;
  color: rgba(0, 0, 0, 0.72);
}

.catalog-price {
  margin-bottom: 0;
  font-weight: 600;
}

.catalog-actions {
  margin-top: auto;
  display: grid;
  gap: 0.55rem;
}

:deep(.catalog-actions .btn) {
  border-radius: 0;
  box-shadow: none;
}

:deep(.catalog-actions .btn:focus-visible) {
  box-shadow: none;
}
</style>
