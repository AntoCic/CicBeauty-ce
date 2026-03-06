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
  useStoreWatch,
} from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { computed, ref } from 'vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { Auth } from '../../main'
import { typeCouponStore } from '../../stores/typeCouponStore'

type TypeCouponForm = {
  name: string
  usage_limit: number | string
  price: number | string
  valid: boolean
  note: string
  meta_json: string
  updateBy: string
}

useStoreWatch([{ store: typeCouponStore, getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } } }])

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const formKey = ref(0)
const isUploading = ref(false)
const deletingIds = ref<Record<string, boolean>>({})
const removingImageIds = ref<Record<string, boolean>>({})
const fileValue = ref<FieldFileValue>([])
const editingTypeCouponId = ref('')

const editingTypeCoupon = computed(() =>
  editingTypeCouponId.value ? typeCouponStore.findItemsById(editingTypeCouponId.value) : undefined,
)
const isEditMode = computed(() => Boolean(editingTypeCoupon.value))

const defaultUpdateBy = computed(() => {
  const email = String(Auth.user?.email ?? '').trim()
  if (email) return email
  const uid = String(Auth.uid ?? '').trim()
  if (uid) return uid
  return 'admin'
})

const schema = toTypedSchema(
  yup.object({
    name: yup.string().required('Campo obbligatorio'),
    usage_limit: yup.number().typeError('Numero non valido').min(0).required('Campo obbligatorio'),
    price: yup.number().typeError('Numero non valido').min(0).required('Campo obbligatorio'),
    valid: yup.boolean().required(),
    note: yup.string().default(''),
    meta_json: yup.string().default('{}'),
    updateBy: yup.string().required('Campo obbligatorio'),
  }),
)

const defaultValues = computed<TypeCouponForm>(() => ({
  name: editingTypeCoupon.value?.name ?? '',
  usage_limit: editingTypeCoupon.value?.usage_limit ?? 0,
  price: editingTypeCoupon.value?.price ?? 0,
  valid: editingTypeCoupon.value?.valid ?? true,
  note: editingTypeCoupon.value?.note ?? '',
  meta_json: JSON.stringify(editingTypeCoupon.value?.meta ?? {}, null, 2),
  updateBy: editingTypeCoupon.value?.updateBy ?? defaultUpdateBy.value,
}))

function normalizeString(value: unknown, fallback = '') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function normalizeNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  const normalized = normalizeString(value).toLowerCase()
  if (normalized === 'true' || normalized === '1') return true
  if (normalized === 'false' || normalized === '0') return false
  return fallback
}

function sanitizeFileName(name: string) {
  const safe = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return safe || 'type-coupon-image'
}

function stripFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0) return fileName
  return fileName.slice(0, dotIndex)
}

function parseMeta(metaRaw: unknown) {
  const normalized = String(metaRaw ?? '').trim()
  if (!normalized) return {} as Record<string, any>

  let parsed: unknown
  try {
    parsed = JSON.parse(normalized)
  } catch (error) {
    throw new Error(`Meta JSON non valido: ${(error as Error).message}`)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Meta JSON deve essere un oggetto')
  }

  return parsed as Record<string, any>
}

function resetFileSelection() {
  fileValue.value = []
}

function goCreateMode() {
  editingTypeCouponId.value = ''
  formKey.value += 1
  resetFileSelection()
}

function goEditMode(typeCouponId: string) {
  const normalized = normalizeString(typeCouponId)
  if (!normalized) return
  editingTypeCouponId.value = normalized
  formKey.value += 1
  resetFileSelection()
}

function imageRemovingKey(typeCouponId: string, index: number) {
  return `${typeCouponId}:${index}`
}

function formatPrice(value: unknown) {
  const price = normalizeNumber(value, 0)
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price)
}

async function uploadTypeCouponImages(files: File[], typeCouponId: string) {
  if (!typeCouponStore.storageFolder) {
    throw new Error('Cartella immagini tipi coupon non disponibile')
  }

  const batchId = Date.now()
  return uploadFilesToUrls(files, async (file, index) => {
    const extension = getFileExtension(file)
    const baseName = sanitizeFileName(stripFileExtension(file.name))
    const filename = extension
      ? `${typeCouponId}/images/${batchId}_${index}_${baseName}.${extension}`
      : `${typeCouponId}/images/${batchId}_${index}_${baseName}`
    const upload = await typeCouponStore.storageFolder!.update(filename, file)
    return upload.url
  })
}

