<script setup lang="ts">
import {
  Btn,
  FieldFile,
  cicKitStore,
  getFileExtension,
  toast,
  toFileArray,
  uploadFilesToUrls,
  type FieldFileValue,
  useChangeHeader,
  useStoreWatch,
} from "cic-kit";
import { Form, Field, ErrorMessage } from "vee-validate";
import { toTypedSchema } from "@vee-validate/yup";
import * as yup from "yup";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { Product, ProductData } from "../../models/Product";
import { Auth } from "../../main";
import { productStore } from "../../stores/productStore";
import { typeExpenseStore } from "../../stores/typeExpenseStore";

type ProductForm = {
  title: string;
  subtitle: string;
  type_expense_id: string;
  price: number | string;
  description: string;
  storeVisible: boolean | string;
  storeDisabeld: string;
};

useChangeHeader("Modifica prodotto", { name: "ProductsView" });
useStoreWatch([{ store: typeExpenseStore, getOpts: { forceLocalSet: true } }]);

const route = useRoute();
const router = useRouter();
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle());
const current = ref<Product | undefined>(undefined);
const isLoading = ref(false);
const isUploadingImage = ref(false);
const fileValue = ref<FieldFileValue>([]);
const existingImgUrls = ref<string[]>([]);

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
    price: yup.number().typeError("Numero obbligatorio").required("Campo obbligatorio"),
    description: yup.string().default(""),
    storeVisible: yup.boolean().required("Campo obbligatorio"),
    storeDisabeld: yup.string().default(""),
  }),
);

const formKey = computed(() => (isCreateMode.value ? "product-new" : current.value?.id ?? "product-edit"));

const initialValues = computed<ProductForm>(() => ({
  title: current.value?.title ?? "",
  subtitle: current.value?.subtitle ?? "",
  type_expense_id: current.value?.type_expense_id ?? "",
  price: current.value?.price ?? 0,
  description: current.value?.description ?? "",
  storeVisible: current.value?.storeVisible ?? true,
  storeDisabeld: current.value?.storeDisabeld ?? "",
}));

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

function sanitizeFileName(name: string) {
  const safe = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return safe || "product-image";
}

function stripFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) return fileName;
  return fileName.slice(0, dotIndex);
}

async function uploadProductImages(files: File[], productId: string) {
  if (!productStore.storageFolder) {
    throw new Error("Cartella immagini prodotti non disponibile");
  }

  const batchId = Date.now();
  return uploadFilesToUrls(files, async (file, index) => {
    const extension = getFileExtension(file);
    const baseName = sanitizeFileName(stripFileExtension(file.name));
    const filename = extension
      ? `${productId}/imgs/${batchId}_${index}_${baseName}.${extension}`
      : `${productId}/imgs/${batchId}_${index}_${baseName}`;
    const upload = await productStore.storageFolder!.update(filename, file);
    return upload.url;
  });
}

function buildCreatePayload(form: ProductForm): Omit<ProductData, "id"> {
  return {
    title: form.title,
    subtitle: form.subtitle,
    icon: "",
    color: "#000000",
    type_expense_id: form.type_expense_id,
    price: normalizeNumber(form.price, 0),
    description: form.description,
    imgUrls: [],
    storeOrder: 0,
    tag: [],
    imgDescriptionUrls: [],
    tipiDiPelle: "",
    consigliUso: "",
    ingredienti: "",
    storeVisible: normalizeBoolean(form.storeVisible, true),
    storeDisabeld: normalizeString(form.storeDisabeld, ""),
    trattamentiConsogliatiIds: [],
    updateBy: defaultUpdateBy.value,
  };
}

function resetFileSelection() {
  fileValue.value = [];
}

function removeExistingImage(index: number) {
  existingImgUrls.value = existingImgUrls.value.filter((_, currentIndex) => currentIndex !== index);
}

function clearExistingImages() {
  existingImgUrls.value = [];
}

async function loadItem() {
  if (isCreateMode.value) {
    current.value = undefined;
    existingImgUrls.value = [];
    resetFileSelection();
    return;
  }

  isLoading.value = true;
  try {
    current.value = await productStore.ensureOne(routeId.value);
    if (!current.value) {
      toast.warning("Prodotto non trovato");
    }
    existingImgUrls.value = [...(current.value?.imgUrls ?? [])];
    resetFileSelection();
  } catch (error) {
    console.error(error);
    toast.error("Errore caricamento prodotto");
  } finally {
    isLoading.value = false;
  }
}

async function onSubmit(values: Record<string, unknown>) {
  const form: ProductForm = {
    title: normalizeString(values.title),
    subtitle: normalizeString(values.subtitle, ""),
    type_expense_id: normalizeString(values.type_expense_id),
    price: normalizeNumber(values.price, 0),
    description: normalizeString(values.description, ""),
    storeVisible: normalizeBoolean(values.storeVisible, true),
    storeDisabeld: normalizeString(values.storeDisabeld, ""),
  };


  const selectedFiles = toFileArray(fileValue.value);
  if (selectedFiles.length && !productStore.storageFolder) {
    toast.error("Cartella immagini prodotti non disponibile");
    return;
  }

  try {
    if (isCreateMode.value) {
      const created = await productStore.add(buildCreatePayload(form));
      let uploadedUrls: string[] = [];

      if (selectedFiles.length) {
        isUploadingImage.value = true;
        uploadedUrls = await uploadProductImages(selectedFiles, created.id);
      }

      if (uploadedUrls.length) {
        await created.update({
          imgUrls: uploadedUrls,
          updateBy: defaultUpdateBy.value,
        });
      }

      toast.success("Prodotto creato");
      await router.replace({ name: "ProductEditView", params: { id: created.id } });
      return;
    }

    if (!current.value) return;

    let nextImgUrls = [...existingImgUrls.value];
    if (selectedFiles.length) {
      isUploadingImage.value = true;
      const uploadedUrls = await uploadProductImages(selectedFiles, current.value.id);
      nextImgUrls = [...nextImgUrls, ...uploadedUrls];
    }

    await current.value.update({
      title: form.title,
      subtitle: form.subtitle,
      type_expense_id: form.type_expense_id,
      price: normalizeNumber(form.price, 0),
      description: form.description,
      imgUrls: nextImgUrls,
      storeVisible: normalizeBoolean(form.storeVisible, true),
      storeDisabeld: normalizeString(form.storeDisabeld, ""),
      updateBy: defaultUpdateBy.value,
    });

    toast.success("Prodotto aggiornato");
    await loadItem();
  } catch (error) {
    console.error(error);
    toast.error("Errore salvataggio prodotto");
  } finally {
    isUploadingImage.value = false;
    resetFileSelection();
  }
}

