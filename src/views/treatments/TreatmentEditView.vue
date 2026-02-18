<script setup lang="ts">
import { Accordion, Btn, FieldFile, cicKitStore, storage, toast, useChangeHeader, useStoreWatch } from "cic-kit";
import { Form, Field, ErrorMessage } from "vee-validate";
import { toTypedSchema } from "@vee-validate/yup";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import * as yup from "yup";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { treatmentStore } from "../../stores/treatmentStore";
import type { Treatment } from "../../models/Treatment";
import { Auth } from "../../main";
import { typeExpenseStore } from "../../stores/typeExpenseStore";

type TreatmentForm = {
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
  prodottiConsigliatiIds: string;
  ingredienti: string;
  storeVisible: boolean;
  storeDisabeld: string;
};

useChangeHeader("Modifica trattamento", { name: "TreatmentsView" });
useStoreWatch([{ store: typeExpenseStore, getOpts: { forceLocalSet: true } }]);

const route = useRoute();
const router = useRouter();
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle());
const current = ref<Treatment | undefined>(undefined);
const isLoading = ref(false);
const selectedImages = ref<File[]>([]);
const imagePreviewUrls = ref<string[]>([]);
const imageUploadKey = ref(0);
const isUploadingImage = ref(false);

const routeId = computed(() => String(route.params.id ?? "").trim());
const isCreateMode = computed(() => !routeId.value || routeId.value === "new");
const typeExpenseOptions = computed(() =>
  [...typeExpenseStore.itemsActiveArray].sort((a, b) => a.name.localeCompare(b.name, "it")),
);
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
    type_expense_id: yup.string().required("Campo obbligatorio"),
    price: yup.number().typeError("Numero obbligatorio").required("Campo obbligatorio"),
    icon: yup.string().default(""),
    color: yup.string().default(""),
    duration: yup.number().default(0),
    updateBy: yup.string().default(""),
    description: yup.string().default(""),
    imgUrls: yup.string().default(""),
    storeOrder: yup.number().default(0),
    tag: yup.string().default(""),
    imgDescriptionUrls: yup.string().default(""),
    tipiDiPelle: yup.string().default(""),
    prodottiConsigliatiIds: yup.string().default(""),
    ingredienti: yup.string().default(""),
    storeVisible: yup.boolean().default(true),
    storeDisabeld: yup.string().default(""),
  }),
);

const formKey = computed(() => (isCreateMode.value ? "treatment-new" : current.value?.id ?? "treatment-edit"));

const initialValues = computed<TreatmentForm>(() => ({
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
  prodottiConsigliatiIds: current.value?.prodottiConsigliatiIds.join(", ") ?? "",
  ingredienti: current.value?.ingredienti ?? "",
  storeVisible: current.value?.storeVisible ?? true,
  storeDisabeld: current.value?.storeDisabeld ?? "",
}));

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return fallback;
}

function mergeUrls(urls: string[], extraUrls: string[] = []) {
  const set = new Set(urls.filter(Boolean));
  for (const extraUrl of extraUrls) {
    if (extraUrl) set.add(extraUrl);
  }
  return Array.from(set);
}

function sanitizeFileName(name: string) {
  const safe = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return safe || "treatment-image";
}

function clearImagePreview() {
  for (const previewUrl of imagePreviewUrls.value) {
    URL.revokeObjectURL(previewUrl);
  }
  imagePreviewUrls.value = [];
}

function resetSelectedImage() {
  selectedImages.value = [];
  clearImagePreview();
  imageUploadKey.value += 1;
}

function onImageChange(files: File[]) {
  const next = files ?? [];
  selectedImages.value = next;
  clearImagePreview();
  imagePreviewUrls.value = next.map((file) => URL.createObjectURL(file));
}

function onImageClear() {
  resetSelectedImage();
}

function getImageUrls(value: unknown) {
  return splitCsv(String(value ?? ""));
}

function removeImageUrlAt(value: unknown, index: number) {
  const urls = getImageUrls(value);
  if (index < 0 || index >= urls.length) return urls.join(", ");
  urls.splice(index, 1);
  return urls.join(", ");
}

function getImagePreviewSrc(value: unknown) {
  return imagePreviewUrls.value[0] || getImageUrls(value)[0] || "";
}

async function uploadTreatmentImage(file: File, treatmentId: string) {
  const filename = `${Date.now()}-${sanitizeFileName(file.name)}`;
  const path = `public/treatments/${treatmentId}/${filename}`;
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });
  return getDownloadURL(fileRef);
}

