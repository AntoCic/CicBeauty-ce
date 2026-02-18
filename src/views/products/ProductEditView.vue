<script setup lang="ts">
import { Btn, cicKitStore, toast, useChangeHeader, useStoreWatch } from "cic-kit";
import { Form, Field, ErrorMessage } from "vee-validate";
import { toTypedSchema } from "@vee-validate/yup";
import * as yup from "yup";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { productStore } from "../../stores/productStore";
import type { Product } from "../../models/Product";
import { Auth } from "../../main";
import { typeExpenseStore } from "../../stores/typeExpenseStore";

type ProductForm = {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  type_expense_id: string;
  duration: number | string;
  price: number | string;
  updateBy: string;
  description: string;
  imgUrls: string;
  storeOrder: number | string;
  tag: string;
  imgDescriptionUrls: string;
  tipiDiPelle: string;
  consigliUso: string;
  ingredienti: string;
  storeVisible: boolean;
  storeDisabeld: string;
  trattamentiConsogliatiIds: string;
};

useChangeHeader("Modifica prodotto", { name: "ProductsView" });
useStoreWatch([{ store: typeExpenseStore }]);

const route = useRoute();
const router = useRouter();
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle());
const current = ref<Product | undefined>(undefined);
const isLoading = ref(false);

const routeId = computed(() => String(route.params.id ?? "").trim());
const isCreateMode = computed(() => !routeId.value || routeId.value === "new");
const defaultUpdateBy = computed(() => {
  const email = Auth.user?.email?.trim();
  if (email) return email;
  const uid = Auth.uid?.trim();
  if (uid) return uid;
  return "admin";
});

const schema = toTypedSchema(
  yup.object({
    title: yup.string().required("Campo obbligatorio"),
    subtitle: yup.string().required("Campo obbligatorio"),
    icon: yup.string().required("Campo obbligatorio"),
    color: yup.string().required("Campo obbligatorio"),
    type_expense_id: yup.string().required("Campo obbligatorio"),
    duration: yup.number().typeError("Numero obbligatorio").required("Campo obbligatorio"),
    price: yup.number().typeError("Numero obbligatorio").required("Campo obbligatorio"),
    updateBy: yup.string().required("Campo obbligatorio"),
    description: yup.string().default(""),
    imgUrls: yup.string().default(""),
    storeOrder: yup.number().typeError("Numero obbligatorio").default(0),
    tag: yup.string().default(""),
    imgDescriptionUrls: yup.string().default(""),
    tipiDiPelle: yup.string().default(""),
    consigliUso: yup.string().default(""),
    ingredienti: yup.string().default(""),
    storeVisible: yup.boolean().default(true),
    storeDisabeld: yup.string().default(""),
    trattamentiConsogliatiIds: yup.string().default(""),
  }),
);

const formKey = computed(() => (isCreateMode.value ? "product-new" : current.value?.id ?? "product-edit"));

const initialValues = computed<ProductForm>(() => ({
  title: current.value?.title ?? "",
  subtitle: current.value?.subtitle ?? "",
  icon: current.value?.icon ?? "",
  color: current.value?.color ?? "",
  type_expense_id: current.value?.type_expense_id ?? "",
  duration: current.value?.duration ?? 0,
  price: current.value?.price ?? 0,
  updateBy: current.value?.updateBy ?? defaultUpdateBy.value,
  description: current.value?.description ?? "",
  imgUrls: current.value?.imgUrls.join(", ") ?? "",
  storeOrder: current.value?.storeOrder ?? 0,
  tag: current.value?.tag.join(", ") ?? "",
  imgDescriptionUrls: current.value?.imgDescriptionUrls.join(", ") ?? "",
  tipiDiPelle: current.value?.tipiDiPelle ?? "",
  consigliUso: current.value?.consigliUso ?? "",
  ingredienti: current.value?.ingredienti ?? "",
  storeVisible: current.value?.storeVisible ?? true,
  storeDisabeld: current.value?.storeDisabeld ?? "",
  trattamentiConsogliatiIds: current.value?.trattamentiConsogliatiIds.join(", ") ?? "",
}));

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function loadItem() {
  if (isCreateMode.value) {
    current.value = undefined;
    return;
  }

  isLoading.value = true;
  try {
    current.value = await productStore.ensureOne(routeId.value);
    if (!current.value) {
      toast.warning("Prodotto non trovato");
    }
  } catch (error) {
    console.error(error);
    toast.error("Errore caricamento prodotto");
  } finally {
    isLoading.value = false;
  }
}

