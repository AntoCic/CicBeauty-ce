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
  class: canManage ? '': 'd-none'
})
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">

    <Form :validation-schema="filterSchema" :initial-values="{ search: '' }" v-slot="{ values }" class="mb-3">
      <Field name="search" class="form-control" placeholder="Cerca prodotti..." />

      <div class="vstack gap-2 mt-3">
        <div v-for="item in filteredItems(values.search)" :key="item.id" class="card border-0 shadow-sm p-3">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <h2 class="h6 mb-1">{{ item.title }}</h2>
              <p class="text-muted mb-0">{{ item.subtitle }}</p>
            </div>
            <span class="badge text-bg-light">{{ item.price }} EUR</span>
          </div>

          <div class="d-flex gap-2 mt-3">
            <Btn color="dark" icon="visibility" :to="{ name: 'ProductView', params: { id: item.id } }">Apri</Btn>
            <Btn v-if="canManage" color="secondary" icon="edit"
              :to="{ name: 'ProductEditView', params: { id: item.id } }">
              Modifica
            </Btn>
          </div>
        </div>

        <p v-if="!filteredItems(values.search).length" class="text-muted small mb-0">Nessun prodotto trovato.</p>
      </div>
    </Form>
  </div>
</template>
