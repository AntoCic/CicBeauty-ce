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
} from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { computed, ref } from 'vue'
import { treatmentCategoryDefaults } from '../../constants/categoryDefaults'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { Auth } from '../../main'

type TreatmentCategoryForm = {
  title: string
  subtitle: string
  updateBy: string
}

useChangeHeader('Categorie trattamenti', { name: 'TreatmentCategoriesView' })

const canManage = computed(() => Auth.isAdmin || Auth.isSuperAdmin)
useStoreWatch(
  canManage.value
    ? [{ store: treatmentCategoryStore, getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } } }]
    : [],
)

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const formKey = ref(0)
const isUploading = ref(false)
const isSeedingDefaults = ref(false)
const deletingIds = ref<Record<string, boolean>>({})
const fileValue = ref<FieldFileValue>([])

const defaultUpdateBy = computed(() => {
  const email = String(Auth.user?.email ?? '').trim()
  if (email) return email
  const uid = String(Auth.uid ?? '').trim()
  if (uid) return uid
  return 'admin'
})

const schema = toTypedSchema(
  yup.object({
    title: yup.string().required('Campo obbligatorio'),
    subtitle: yup.string().default(''),
    updateBy: yup.string().required('Campo obbligatorio'),
  }),
)

const defaultValues = computed<TreatmentCategoryForm>(() => ({
  title: '',
  subtitle: '',
  updateBy: defaultUpdateBy.value,
}))

function normalizeString(value: unknown, fallback = '') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function sanitizeFileName(name: string) {
  const safe = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return safe || 'category-image'
}

function stripFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0) return fileName
  return fileName.slice(0, dotIndex)
}

function resetFileSelection() {
  fileValue.value = []
}

async function uploadCategoryImages(files: File[], categoryId: string) {
  if (!treatmentCategoryStore.storageFolder) {
    throw new Error('Cartella immagini categorie trattamenti non disponibile')
  }

  const batchId = Date.now()
  return uploadFilesToUrls(files, async (file, index) => {
    const extension = getFileExtension(file)
    const baseName = sanitizeFileName(stripFileExtension(file.name))
    const filename = extension
      ? `${categoryId}/categories/${batchId}_${index}_${baseName}.${extension}`
      : `${categoryId}/categories/${batchId}_${index}_${baseName}`
    const upload = await treatmentCategoryStore.storageFolder!.update(filename, file)
    return upload.url
  })
}

async function onSubmit(values: Record<string, unknown>) {
  const payload: TreatmentCategoryForm = {
    title: normalizeString(values.title),
    subtitle: normalizeString(values.subtitle, ''),
    updateBy: normalizeString(values.updateBy, defaultUpdateBy.value),
  }

  const selectedFiles = toFileArray(fileValue.value)
  if (selectedFiles.length && !treatmentCategoryStore.storageFolder) {
    toast.error('Cartella immagini categorie trattamenti non disponibile')
    return
  }

  try {
    const created = await treatmentCategoryStore.add({
      title: payload.title,
      subtitle: payload.subtitle,
      imgUrls: [],
      updateBy: payload.updateBy,
    })

    if (selectedFiles.length) {
      isUploading.value = true
      const uploadedUrls = await uploadCategoryImages(selectedFiles, created.id)
      await created.update({
        imgUrls: uploadedUrls,
        updateBy: payload.updateBy,
      })
    }

    toast.success('Categoria trattamenti creata')
    formKey.value += 1
    resetFileSelection()
  } catch (error) {
    console.error(error)
    toast.error('Errore nella creazione della categoria trattamenti')
  } finally {
    isUploading.value = false
  }
}

async function addDefaultCategories() {
  if (isSeedingDefaults.value || treatmentCategoryStore.itemsActiveArray.length) return

  isSeedingDefaults.value = true
  try {
    for (const category of treatmentCategoryDefaults) {
      await treatmentCategoryStore.add({
        title: category.title,
        subtitle: category.subtitle,
        imgUrls: [],
        updateBy: defaultUpdateBy.value,
      })
    }
    toast.success('Categorie trattamenti base aggiunte')
  } catch (error) {
    console.error(error)
    toast.error("Errore durante l'aggiunta delle categorie trattamenti base")
  } finally {
    isSeedingDefaults.value = false
  }
}