async function onSubmit(values: Record<string, unknown>) {
  const payload = {
    name: normalizeString(values.name),
    usage_limit: normalizeNumber(values.usage_limit, 0),
    price: normalizeNumber(values.price, 0),
    valid: normalizeBoolean(values.valid, true),
    note: normalizeString(values.note),
    meta: parseMeta(values.meta_json),
    updateBy: normalizeString(values.updateBy, defaultUpdateBy.value),
  }

  const selectedFiles = toFileArray(fileValue.value)
  if (selectedFiles.length && !typeCouponStore.storageFolder) {
    toast.error('Cartella immagini tipi coupon non disponibile')
    return
  }

  isUploading.value = true
  try {
    if (editingTypeCoupon.value) {
      let nextImgUrls = [...(editingTypeCoupon.value.imgUrls ?? [])]
      if (selectedFiles.length) {
        const uploadedUrls = await uploadTypeCouponImages(selectedFiles, editingTypeCoupon.value.id)
        nextImgUrls = [...nextImgUrls, ...uploadedUrls]
      }

      await editingTypeCoupon.value.update({
        ...payload,
        imgUrls: nextImgUrls,
      })
      toast.success('Tipo coupon aggiornato')
      goCreateMode()
      return
    }

    const created = await typeCouponStore.add({
      ...payload,
      imgUrls: [],
    })

    if (selectedFiles.length) {
      const uploadedUrls = await uploadTypeCouponImages(selectedFiles, created.id)
      await created.update({
        imgUrls: uploadedUrls,
        updateBy: payload.updateBy,
      })
    }

    toast.success('Tipo coupon creato')
    formKey.value += 1
    resetFileSelection()
  } catch (error) {
    console.error(error)
    toast.error(isEditMode.value ? 'Errore aggiornamento tipo coupon' : 'Errore creazione tipo coupon')
  } finally {
    isUploading.value = false
  }
}

async function removeTypeCoupon(typeCoupon: (typeof typeCouponStore.itemsActiveArray)[number]) {
  if (deletingIds.value[typeCoupon.id]) return
  const confirmDelete = window.confirm(`Eliminare il tipo coupon "${typeCoupon.name}"?`)
  if (!confirmDelete) return

  deletingIds.value = { ...deletingIds.value, [typeCoupon.id]: true }
  try {
    await Promise.allSettled(
      (typeCoupon.imgUrls ?? [])
        .map((url) => String(url ?? '').trim())
        .filter(Boolean)
        .map((url) => typeCouponStore.storageFolder?.removeFromUrl(url)),
    )
    await typeCoupon.delete(typeCouponStore)
    if (editingTypeCouponId.value === typeCoupon.id) {
      goCreateMode()
    }
    toast.success('Tipo coupon eliminato')
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione tipo coupon')
  } finally {
    const nextDeleting = { ...deletingIds.value }
    delete nextDeleting[typeCoupon.id]
    deletingIds.value = nextDeleting
  }
}