async function onSubmit(values: Record<string, unknown>) {
  const form: ProductForm = {
    title: String(values.title ?? ""),
    subtitle: String(values.subtitle ?? ""),
    icon: String(values.icon ?? ""),
    color: String(values.color ?? ""),
    type_expense_id: String(values.type_expense_id ?? ""),
    duration: Number(values.duration ?? 0),
    price: Number(values.price ?? 0),
    updateBy: String(values.updateBy ?? ""),
    description: String(values.description ?? ""),
    imgUrls: String(values.imgUrls ?? ""),
    storeOrder: Number(values.storeOrder ?? 0),
    tag: String(values.tag ?? ""),
    imgDescriptionUrls: String(values.imgDescriptionUrls ?? ""),
    tipiDiPelle: String(values.tipiDiPelle ?? ""),
    consigliUso: String(values.consigliUso ?? ""),
    ingredienti: String(values.ingredienti ?? ""),
    storeVisible: Boolean(values.storeVisible),
    storeDisabeld: String(values.storeDisabeld ?? ""),
    trattamentiConsogliatiIds: String(values.trattamentiConsogliatiIds ?? ""),
  };

  const payload = {
    title: form.title,
    subtitle: form.subtitle,
    icon: form.icon,
    color: form.color,
    type_expense_id: form.type_expense_id,
    duration: Number(form.duration),
    price: Number(form.price),
    updateBy: form.updateBy,
    description: form.description,
    imgUrls: splitCsv(form.imgUrls),
    storeOrder: Number(form.storeOrder),
    tag: splitCsv(form.tag),
    imgDescriptionUrls: splitCsv(form.imgDescriptionUrls),
    tipiDiPelle: form.tipiDiPelle,
    consigliUso: form.consigliUso,
    ingredienti: form.ingredienti,
    storeVisible: form.storeVisible,
    storeDisabeld: form.storeDisabeld,
    trattamentiConsogliatiIds: splitCsv(form.trattamentiConsogliatiIds),
  };

  try {
    if (isCreateMode.value) {
      const created = await productStore.add(payload);
      toast.success("Prodotto creato");
      await router.replace({ name: "ProductEditView", params: { id: created.id } });
      return;
    }

    if (!current.value) return;
    await current.value.update(payload);
    toast.success("Prodotto aggiornato");
    await loadItem();
  } catch (error) {
    console.error(error);
    toast.error("Errore salvataggio prodotto");
  }
}