onMounted(() => {
  loadItem();
});
watch(() => route.params.id, loadItem);
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <div class="edit-wrapper mx-auto py-3 py-md-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h1 class="h5 mb-0">{{ isCreateMode ? "Nuovo prodotto" : "Modifica prodotto" }}</h1>
        <Btn v-if="!isCreateMode" color="secondary" icon="visibility"
          :to="{ name: 'ProductView', params: { id: route.params.id } }">
          Apri
        </Btn>
      </div>

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
                  {{ option.name }}
                </option>
              </Field>
              <ErrorMessage name="type_expense_id" class="text-danger small" />
              <div v-if="!typeExpenseOptions.length" class="form-text">Nessun tipo di spesa disponibile.</div>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Prezzo</label>
              <Field name="price" type="number" min="0" step="0.01" class="form-control" />
              <ErrorMessage name="price" class="text-danger small" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Visibile nello store</label>
              <Field name="storeVisible" as="select" class="form-select">
                <option :value="true">Si</option>
                <option :value="false">No</option>
              </Field>
              <ErrorMessage name="storeVisible" class="text-danger small" />
            </div>
            <div class="col-12">
              <label class="form-label">non disponibile per?</label>
              <Field name="storeDisabeld" class="form-control" />
              <small class="form-text text-muted d-block">Lascia vuoto se disponibile per tutti</small>
              <ErrorMessage name="storeDisabeld" class="text-danger small" />
            </div>
            <div class="col-12">
              <label class="form-label">Descrizione</label>
              <Field name="description" as="textarea" rows="3" class="form-control" />
              <small class="form-text text-muted d-block">Non obbligatorio</small>
              <ErrorMessage name="description" class="text-danger small" />
            </div>
            <div class="col-12">
              <label class="form-label">Carica immagini prodotto (opzionale)</label>
              <FieldFile name="uploadImages" v-model="fileValue" accept="image/*" multiple :show-errors="false"
                :disabled="isUploadingImage" @clear="resetFileSelection">
                <template #dropzone="{ open, clear, files, disabled, dragging }">
                  <div class="dropzone-wrap" :class="{ dragging, disabled }">
                    <div class="fw-semibold">
                      {{ dragging ? "Rilascia qui le immagini" : "Trascina immagini o clicca per selezionare" }}
                    </div>
                    <div class="small text-muted mb-2">
                      I nuovi file verranno aggiunti alle immagini già presenti.
                    </div>
                    <div class="d-flex gap-2 flex-wrap">
                      <Btn type="button" icon="upload_file" color="dark" :disabled="disabled" @click="open">
                        Scegli file
                      </Btn>
                      <Btn type="button" icon="delete" variant="outline" color="secondary"
                        :disabled="disabled || !files.length" @click="clear">
                        Svuota selezione
                      </Btn>
                    </div>
                    <div class="small mt-2">File selezionati: <strong>{{ files.length }}</strong></div>
                  </div>
                </template>
              </FieldFile>
              <div class="form-text">Puoi selezionare più immagini insieme.</div>
            </div>
            <div v-if="existingImgUrls.length" class="col-12">
              <label class="form-label">Immagini già salvate</label>
              <div class="saved-image-grid">
                <article v-for="(url, index) in existingImgUrls" :key="`${url}-${index}`" class="saved-image-card">
                  <img :src="url" :alt="`Immagine prodotto ${index + 1}`" class="saved-image" />
                  <button type="button" class="btn btn-sm btn-outline-danger" @click="removeExistingImage(index)">
                    Rimuovi
                  </button>
                </article>
              </div>
              <button type="button" class="btn btn-sm btn-outline-secondary mt-2" @click="clearExistingImages">
                Rimuovi tutte le immagini esistenti
              </button>
            </div>
          </div>

          <div class="d-flex gap-2 mt-4">
            <Btn type="submit" color="dark" icon="save" :loading="isSubmitting || isUploadingImage">
              {{ isCreateMode ? "Crea" : "Salva" }}
            </Btn>
            <Btn color="secondary" icon="sync" @click="loadItem">Ricarica</Btn>
          </div>
        </div>
      </Form>

      <p v-else class="text-muted small mb-0">Prodotto non trovato.</p>
    </div>
  </div>
</template>

<style scoped>
.edit-wrapper {
  max-width: 660px;
}

.dropzone-wrap {
  border: 1px dashed #cbd5e1;
  border-radius: 0.75rem;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.02);
}

.dropzone-wrap.dragging {
  border-color: #30475e;
  background: rgba(48, 71, 94, 0.08);
}

.dropzone-wrap.disabled {
  opacity: 0.65;
}

.saved-image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}

.saved-image-card {
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 10px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8fafc;
}

.saved-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 8px;
  background: #e2e8f0;
}
</style>
