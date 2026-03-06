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
} from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { computed, ref } from 'vue'
import { productCategoryDefaults } from '../../constants/categoryDefaults'
import { productCategoryStore } from '../../stores/productCategoryStore'
import { Auth } from '../../main'

type ProductCategoryForm = {
  title: string
  subtitle: string
  updateBy: string
}

useChangeHeader('Categorie prodotti', { name: 'ProductCategoriesView' })

const canManage = computed(() => Auth.isAdmin || Auth.isSuperAdmin)

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const formKey = ref(0)
const isUploading = ref(false)
const isSeedingDefaults = ref(false)
const deletingIds = ref<Record<string, boolean>>({})
const removingImageIds = ref<Record<string, boolean>>({})
const fileValue = ref<FieldFileValue>([])
const editingCategoryId = ref('')

const editingCategory = computed(() =>
  editingCategoryId.value ? productCategoryStore.findItemsById(editingCategoryId.value) : undefined,
)
const isEditMode = computed(() => Boolean(editingCategory.value))

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

const defaultValues = computed<ProductCategoryForm>(() => ({
  title: editingCategory.value?.title ?? '',
  subtitle: editingCategory.value?.subtitle ?? '',
  updateBy: editingCategory.value?.updateBy ?? defaultUpdateBy.value,
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

function goCreateMode() {
  editingCategoryId.value = ''
  formKey.value += 1
  resetFileSelection()
}

function goEditMode(categoryId: string) {
  const normalized = String(categoryId ?? '').trim()
  if (!normalized) return
  editingCategoryId.value = normalized
  formKey.value += 1
  resetFileSelection()
}

function imageRemovingKey(categoryId: string, index: number) {
  return `${categoryId}:${index}`
}

async function uploadCategoryImages(files: File[], categoryId: string) {
  if (!productCategoryStore.storageFolder) {
    throw new Error('Cartella immagini categorie prodotti non disponibile')
  }

  const batchId = Date.now()
  return uploadFilesToUrls(files, async (file, index) => {
    const extension = getFileExtension(file)
    const baseName = sanitizeFileName(stripFileExtension(file.name))
    const filename = extension
      ? `${categoryId}/categories/${batchId}_${index}_${baseName}.${extension}`
      : `${categoryId}/categories/${batchId}_${index}_${baseName}`
    const upload = await productCategoryStore.storageFolder!.update(filename, file)
    return upload.url
  })
}

async function onSubmit(values: Record<string, unknown>) {
  const payload: ProductCategoryForm = {
    title: normalizeString(values.title),
    subtitle: normalizeString(values.subtitle, ''),
    updateBy: normalizeString(values.updateBy, defaultUpdateBy.value),
  }

  const selectedFiles = toFileArray(fileValue.value)
  if (selectedFiles.length && !productCategoryStore.storageFolder) {
    toast.error('Cartella immagini categorie prodotti non disponibile')
    return
  }

  isUploading.value = true
  try {
    if (editingCategory.value) {
      let nextImgUrls = [...(editingCategory.value.imgUrls ?? [])]
      if (selectedFiles.length) {
        const uploadedUrls = await uploadCategoryImages(selectedFiles, editingCategory.value.id)
        nextImgUrls = [...nextImgUrls, ...uploadedUrls]
      }

      await editingCategory.value.update({
        title: payload.title,
        subtitle: payload.subtitle,
        imgUrls: nextImgUrls,
        updateBy: payload.updateBy,
      })

      toast.success('Categoria prodotti aggiornata')
      goCreateMode()
      return
    }

    const created = await productCategoryStore.add({
      title: payload.title,
      subtitle: payload.subtitle,
      imgUrls: [],
      updateBy: payload.updateBy,
    })

    if (selectedFiles.length) {
      const uploadedUrls = await uploadCategoryImages(selectedFiles, created.id)
      await created.update({
        imgUrls: uploadedUrls,
        updateBy: payload.updateBy,
      })
    }

    toast.success('Categoria prodotti creata')
    formKey.value += 1
    resetFileSelection()
  } catch (error) {
    console.error(error)
    toast.error(isEditMode.value ? 'Errore aggiornamento categoria prodotti' : 'Errore creazione categoria prodotti')
  } finally {
    isUploading.value = false
  }
}

async function addDefaultCategories() {
  if (isSeedingDefaults.value || productCategoryStore.itemsActiveArray.length) return

  isSeedingDefaults.value = true
  try {
    for (const category of productCategoryDefaults) {
      await productCategoryStore.add({
        title: category.title,
        subtitle: category.subtitle,
        imgUrls: [],
        updateBy: defaultUpdateBy.value,
      })
    }
    toast.success('Categorie prodotti base aggiunte')
  } catch (error) {
    console.error(error)
    toast.error("Errore durante l'aggiunta delle categorie prodotti base")
  } finally {
    isSeedingDefaults.value = false
  }
}

async function removeCategory(category: (typeof productCategoryStore.itemsActiveArray)[number]) {
  if (!canManage.value || deletingIds.value[category.id]) return
  const confirmDelete = window.confirm(`Eliminare la categoria "${category.title}"?`)
  if (!confirmDelete) return

  deletingIds.value = { ...deletingIds.value, [category.id]: true }
  try {
    await Promise.allSettled(
      (category.imgUrls ?? [])
        .map((url) => String(url ?? '').trim())
        .filter(Boolean)
        .map((url) => productCategoryStore.storageFolder?.removeFromUrl(url)),
    )
    await category.delete(productCategoryStore)
    if (editingCategoryId.value === category.id) {
      goCreateMode()
    }
    toast.success('Categoria prodotti eliminata')
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione categoria prodotti')
  } finally {
    const nextDeleting = { ...deletingIds.value }
    delete nextDeleting[category.id]
    deletingIds.value = nextDeleting
  }
}

async function removeCategoryImage(category: (typeof productCategoryStore.itemsActiveArray)[number], index: number) {
  const currentUrl = String(category.imgUrls?.[index] ?? '').trim()
  if (!currentUrl) return

  const key = imageRemovingKey(category.id, index)
  if (removingImageIds.value[key]) return
  removingImageIds.value = { ...removingImageIds.value, [key]: true }

  try {
    await productCategoryStore.storageFolder?.removeFromUrl(currentUrl)
    const nextImgUrls = (category.imgUrls ?? []).filter((_, currentIndex) => currentIndex !== index)
    await category.update({
      imgUrls: nextImgUrls,
      updateBy: defaultUpdateBy.value,
    })
    toast.success('Immagine categoria prodotti rimossa')
  } catch (error) {
    console.error(error)
    toast.error('Errore rimozione immagine categoria prodotti')
  } finally {
    const nextRemoving = { ...removingImageIds.value }
    delete nextRemoving[key]
    removingImageIds.value = nextRemoving
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
      <p class="fw-semibold mb-2">
        {{ isEditMode ? 'Modifica categoria prodotti' : 'Nuova categoria prodotti' }}
      </p>

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
                <div class="small text-muted mt-2">
                  {{ isEditMode ? 'I nuovi file verranno aggiunti alle immagini esistenti.' : 'Puoi caricare una o piu immagini.' }}
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
          {{ isEditMode ? 'Salva modifiche categoria prodotti' : 'Aggiungi categoria prodotti' }}
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

    <div v-if="canManage && !productCategoryStore.itemsActiveArray.length" class="mb-3">
      <Btn color="secondary" icon="dataset" :loading="isSeedingDefaults" @click="addDefaultCategories">
        Aggiungi categorie base
      </Btn>
    </div>

    <div v-if="canManage" class="vstack gap-2 mb-3">
      <article v-for="item in productCategoryStore.itemsActiveArray" :key="item.id" class="card border-0 shadow-sm p-3">
        <div class="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
          <div>
            <strong>{{ item.title }}</strong>
            <p v-if="item.subtitle" class="small text-muted mb-0">{{ item.subtitle }}</p>
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
              @click="removeCategory(item)"
            >
              Elimina
            </Btn>
          </div>
        </div>

        <div v-if="item.imgUrls?.length" class="saved-image-grid">
          <article v-for="(url, index) in item.imgUrls" :key="`${url}-${index}`" class="saved-image-card">
            <img :src="url" :alt="`Categoria prodotti ${index + 1}`" class="saved-image" />
            <button
              type="button"
              class="btn btn-sm btn-outline-danger"
              :disabled="Boolean(removingImageIds[imageRemovingKey(item.id, index)])"
              @click="removeCategoryImage(item, index)"
            >
              {{ removingImageIds[imageRemovingKey(item.id, index)] ? 'Rimozione...' : 'Rimuovi foto' }}
            </button>
          </article>
        </div>
      </article>

      <p v-if="!productCategoryStore.itemsActiveArray.length" class="text-muted small mb-0">Nessuna categoria prodotti.</p>
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
</style>