onMounted(() => {
  loadItem();
});
watch(() => route.params.id, loadItem);
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h5 mb-0">{{ isCreateMode ? "Nuovo prodotto" : "Modifica prodotto" }}</h1>
      <Btn v-if="!isCreateMode" color="secondary" icon="visibility"
        :to="{ name: 'ProductView', params: { id: route.params.id } }">
        Apri
      </Btn>
    </div>

    <div v-if="isLoading" class="text-muted small">Caricamento...</div>

    <Form v-else-if="current || isCreateMode" :key="formKey" :validation-schema="schema" :initial-values="initialValues"
      @submit="onSubmit" v-slot="{ values, isSubmitting }" class="vstack gap-3">
      <div class="card border-0 shadow-sm p-3">
        <div class="row g-3">
          <div class="col-12 col-md-6">
            <label class="form-label">Titolo</label>
            <Field name="title" class="form-control" />
            <ErrorMessage name="title" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Sottotitolo</label>
            <Field name="subtitle" class="form-control" />
            <ErrorMessage name="subtitle" class="text-danger small" />
          </div>
          <div class="col-12 col-md-4">
            <label class="form-label">Icona</label>
            <Field name="icon" class="form-control" />
            <ErrorMessage name="icon" class="text-danger small" />
          </div>
          <div class="col-12 col-md-4">
            <label class="form-label">Colore</label>
            <Field name="color" class="form-control" />
            <ErrorMessage name="color" class="text-danger small" />
          </div>
          <div class="col-12 col-md-4">
            <label class="form-label">ID tipo di spesa</label>
            <Field name="type_expense_id" class="form-control" />
            <ErrorMessage name="type_expense_id" class="text-danger small" />
          </div>
          <div class="col-12 col-md-4">
            <label class="form-label">Durata (min)</label>
            <Field name="duration" type="number" class="form-control" />
            <ErrorMessage name="duration" class="text-danger small" />
          </div>
          <div class="col-12 col-md-4">
            <label class="form-label">Prezzo</label>
            <Field name="price" type="number" class="form-control" />
            <ErrorMessage name="price" class="text-danger small" />
          </div>
          <div class="col-12 col-md-4">
            <label class="form-label">Ordine vetrina</label>
            <Field name="storeOrder" type="number" class="form-control" />
          </div>
          <div class="col-12 col-md-8">
            <label class="form-label">Aggiornato da</label>
            <Field name="updateBy" class="form-control" />
            <ErrorMessage name="updateBy" class="text-danger small" />
          </div>
          <div class="col-12 col-md-4">
            <div class="form-check mt-4 pt-2">
              <Field name="storeVisible" type="checkbox" class="form-check-input me-2" />
              <label class="form-check-label">Visibile nello store</label>
            </div>
          </div>
          <div class="col-12 col-md-8">
            <label class="form-label">Store disabilitato</label>
            <Field name="storeDisabeld" class="form-control" />
          </div>
          <div class="col-12">
            <label class="form-label">Descrizione</label>
            <Field name="description" as="textarea" class="form-control" rows="3" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Tipo di pelle</label>
            <Field name="tipiDiPelle" class="form-control" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Consigli d'uso</label>
            <Field name="consigliUso" class="form-control" />
          </div>
          <div class="col-12">
            <label class="form-label">Ingredienti</label>
            <Field name="ingredienti" as="textarea" class="form-control" rows="2" />
          </div>
          <div class="col-12">
            <label class="form-label">Tag (separati da virgola)</label>
            <Field name="tag" class="form-control" />
          </div>
          <div class="col-12">
            <label class="form-label">URL immagini (separati da virgola)</label>
            <Field name="imgUrls" class="form-control" />
          </div>
          <div class="col-12">
            <label class="form-label">URL descrizione immagini (separati da virgola)</label>
            <Field name="imgDescriptionUrls" class="form-control" />
          </div>
          <div class="col-12">
            <label class="form-label">ID trattamenti consigliati (separati da virgola)</label>
            <Field name="trattamentiConsogliatiIds" class="form-control" />
          </div>
        </div>

        <div class="d-flex gap-2 mt-3">
          <Btn type="submit" color="dark" icon="save" :loading="isSubmitting">
            {{ isCreateMode ? "Crea" : "Salva" }}
          </Btn>
          <Btn color="secondary" icon="sync" @click="loadItem">Ricarica</Btn>
        </div>
      </div>

      <div class="card border-0 shadow-sm p-3">
        <h2 class="h6 mb-2">Anteprima</h2>
        <p class="fw-semibold mb-1">{{ values.title || "-" }}</p>
        <p class="text-muted small mb-2">{{ values.subtitle || "-" }}</p>
        <p class="small mb-1"><strong>Prezzo:</strong> {{ values.price }} EUR</p>
        <p class="small mb-1"><strong>Durata:</strong> {{ values.duration }} min</p>
        <p class="small mb-1"><strong>Descrizione:</strong> {{ values.description || "-" }}</p>
        <p class="small mb-0"><strong>Tag:</strong> {{ values.tag || "-" }}</p>
      </div>
    </Form>

    <p v-else class="text-muted small mb-0">Prodotto non trovato.</p>
  </div>
</template>