async function removeTypeCouponImage(typeCoupon: (typeof typeCouponStore.itemsActiveArray)[number], index: number) {
  const currentUrl = String(typeCoupon.imgUrls?.[index] ?? '').trim()
  if (!currentUrl) return

  const key = imageRemovingKey(typeCoupon.id, index)
  if (removingImageIds.value[key]) return
  removingImageIds.value = { ...removingImageIds.value, [key]: true }

  try {
    await typeCouponStore.storageFolder?.removeFromUrl(currentUrl)
    const nextImgUrls = (typeCoupon.imgUrls ?? []).filter((_, currentIndex) => currentIndex !== index)
    await typeCoupon.update({
      imgUrls: nextImgUrls,
      updateBy: defaultUpdateBy.value,
    })
    toast.success('Immagine tipo coupon rimossa')
  } catch (error) {
    console.error(error)
    toast.error('Errore rimozione immagine tipo coupon')
  } finally {
    const nextRemoving = { ...removingImageIds.value }
    delete nextRemoving[key]
    removingImageIds.value = nextRemoving
  }
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Tipi Coupon" :to="{ name: 'home' }" />

    <Form
      :key="formKey"
      class="card border-0 shadow-sm p-3 my-3"
      :validation-schema="schema"
      :initial-values="defaultValues"
      @submit="onSubmit"
      v-slot="{ isSubmitting }"
    >
      <p class="fw-semibold mb-2">
        {{ isEditMode ? 'Modifica tipo coupon' : 'Nuovo tipo coupon' }}
      </p>

      <div class="row g-3">
        <div class="col-12 col-md-6">
          <label class="form-label">Nome</label>
          <Field name="name" class="form-control" />
          <ErrorMessage name="name" class="text-danger small" />
        </div>
        <div class="col-12 col-md-3">
          <label class="form-label">Uso massimo</label>
          <Field name="usage_limit" type="number" min="0" class="form-control" />
          <ErrorMessage name="usage_limit" class="text-danger small" />
        </div>
        <div class="col-12 col-md-3">
          <label class="form-label">Prezzo</label>
          <Field name="price" type="number" step="0.01" min="0" class="form-control" />
          <ErrorMessage name="price" class="text-danger small" />
        </div>
        <div class="col-12 col-md-4">
          <label class="form-label">Valido</label>
          <Field name="valid" as="select" class="form-select">
            <option :value="true">Si</option>
            <option :value="false">No</option>
          </Field>
          <ErrorMessage name="valid" class="text-danger small" />
        </div>
        <div class="col-12 col-md-8">
          <label class="form-label">Aggiornato da</label>
          <Field name="updateBy" class="form-control" />
          <ErrorMessage name="updateBy" class="text-danger small" />
        </div>
        <div class="col-12">
          <label class="form-label">Note</label>
          <Field name="note" as="textarea" rows="2" class="form-control" />
          <ErrorMessage name="note" class="text-danger small" />
        </div>
        <div class="col-12">
          <label class="form-label">Meta (JSON object)</label>
          <Field name="meta_json" as="textarea" rows="5" class="form-control font-monospace" />
          <ErrorMessage name="meta_json" class="text-danger small" />
        </div>
        <div class="col-12">
          <label class="form-label">Immagini tipo coupon</label>
          <FieldFile
            name="uploadTypeCouponImages"
            v-model="fileValue"
            accept="image/*"
            multiple
            :show-errors="false"
            :disabled="isUploading"
            @clear="resetFileSelection"
          >
            <template #dropzone="{ open, clear, files, disabled, dragging }">
              <div class="dropzone-wrap" :class="{ dragging, disabled }">
                <div class="fw-semibold">
                  {{ dragging ? 'Rilascia qui le immagini' : 'Trascina immagini o clicca per selezionare' }}
                </div>
                <div class="small text-muted mb-2">File selezionati: <strong>{{ files.length }}</strong></div>
                <div class="d-flex gap-2 flex-wrap">
                  <Btn type="button" icon="upload_file" color="dark" :disabled="disabled" @click="open">
                    Scegli file
                  </Btn>
                  <Btn type="button" icon="delete" variant="outline" color="secondary" :disabled="disabled || !files.length" @click="clear">
                    Svuota selezione
                  </Btn>
                </div>
              </div>
            </template>
          </FieldFile>
        </div>
      </div>

      <div class="d-flex gap-2 mt-3 flex-wrap">
        <Btn
          type="submit"
          color="dark"
          :icon="isEditMode ? 'save' : 'add'"
          :loading="isSubmitting || isUploading"
        >
          {{ isEditMode ? 'Salva tipo coupon' : 'Aggiungi tipo coupon' }}
        </Btn>
        <Btn
          v-if="isEditMode"
          type="button"
          color="secondary"
          variant="outline"
          icon="close"
          :disabled="isSubmitting || isUploading"
          @click="goCreateMode"
        >
          Annulla modifica
        </Btn>
      </div>
    </Form>

    <div class="vstack gap-2 mb-3">
      <article v-for="item in typeCouponStore.itemsActiveArray" :key="item.id" class="card border-0 shadow-sm p-3">
        <div class="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
          <div>
            <strong>{{ item.name }}</strong>
            <p class="small text-muted mb-0">
              uso max: {{ item.usage_limit }} | prezzo: {{ formatPrice(item.price) }} | valido: {{ item.valid ? 'si' : 'no' }}
            </p>
          </div>
          <div class="d-flex align-items-center gap-2">
            <small class="text-muted">{{ item.updateBy }}</small>
            <Btn
              type="button"
              icon="edit"
              color="secondary"
              variant="outline"
              @click="goEditMode(item.id)"
            >
              Edit
            </Btn>
            <Btn
              type="button"
              icon="delete"
              color="danger"
              variant="outline"
              :loading="Boolean(deletingIds[item.id])"
              @click="removeTypeCoupon(item)"
            >
              Elimina
            </Btn>
          </div>
        </div>

        <p v-if="item.note" class="small mb-2">{{ item.note }}</p>

        <div v-if="Object.keys(item.meta ?? {}).length" class="mb-2">
          <small class="d-block text-muted mb-1">Meta</small>
          <pre class="meta-preview mb-0">{{ JSON.stringify(item.meta, null, 2) }}</pre>
        </div>

        <div v-if="item.imgUrls?.length" class="saved-image-grid">
          <article v-for="(url, index) in item.imgUrls" :key="`${url}-${index}`" class="saved-image-card">
            <img :src="url" :alt="`Tipo coupon ${index + 1}`" class="saved-image" />
            <button
              type="button"
              class="btn btn-sm btn-outline-danger"
              :disabled="Boolean(removingImageIds[imageRemovingKey(item.id, index)])"
              @click="removeTypeCouponImage(item, index)"
            >
              {{ removingImageIds[imageRemovingKey(item.id, index)] ? 'Rimozione...' : 'Rimuovi foto' }}
            </button>
          </article>
        </div>
      </article>

      <p v-if="!typeCouponStore.itemsActiveArray.length" class="text-muted small mb-0">Nessun tipo coupon.</p>
    </div>
  </div>
</template>

<style scoped>
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
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}

.saved-image-card {
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
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
  border-radius: 6px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #f8fafc;
}

.meta-preview {
  max-height: 180px;
  overflow: auto;
  padding: 0.55rem;
  border-radius: 0.45rem;
  border: 1px solid rgba(15, 23, 42, 0.14);
  background: rgba(15, 23, 42, 0.03);
  font-size: 0.76rem;
}
</style>
