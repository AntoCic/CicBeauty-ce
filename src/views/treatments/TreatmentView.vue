<script setup lang="ts">
import { Btn, cicKitStore, toast, useChangeHeader } from "cic-kit";
import { Form, Field, ErrorMessage } from "vee-validate";
import { toTypedSchema } from "@vee-validate/yup";
import * as yup from "yup";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { treatmentStore } from "../../stores/treatmentStore";
import type { Treatment } from "../../models/Treatment";
import { Auth } from "../../main";

useChangeHeader("Dettaglio trattamento", { name: "TreatmentsView" });

const route = useRoute();
const router = useRouter();
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle());
const item = ref<Treatment | undefined>(undefined);
const isLoading = ref(false);
const canManage = computed(() => Auth.isAdmin || Auth.isSuperAdmin);

const jumpSchema = toTypedSchema(
  yup.object({
    id: yup.string().required("ID obbligatorio"),
  }),
);

async function loadItem() {
  const id = String(route.params.id ?? "");
  if (!id) return;

  isLoading.value = true;
  try {
    item.value = await treatmentStore.ensureOne(id);
    if (!item.value) {
      toast.warning("Trattamento non trovato");
    }
  } catch (error) {
    console.error(error);
    toast.error("Errore caricamento trattamento");
  } finally {
    isLoading.value = false;
  }
}

function asDateString(value: unknown) {
  if (!value) return "-";
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return date.toLocaleString();
  }
  return String(value);
}

function jumpToId(values: Record<string, unknown>) {
  const id = String(values.id ?? "").trim();
  if (!id) return;
  router.push({ name: "TreatmentView", params: { id } });
}

onMounted(() => {
  loadItem();
});
watch(() => route.params.id, loadItem);
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h5 mb-0">Dettaglio trattamento</h1>
      <Btn
        v-if="canManage"
        color="dark"
        icon="edit"
        :to="{ name: 'TreatmentEditView', params: { id: route.params.id } }"
      >
        Modifica
      </Btn>
    </div>

    <Form
      class="card border-0 shadow-sm p-3 mb-3"
      :validation-schema="jumpSchema"
      :initial-values="{ id: String(route.params.id ?? '') }"
      @submit="jumpToId"
    >
      <label class="form-label mb-1">Apri un altro trattamento tramite ID</label>
      <div class="d-flex gap-2">
        <Field name="id" class="form-control" placeholder="id trattamento" />
        <Btn type="submit" color="secondary" icon="search">Apri</Btn>
      </div>
      <ErrorMessage name="id" class="text-danger small mt-1 d-block" />
    </Form>

    <div v-if="isLoading" class="text-muted small">Caricamento...</div>

    <div v-else-if="item" class="card border-0 shadow-sm p-3">
      <h2 class="h6 mb-1">{{ item.title }}</h2>
      <p class="text-muted mb-3">{{ item.subtitle }}</p>

      <div class="row g-2 small">
        <div class="col-12 col-md-6"><strong>Prezzo:</strong> {{ item.price }} EUR</div>
        <div class="col-12 col-md-6"><strong>Durata:</strong> {{ item.duration }} min</div>
        <div class="col-12 col-md-6"><strong>ID tipo di spesa:</strong> {{ item.type_expense_id }}</div>
        <div class="col-12 col-md-6"><strong>Ordine vetrina:</strong> {{ item.storeOrder }}</div>
        <div class="col-12 col-md-6"><strong>Tipo di pelle:</strong> {{ item.tipiDiPelle }}</div>
        <div class="col-12 col-md-6"><strong>Visibile:</strong> {{ item.storeVisible ? "si" : "no" }}</div>
        <div class="col-12"><strong>Descrizione:</strong> {{ item.description || "-" }}</div>
        <div class="col-12"><strong>Ingredienti:</strong> {{ item.ingredienti || "-" }}</div>
        <div class="col-12"><strong>Tag:</strong> {{ item.tag.join(", ") || "-" }}</div>
        <div class="col-12"><strong>URL immagini:</strong> {{ item.imgUrls.join(", ") || "-" }}</div>
        <div class="col-12">
          <strong>URL descrizioni immagini:</strong> {{ item.imgDescriptionUrls.join(", ") || "-" }}
        </div>
        <div class="col-12">
          <strong>ID prodotti consigliati:</strong> {{ item.prodottiConsigliatiIds.join(", ") || "-" }}
        </div>
        <div class="col-12 col-md-6"><strong>Aggiornato da:</strong> {{ item.updateBy }}</div>
        <div class="col-12 col-md-6"><strong>Aggiornato il:</strong> {{ asDateString(item.updatedAt) }}</div>
      </div>
    </div>

    <p v-else class="text-muted small mb-0">Trattamento non trovato.</p>
  </div>
</template>