async function removeCategory(category: (typeof treatmentCategoryStore.itemsActiveArray)[number]) {
  if (!canManage.value || deletingIds.value[category.id]) return
  const confirmDelete = window.confirm(`Eliminare la categoria "${category.title}"?`)
  if (!confirmDelete) return

  deletingIds.value = { ...deletingIds.value, [category.id]: true }
  try {
    await Promise.allSettled(
      (category.imgUrls ?? [])
        .map((url) => String(url ?? '').trim())
        .filter(Boolean)
        .map((url) => treatmentCategoryStore.storageFolder?.removeFromUrl(url)),
    )
    await category.delete(treatmentCategoryStore)
    toast.success('Categoria trattamenti eliminata')
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione categoria trattamenti')
  } finally {
    const nextDeleting = { ...deletingIds.value }
    delete nextDeleting[category.id]
    deletingIds.value = nextDeleting
  }
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <p v-if="!canManage" class="text-muted small mt-3">
      Questa sezione e riservata ad amministratori e super amministratori.
    </p>

    <Form
      v-if="canManage"
      :key="formKey"
      class="card border-0 shadow-sm p-3 my-3"
      :validation-schema="schema"
      :initial-values="defaultValues"
      @submit="onSubmit"
      v-slot="{ isSubmitting }"
    >
      <div class="row g-3">
        <div class="col-12 col-md-6">
          <label class="form-label">Titolo</label>
          <Field name="title" class="form-control" />
          <ErrorMessage name="title" class="text-danger small" />
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label">Aggiornato da</label>
          <Field name="updateBy" class="form-control" />
          <ErrorMessage name="updateBy" class="text-danger small" />
        </div>
        <div class="col-12">
          <label class="form-label">Sottotitolo</label>
          <Field name="subtitle" class="form-control" />
          <ErrorMessage name="subtitle" class="text-danger small" />
        </div>
        <div class="col-12">
          <label class="form-label">Immagini categoria (una o piu)</label>
          <FieldFile
            name="uploadCategoryImages"
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
      <Btn class="mt-3" type="submit" color="dark" icon="add" :loading="isSubmitting || isUploading">
        Aggiungi categoria trattamenti
      </Btn>
    </Form>

    <div v-if="canManage && !treatmentCategoryStore.itemsActiveArray.length" class="mb-3">
      <Btn color="secondary" icon="dataset" :loading="isSeedingDefaults" @click="addDefaultCategories">
        Aggiungi categorie base
      </Btn>
    </div>

    <div v-if="canManage" class="vstack gap-2 mb-3">
      <article v-for="item in treatmentCategoryStore.itemsActiveArray" :key="item.id" class="card border-0 shadow-sm p-3">
        <div class="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
          <div>
            <strong>{{ item.title }}</strong>
            <p v-if="item.subtitle" class="small text-muted mb-0">{{ item.subtitle }}</p>
          </div>
          <div class="d-flex align-items-center gap-2">
            <small class="text-muted">{{ item.updateBy }}</small>
            <Btn
              type="button"
              icon="delete"
              color="danger"
              variant="outline"
              :loading="Boolean(deletingIds[item.id])"
              @click="removeCategory(item)"
            >
              Elimina
            </Btn>
          </div>
        </div>

        <div v-if="item.imgUrls?.length" class="saved-image-grid">
          <img v-for="(url, index) in item.imgUrls" :key="`${url}-${index}`" :src="url" :alt="`Categoria trattamenti ${index + 1}`" class="saved-image" />
        </div>
      </article>

      <p v-if="!treatmentCategoryStore.itemsActiveArray.length" class="text-muted small mb-0">Nessuna categoria trattamenti.</p>
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

.saved-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #f8fafc;
}
</style>
