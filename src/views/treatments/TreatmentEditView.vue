<script setup lang="ts">
import { Btn, cicKitStore, toast, useChangeHeader, useStoreWatch } from "cic-kit";
import { Form, Field, ErrorMessage } from "vee-validate";
import { toTypedSchema } from "@vee-validate/yup";
import * as yup from "yup";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { Treatment, TreatmentData } from "../../models/Treatment";
import { Auth } from "../../main";
import { treatmentStore } from "../../stores/treatmentStore";
import { typeExpenseStore } from "../../stores/typeExpenseStore";
import HeaderApp from "../../components/HeaderApp.vue";

type TreatmentForm = {
  title: string;
  subtitle: string;
  type_expense_id: string;
  duration: number | string;
  price: number | string;
  description: string;
  storeVisible: boolean | string;
  storeDisabeld: string;
};

useChangeHeader("Modifica trattamento", { name: "TreatmentsView" });
useStoreWatch([{ store: typeExpenseStore, getOpts: { forceLocalSet: true } }]);

const route = useRoute();
const router = useRouter();
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle());
const current = ref<Treatment | undefined>(undefined);
const isLoading = ref(false);
const isDeleting = ref(false);

const routeId = computed(() => String(route.params.id ?? "").trim());
const isCreateMode = computed(() => !routeId.value || routeId.value === "new");
const typeExpenseOptions = computed(() =>
  [...typeExpenseStore.itemsActiveArray].sort((a, b) => a.name.localeCompare(b.name, "it")),
);
const defaultUpdateBy = computed(() => String(Auth.uid ?? "").trim());

const schema = toTypedSchema(
  yup.object({
    title: yup.string().required("Campo obbligatorio"),
    subtitle: yup.string().default(""),
    type_expense_id: yup.string().required("Campo obbligatorio"),
    duration: yup.number().typeError("Numero obbligatorio").required("Campo obbligatorio"),
    price: yup.number().typeError("Numero obbligatorio").required("Campo obbligatorio"),
    description: yup.string().default(""),
    storeVisible: yup.boolean().required("Campo obbligatorio"),
    storeDisabeld: yup.string().default(""),
  }),
);

const formKey = computed(() => (isCreateMode.value ? "treatment-new" : current.value?.id ?? "treatment-edit"));

const initialValues = computed<TreatmentForm>(() => ({
  title: current.value?.title ?? "",
  subtitle: current.value?.subtitle ?? "",
  type_expense_id: current.value?.type_expense_id ?? "",
  duration: current.value?.duration ?? 0,
  price: current.value?.price ?? 0,
  description: current.value?.description ?? "",
  storeVisible: current.value?.storeVisible ?? true,
  storeDisabeld: current.value?.storeDisabeld ?? "",
}));

function typeExpenseLabel(typeExpense: { emoji?: string; name: string }) {
  const emoji = String(typeExpense.emoji ?? "").trim();
  const name = String(typeExpense.name ?? "").trim();
  return [emoji, name].filter(Boolean).join(" ");
}