async function uploadTreatmentImages(files: File[], treatmentId: string) {
  return Promise.all(files.map((file) => uploadTreatmentImage(file, treatmentId)));
}

async function loadItem() {
  if (isCreateMode.value) {
    current.value = undefined;
    resetSelectedImage();
    return;
  }

  isLoading.value = true;
  try {
    current.value = await treatmentStore.ensureOne(routeId.value);
    if (!current.value) {
      toast.warning("Trattamento non trovato");
    }
    resetSelectedImage();
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
    subtitle: normalizeString(values.subtitle),
    icon: normalizeString(values.icon, ""),
    color: normalizeString(values.color, ""),
    type_expense_id: normalizeString(values.type_expense_id),
    duration: normalizeNumber(values.duration, 0),
    price: normalizeNumber(values.price, 0),
    updateBy: normalizeString(values.updateBy, defaultUpdateBy.value),
    description: normalizeString(values.description, ""),
    imgUrls: normalizeString(values.imgUrls, ""),
    storeOrder: normalizeNumber(values.storeOrder, 0),
    tag: normalizeString(values.tag, ""),
    imgDescriptionUrls: normalizeString(values.imgDescriptionUrls, ""),
    tipiDiPelle: normalizeString(values.tipiDiPelle, ""),
    prodottiConsigliatiIds: normalizeString(values.prodottiConsigliatiIds, ""),
    ingredienti: normalizeString(values.ingredienti, ""),
    storeVisible: normalizeBoolean(values.storeVisible, true),
    storeDisabeld: normalizeString(values.storeDisabeld, ""),
  };

  const payload = {
    title: form.title,
    subtitle: form.subtitle,
    icon: form.icon,
    color: form.color,
    type_expense_id: form.type_expense_id,
    duration: normalizeNumber(form.duration, 0),
    price: normalizeNumber(form.price, 0),
    updateBy: form.updateBy || defaultUpdateBy.value,
    description: form.description,
    imgUrls: splitCsv(form.imgUrls),
    storeOrder: normalizeNumber(form.storeOrder, 0),
    tag: splitCsv(form.tag),
    imgDescriptionUrls: splitCsv(form.imgDescriptionUrls),
    tipiDiPelle: form.tipiDiPelle,
    prodottiConsigliatiIds: splitCsv(form.prodottiConsigliatiIds),
    ingredienti: form.ingredienti,
    storeVisible: form.storeVisible,
    storeDisabeld: form.storeDisabeld,
  };

  try {
    if (isCreateMode.value) {
      const created = await treatmentStore.add(payload);

      if (selectedImages.value.length > 0) {
        isUploadingImage.value = true;
        const uploadedUrls = await uploadTreatmentImages(selectedImages.value, created.id);
        await created.update({
          imgUrls: mergeUrls(payload.imgUrls, uploadedUrls),
          updateBy: payload.updateBy,
        });
      }

      toast.success("Trattamento creato");
      await router.replace({ name: "TreatmentEditView", params: { id: created.id } });
      return;
    }

    if (!current.value) return;

    let finalImgUrls = payload.imgUrls;
    if (selectedImages.value.length > 0) {
      isUploadingImage.value = true;
      const uploadedUrls = await uploadTreatmentImages(selectedImages.value, current.value.id);
      finalImgUrls = mergeUrls(finalImgUrls, uploadedUrls);
    }

    await current.value.update({
      ...payload,
      imgUrls: finalImgUrls,
    });

    toast.success("Trattamento aggiornato");
    await loadItem();
  } catch (error) {
    console.error(error);
    toast.error("Errore salvataggio trattamento");
  } finally {
    isUploadingImage.value = false;
    resetSelectedImage();
  }
}

onMounted(() => {
  loadItem();
});

watch(() => route.params.id, loadItem);