function normalizeString(value: unknown, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function normalizeNumber(value: unknown, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["true", "1", "yes", "si", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  return fallback;
}

function buildCreatePayload(form: TreatmentForm): Omit<TreatmentData, "id"> {
  return {
    title: form.title,
    subtitle: form.subtitle,
    icon: "",
    color: "#000000",
    type_expense_id: form.type_expense_id,
    duration: normalizeNumber(form.duration, 0),
    price: normalizeNumber(form.price, 0),
    description: form.description,
    imgUrls: [],
    storeOrder: 0,
    tag: [],
    imgDescriptionUrls: [],
    tipiDiPelle: "",
    prodottiConsigliatiIds: [],
    ingredienti: "",
    storeVisible: normalizeBoolean(form.storeVisible, true),
    storeDisabeld: normalizeString(form.storeDisabeld, ""),
    updateBy: defaultUpdateBy.value,
  };
}

async function loadItem() {
  if (isCreateMode.value) {
    current.value = undefined;
    return;
  }

  isLoading.value = true;
  try {
    current.value = await treatmentStore.ensureOne(routeId.value);
    if (!current.value) {
      toast.warning("Trattamento non trovato");
    }
  } catch (error) {
    console.error(error);
    toast.error("Errore caricamento trattamento");
  } finally {
    isLoading.value = false;
  }
}

async function onSubmit(values: Record<string, unknown>) {
  const form: TreatmentForm = {
    title: normalizeString(values.title),
    subtitle: normalizeString(values.subtitle, ""),
    type_expense_id: normalizeString(values.type_expense_id),
    duration: normalizeNumber(values.duration, 0),
    price: normalizeNumber(values.price, 0),
    description: normalizeString(values.description, ""),
    storeVisible: normalizeBoolean(values.storeVisible, true),
    storeDisabeld: normalizeString(values.storeDisabeld, ""),
  };

  const updatePayload = {
    title: form.title,
    subtitle: form.subtitle,
    type_expense_id: form.type_expense_id,
    duration: normalizeNumber(form.duration, 0),
    price: normalizeNumber(form.price, 0),
    description: form.description,
    storeVisible: normalizeBoolean(form.storeVisible, true),
    storeDisabeld: normalizeString(form.storeDisabeld, ""),
    updateBy: defaultUpdateBy.value,
  };

  try {
    if (isCreateMode.value) {
      await treatmentStore.add(buildCreatePayload(form));
      toast.success("Trattamento creato");
      await router.replace({ name: "TreatmentsView" });
      return;
    }

    if (!current.value) return;

    await current.value.update(updatePayload);
    toast.success("Trattamento aggiornato");
    await router.replace({ name: "TreatmentsView" });
  } catch (error) {
    console.error(error);
    toast.error("Errore salvataggio trattamento");
  }
}

async function onDeleteTreatment() {
  if (isCreateMode.value || !current.value || isDeleting.value) return;

  const treatment = current.value;
  const treatmentLabel = normalizeString(treatment.title, "questo trattamento");
  const confirmDelete = window.confirm(`Eliminare definitivamente "${treatmentLabel}"?`);
  if (!confirmDelete) return;

  isDeleting.value = true;
  try {
    await treatment.delete(treatmentStore);
    toast.success("Trattamento eliminato");
    await router.replace({ name: "TreatmentsView" });
  } catch (error) {
    console.error(error);
    toast.error("Errore eliminazione trattamento");
  } finally {
    isDeleting.value = false;
  }
}

onMounted(() => {
  loadItem();
});
watch(() => route.params.id, loadItem);

function goPageDettaglio() {
  if (isCreateMode.value) return;
  router.push({ name: 'TreatmentView', params: { id: route.params.id } });
}

</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp :title="isCreateMode ? 'Nuovo trattamento' : 'Modifica trattamento'"
      :btn-icon="!isCreateMode ? 'visibility' : undefined" @btn-click="goPageDettaglio" />

    <div class="edit-wrapper mx-auto py-3 py-md-4">

      <div v-if="isLoading" class="text-muted small">Caricamento...</div>

      <Form v-else-if="current || isCreateMode" :key="formKey" :validation-schema="schema"
        :initial-values="initialValues" @submit="onSubmit" v-slot="{ isSubmitting }">
        <div class="card border-0 shadow-sm p-3 p-md-4">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label">Titolo</label>
              <Field name="title" class="form-control" />
              <ErrorMessage name="title" class="text-danger small" />
            </div>
            <div class="col-12">
              <label class="form-label">Sottotitolo</label>
              <Field name="subtitle" class="form-control" />
              <small class="form-text text-muted d-block">Non obbligatorio</small>
              <ErrorMessage name="subtitle" class="text-danger small" />
            </div>
            <div class="col-12">
              <label class="form-label">Tipo di spesa</label>
              <Field name="type_expense_id" as="select" class="form-select">
                <option value="">Seleziona tipo di spesa</option>
                <option v-for="option in typeExpenseOptions" :key="option.id" :value="option.id">
                  {{ typeExpenseLabel(option) }}
                </option>
              </Field>
              <ErrorMessage name="type_expense_id" class="text-danger small" />
              <div v-if="!typeExpenseOptions.length" class="form-text">Nessun tipo di spesa disponibile.</div>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Durata (minuti)</label>
              <Field name="duration" type="number" min="0" class="form-control" />
              <ErrorMessage name="duration" class="text-danger small" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Prezzo</label>
              <Field name="price" type="number" min="0" step="0.01" class="form-control" />
              <ErrorMessage name="price" class="text-danger small" />
            </div>
            <div class="col-12">
              <label class="form-label">Descrizione</label>
              <Field name="description" as="textarea" rows="3" class="form-control" />
              <small class="form-text text-muted d-block">Non obbligatorio</small>
              <ErrorMessage name="description" class="text-danger small" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Visibile nello store</label>
              <Field name="storeVisible" as="select" class="form-select">
                <option :value="true">Si</option>
                <option :value="false">No</option>
              </Field>
              <ErrorMessage name="storeVisible" class="text-danger small" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">non disponibile per?</label>
              <Field name="storeDisabeld" class="form-control" />
              <small class="form-text text-muted d-block">Lascia vuoto se disponibile per tutti</small>
              <ErrorMessage name="storeDisabeld" class="text-danger small" />
            </div>
          </div>

          <div class="d-flex gap-2 mt-4">
            <Btn type="submit" color="dark" icon="save" :loading="isSubmitting || isDeleting" :disabled="isDeleting">
              {{ isCreateMode ? "Crea" : "Salva" }}
            </Btn>
            <Btn color="secondary" icon="sync" :disabled="isSubmitting || isDeleting" @click="loadItem">
              Ricarica
            </Btn>
            <Btn v-if="!isCreateMode" type="button" color="danger" variant="outline" icon="delete" :loading="isDeleting"
              :disabled="isSubmitting || isDeleting" @click="onDeleteTreatment">
              Elimina
            </Btn>
          </div>
        </div>
      </Form>

      <p v-else class="text-muted small mb-0">Trattamento non trovato.</p>
    </div>
  </div>
</template>

<style scoped>
.edit-wrapper {
  max-width: 660px;
}
</style>