onBeforeUnmount(() => {
  clearImagePreview();
});
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h5 mb-0">{{ isCreateMode ? "Nuovo trattamento" : "Modifica trattamento" }}</h1>
      <Btn v-if="!isCreateMode" color="secondary" icon="visibility" :to="{ name: 'TreatmentView', params: { id: route.params.id } }">
        Apri
      </Btn>
    </div>

    <div v-if="isLoading" class="text-muted small">Caricamento...</div>

    <Form
      v-else-if="current || isCreateMode"
      :key="formKey"
      :validation-schema="schema"
      :initial-values="initialValues"
      @submit="onSubmit"
      v-slot="{ values, isSubmitting, setFieldValue }"
      class="vstack gap-3"
    >
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
          <div class="col-12 col-md-6">
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
            <Field name="price" type="number" class="form-control" />
            <ErrorMessage name="price" class="text-danger small" />
          </div>
          <div class="col-12">
            <label class="form-label">Immagine trattamento</label>
            <FieldFile
              :key="imageUploadKey"
              name="uploadImage"
              accept="image/*"
              :multiple="true"
              :show-list="false"
              :show-errors="false"
              @change="onImageChange"
              @clear="onImageClear"
            >
              <template #dropzone="{ open, clear, dragging, files }">
                <div class="image-dropzone-wrap">
                  <button type="button" class="image-dropzone" :class="{ 'is-dragging': dragging }" @click="open">
                    <div class="image-preview">
                      <img v-if="getImagePreviewSrc(values.imgUrls)" :src="getImagePreviewSrc(values.imgUrls)" alt="Anteprima trattamento" />
                      <span v-else class="material-symbols-outlined">photo_camera</span>
                    </div>
                    <div class="image-copy">
                      <span class="image-title">{{ getImagePreviewSrc(values.imgUrls) ? "Cambia immagini" : "Carica immagini" }}</span>
                      <span class="image-hint">
                        {{ files.length ? `${files.length} file selezionati` : "Vengono salvate in `public/treatments/*`" }}
                      </span>
                    </div>
                  </button>
                  <button v-if="files.length" type="button" class="btn btn-sm btn-outline-secondary" @click="clear">
                    Rimuovi selezione
                  </button>
                </div>
              </template>
            </FieldFile>
            <div v-if="getImageUrls(values.imgUrls).length" class="image-grid mt-3">
              <div v-for="(url, index) in getImageUrls(values.imgUrls)" :key="`${url}-${index}`" class="image-tile">
                <img :src="url" :alt="`Immagine trattamento ${index + 1}`" />
                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger image-remove"
                  @click="setFieldValue('imgUrls', removeImageUrlAt(values.imgUrls, index))"
                >
                  Rimuovi
                </button>
              </div>
            </div>
            <div class="form-text mt-2">Le immagini rimosse vengono applicate al salvataggio.</div>
          </div>
          <div class="col-12">
            <label class="form-label">URL immagini (separati da virgola)</label>
            <Field name="imgUrls" class="form-control" />
            <ErrorMessage name="imgUrls" class="text-danger small" />
          </div>
        </div>

        <Accordion id="otherField" :default-open="false" class="mt-3">
          <template #header>
            <span>Altri campi</span>
          </template>
          <div class="container-fluid p-0">
            <div class="row g-3">
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
                <label class="form-label">Durata (min)</label>
                <Field name="duration" type="number" class="form-control" />
                <ErrorMessage name="duration" class="text-danger small" />
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
              <div class="col-12">
                <label class="form-label">Ingredienti</label>
                <Field name="ingredienti" as="textarea" class="form-control" rows="2" />
              </div>
              <div class="col-12">
                <label class="form-label">Tag (separati da virgola)</label>
                <Field name="tag" class="form-control" />
              </div>
              <div class="col-12">
                <label class="form-label">URL descrizione immagini (separati da virgola)</label>
                <Field name="imgDescriptionUrls" class="form-control" />
              </div>
              <div class="col-12">
                <label class="form-label">ID prodotti consigliati (separati da virgola)</label>
                <Field name="prodottiConsigliatiIds" class="form-control" />
              </div>
            </div>
          </div>
        </Accordion>

        <div class="d-flex gap-2 mt-3">
          <Btn type="submit" color="dark" icon="save" :loading="isSubmitting || isUploadingImage">
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

    <p v-else class="text-muted small mb-0">Trattamento non trovato.</p>
  </div>
</template>

<style scoped lang="scss">
.image-dropzone-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.image-dropzone {
  border: 0;
  background: transparent;
  padding: 0;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
}

.image-preview {
  width: 88px;
  height: 88px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .material-symbols-outlined {
    font-size: 28px;
    color: #334155;
  }
}

.image-dropzone.is-dragging .image-preview {
  box-shadow: 0 0 0 3px rgba(84, 44, 58, 0.2);
}

.image-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.image-title {
  font-weight: 600;
  color: #334155;
}

.image-hint {
  font-size: 0.8rem;
  color: #64748b;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}

.image-tile {
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 10px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8fafc;

  img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 8px;
    background: #e2e8f0;
  }
}

.image-remove {
  width: 100%;
}
</style>
