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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Product, ProductData } from '../../models/Product'
import { Auth } from '../../main'
import { productStore } from '../../stores/productStore'
import { typeExpenseStore } from '../../stores/typeExpenseStore'
import { productCategoryStore } from '../../stores/productCategoryStore'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { treatmentStore } from '../../stores/treatmentStore'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import CatalogCard from '../../components/CatalogCard.vue'
import BtnAi from '../../components/BtnAi.vue'
import { callMetaAIAgent } from '../../call/callMetaAIAgent'
import { parseAiError } from '../../call/_utilityApi'
import { UserPermission } from '../../enums/UserPermission'

type ProductForm = {
  title: string
  subtitle: string
  type_expense_id: string
  price: number | string
  description: string
  metaAI: string
  storeVisible: boolean | string
  storeDisabeld: string
}
type SetFieldValueFn = (field: string, value: unknown, shouldValidate?: boolean) => void

useChangeHeader('Modifica prodotto', { name: 'ProductCategoriesView' })
useStoreWatch([
  { store: typeExpenseStore, getOpts: {  } },
  {
    store: productCategoryStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
  },
  {
    store: treatmentCategoryStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
  },
  {
    store: treatmentStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
    checkLogin: false,
  },
])

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const current = ref<Product | undefined>(undefined)
const isLoading = ref(false)
const isUploadingImage = ref(false)
const isDeleting = ref(false)
const fileValue = ref<FieldFileValue>([])
const existingImgUrls = ref<string[]>([])
const selectedCategoryIds = ref<string[]>([])
const selectedTreatmentIds = ref<string[]>([])
const isGeneratingMetaAI = ref(false)

const routeId = computed(() => String(route.params.id ?? '').trim())
const isCreateMode = computed(() => !routeId.value || routeId.value === 'new')
const headerTo = computed(() => {
  if (isCreateMode.value) {
    return { name: 'ProductCategoriesView' }
  }
  return {
    name: 'ProductView',
    params: { id: route.params.id },
    query: { categoryId: selectedCategoryIds.value[0] ?? undefined },
  }
})
const typeExpenseOptions = computed(() =>
  [...typeExpenseStore.itemsActiveArray].sort((a, b) => a.name.localeCompare(b.name, 'it')),
)
const categoryOptions = computed(() =>
  [...productCategoryStore.itemsActiveArray].sort((a, b) => a.title.localeCompare(b.title, 'it')),
)
const treatmentOptions = computed(() =>
  [...treatmentStore.itemsActiveArray].sort((a, b) => a.title.localeCompare(b.title, 'it')),
)
const treatmentCategoryTitleById = computed(() =>
  new Map(treatmentCategoryStore.itemsActiveArray.map((item) => [item.id, String(item.title ?? '').trim()])),
)
const groupedTreatmentOptions = computed(() => {
  const groups = new Map<
    string,
    {
      id: string
      title: string
      items: (typeof treatmentOptions.value)[number][]
    }
  >()

  for (const option of treatmentOptions.value) {
    const categoryIds = normalizeRelationIds(option.categoryIds ?? [])
    let groupId = 'no-category'
    let groupTitle = 'Senza categoria'

    for (const categoryId of categoryIds) {
      const categoryTitle = String(treatmentCategoryTitleById.value.get(categoryId) ?? '').trim()
      if (!categoryTitle) continue
      groupId = categoryId
      groupTitle = categoryTitle
      break
    }

    const currentGroup = groups.get(groupId)
    if (currentGroup) {
      currentGroup.items.push(option)
      continue
    }

    groups.set(groupId, {
      id: groupId,
      title: groupTitle,
      items: [option],
    })
  }

  return [...groups.values()].sort((a, b) => a.title.localeCompare(b.title, 'it'))
})
const selectedCategoryItems = computed(() =>
  selectedCategoryIds.value
    .map((id) => productCategoryStore.findItemsById(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item)),
)
const selectedTreatmentItems = computed(() =>
  selectedTreatmentIds.value
    .map((id) => treatmentStore.findItemsById(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item)),
)
const previewImgUrls = computed(() => existingImgUrls.value.filter(Boolean).slice(0, 2))
const defaultUpdateBy = computed(() => String(Auth.uid ?? '').trim())
const hasAiPermission = computed(() => Auth?.user?.hasPermission(UserPermission.AI) ?? false)

const schema = toTypedSchema(
  yup.object({
    title: yup.string().required('Campo obbligatorio'),
    subtitle: yup.string().default(''),
    type_expense_id: yup.string().required('Campo obbligatorio'),
    price: yup.number().typeError('Numero obbligatorio').required('Campo obbligatorio'),
    description: yup.string().default(''),
    metaAI: yup.string().default(''),
    storeVisible: yup.boolean().required('Campo obbligatorio'),
    storeDisabeld: yup.string().default(''),
  }),
)

const formKey = computed(() => (isCreateMode.value ? 'product-new' : current.value?.id ?? 'product-edit'))

const initialValues = computed<ProductForm>(() => ({
  title: current.value?.title ?? '',
  subtitle: current.value?.subtitle ?? '',
  type_expense_id: current.value?.type_expense_id ?? '',
  price: current.value?.price ?? 0,
  description: current.value?.description ?? '',
  metaAI: current.value?.metaAI ?? '',
  storeVisible: current.value?.storeVisible ?? true,
  storeDisabeld: current.value?.storeDisabeld ?? '',
}))

function typeExpenseLabel(typeExpense: { emoji?: string; name: string }) {
  const emoji = String(typeExpense.emoji ?? '').trim()
  const name = String(typeExpense.name ?? '').trim()
  return [emoji, name].filter(Boolean).join(' ')
}

function categoryLabel(category: { title: string; emoji?: string }) {
  const emoji = String(category.emoji ?? '').trim()
  const title = String(category.title ?? '').trim()
  return [emoji, title].filter(Boolean).join(' ')
}

function normalizeString(value: unknown, fallback = '') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function normalizeNumber(value: unknown, fallback = 0) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : fallback
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
  if (['true', '1', 'yes', 'si', 'on'].includes(normalized)) return true
  if (['false', '0', 'no', 'off', ''].includes(normalized)) return false
  return fallback
}

function normalizeCategoryIds(ids: string[]) {
  return [...new Set(ids.map((id) => String(id ?? '').trim()).filter(Boolean))]
}

function normalizeRelationIds(ids: string[]) {
  return [...new Set(ids.map((id) => String(id ?? '').trim()).filter(Boolean))]
}

function sanitizeFileName(name: string) {
  const safe = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return safe || 'product-image'
}

function stripFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0) return fileName
  return fileName.slice(0, dotIndex)
}

async function uploadProductImages(files: File[], productId: string) {
  if (!productStore.storageFolder) {
    throw new Error('Cartella immagini prodotti non disponibile')
  }

  const batchId = Date.now()
  return uploadFilesToUrls(files, async (file, index) => {
    const extension = getFileExtension(file)
    const baseName = sanitizeFileName(stripFileExtension(file.name))
    const filename = extension
      ? `${productId}/imgs/${batchId}_${index}_${baseName}.${extension}`
      : `${productId}/imgs/${batchId}_${index}_${baseName}`
    const upload = await productStore.storageFolder!.update(filename, file)
    return upload.url
  })
}

function buildCreatePayload(
  form: ProductForm,
  categoryIds: string[],
  treatmentIds: string[],
): Omit<ProductData, 'id'> {
  return {
    title: form.title,
    subtitle: form.subtitle,
    icon: '',
    color: '#000000',
    type_expense_id: form.type_expense_id,
    categoryIds,
    price: normalizeNumber(form.price, 0),
    description: form.description,
    imgUrls: [],
    storeOrder: 0,
    tag: [],
    imgDescriptionUrls: [],
    tipiDiPelle: '',
    consigliUso: '',
    ingredienti: '',
    metaAI: normalizeString(form.metaAI, ''),
    storeVisible: normalizeBoolean(form.storeVisible, true),
    storeDisabeld: normalizeString(form.storeDisabeld, ''),
    trattamentiConsogliatiIds: treatmentIds,
    updateBy: defaultUpdateBy.value,
  }
}

function resetFileSelection() {
  fileValue.value = []
}

function toggleCategory(categoryId: string) {
  const normalized = String(categoryId ?? '').trim()
  if (!normalized) return
  if (selectedCategoryIds.value.includes(normalized)) {
    selectedCategoryIds.value = selectedCategoryIds.value.filter((id) => id !== normalized)
    return
  }
  selectedCategoryIds.value = [...selectedCategoryIds.value, normalized]
}

function removeCategorySelection(categoryId: string) {
  const normalized = String(categoryId ?? '').trim()
  selectedCategoryIds.value = selectedCategoryIds.value.filter((id) => id !== normalized)
}

function isCategorySelected(categoryId: string) {
  return selectedCategoryIds.value.includes(String(categoryId ?? '').trim())
}

function toggleTreatment(treatmentId: string) {
  const normalized = String(treatmentId ?? '').trim()
  if (!normalized) return
  if (selectedTreatmentIds.value.includes(normalized)) {
    selectedTreatmentIds.value = selectedTreatmentIds.value.filter((id) => id !== normalized)
    return
  }
  selectedTreatmentIds.value = [...selectedTreatmentIds.value, normalized]
}

function removeTreatmentSelection(treatmentId: string) {
  const normalized = String(treatmentId ?? '').trim()
  selectedTreatmentIds.value = selectedTreatmentIds.value.filter((id) => id !== normalized)
}

function isTreatmentSelected(treatmentId: string) {
  return selectedTreatmentIds.value.includes(String(treatmentId ?? '').trim())
}

function goToCategoryManager() {
  router.push({ name: 'ProductCategoriesManageView' })
}

async function removeExistingImage(index: number) {
  existingImgUrls.value = existingImgUrls.value.filter((url, currentIndex) => {
    const keep = currentIndex !== index
    if (!keep) {
      productStore.storageFolder?.removeFromUrl(url)
    }
    return keep
  })

  if (!current.value) return
  await current.value.update({
    imgUrls: existingImgUrls.value,
    updateBy: defaultUpdateBy.value,
  })

  toast.success('Img prodotto aggiornate')
}

async function loadItem() {
  if (isCreateMode.value) {
    current.value = undefined
    existingImgUrls.value = []
    selectedCategoryIds.value = []
    selectedTreatmentIds.value = []
    resetFileSelection()
    return
  }

  isLoading.value = true
  try {
    current.value = await productStore.ensureOne(routeId.value)
    if (!current.value) {
      toast.warning('Prodotto non trovato')
    }
    existingImgUrls.value = [...(current.value?.imgUrls ?? [])]
    selectedCategoryIds.value = normalizeCategoryIds(current.value?.categoryIds ?? [])
    selectedTreatmentIds.value = normalizeRelationIds(current.value?.trattamentiConsogliatiIds ?? [])
    resetFileSelection()
  } catch (error) {
    console.error(error)
    toast.error('Errore caricamento prodotto')
  } finally {
    isLoading.value = false
  }
}

async function onSubmit(values: Record<string, unknown>) {
  const form: ProductForm = {
    title: normalizeString(values.title),
    subtitle: normalizeString(values.subtitle, ''),
    type_expense_id: normalizeString(values.type_expense_id),
    price: normalizeNumber(values.price, 0),
    description: normalizeString(values.description, ''),
    metaAI: normalizeString(values.metaAI, ''),
    storeVisible: normalizeBoolean(values.storeVisible, true),
    storeDisabeld: normalizeString(values.storeDisabeld, ''),
  }

  const normalizedCategoryIds = normalizeCategoryIds(selectedCategoryIds.value)
  if (!normalizedCategoryIds.length) {
    toast.error('Seleziona almeno una categoria prodotto')
    return
  }
  const normalizedTreatmentIds = normalizeRelationIds(selectedTreatmentIds.value)

  const selectedFiles = toFileArray(fileValue.value)
  if (selectedFiles.length && !productStore.storageFolder) {
    toast.error('Cartella immagini prodotti non disponibile')
    return
  }

  try {
    if (isCreateMode.value) {
      const created = await productStore.add(buildCreatePayload(form, normalizedCategoryIds, normalizedTreatmentIds))
      let uploadedUrls: string[] = []

      if (selectedFiles.length) {
        isUploadingImage.value = true
        uploadedUrls = await uploadProductImages(selectedFiles, created.id)
      }

      if (uploadedUrls.length) {
        await created.update({
          imgUrls: uploadedUrls,
          updateBy: defaultUpdateBy.value,
        })
      }

      toast.success('Prodotto creato')
      await router.replace({ name: 'ProductsView', params: { categoryId: normalizedCategoryIds[0] } })
      return
    }

    if (!current.value) return

    let nextImgUrls = [...existingImgUrls.value]
    if (selectedFiles.length) {
      isUploadingImage.value = true
      const uploadedUrls = await uploadProductImages(selectedFiles, current.value.id)
      nextImgUrls = [...nextImgUrls, ...uploadedUrls]
    }

    await current.value.update({
      title: form.title,
      subtitle: form.subtitle,
      type_expense_id: form.type_expense_id,
      categoryIds: normalizedCategoryIds,
      price: normalizeNumber(form.price, 0),
      description: form.description,
      metaAI: form.metaAI,
      imgUrls: nextImgUrls,
      storeVisible: normalizeBoolean(form.storeVisible, true),
      storeDisabeld: normalizeString(form.storeDisabeld, ''),
      trattamentiConsogliatiIds: normalizedTreatmentIds,
      updateBy: defaultUpdateBy.value,
    })

    toast.success('Prodotto aggiornato')
    await router.replace({ name: 'ProductsView', params: { categoryId: normalizedCategoryIds[0] } })
  } catch (error) {
    console.error(error)
    toast.error('Errore salvataggio prodotto')
  } finally {
    isUploadingImage.value = false
    resetFileSelection()
  }
}

function collectProductImageUrls(product: { imgUrls?: string[]; imgDescriptionUrls?: string[] }) {
  const currentImgUrls = Array.isArray(product.imgUrls) ? product.imgUrls : []
  const imageUrls = existingImgUrls.value.length ? existingImgUrls.value : currentImgUrls
  return [...imageUrls, ...(product.imgDescriptionUrls ?? [])]
}

async function onDeleteProduct() {
  if (isCreateMode.value || !current.value || isDeleting.value) return

  const product = current.value
  const productLabel = normalizeString(product.title, 'questo prodotto')
  const confirmDelete = window.confirm(
    `Eliminare definitivamente "${productLabel}"? Verranno eliminate anche le immagini collegate.`,
  )
  if (!confirmDelete) return

  isDeleting.value = true
  try {
    await Promise.allSettled(
      collectProductImageUrls(product)
        .map((url) => String(url ?? '').trim())
        .filter(Boolean)
        .map((url) => productStore.storageFolder?.removeFromUrl(url)),
    )
    await product.delete(productStore)
    toast.success('Prodotto eliminato')
    await router.replace({ name: 'ProductCategoriesView' })
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione prodotto')
  } finally {
    isDeleting.value = false
  }
}

function goPageDettaglio() {
  if (isCreateMode.value) return
  router.push({
    name: 'ProductView',
    params: { id: route.params.id },
    query: { categoryId: selectedCategoryIds.value[0] ?? undefined },
  })
}

function previewTitle(values: Record<string, unknown>) {
  return normalizeString(values.title, current.value?.title ?? 'Anteprima prodotto')
}

function previewSubtitle(values: Record<string, unknown>) {
  return normalizeString(values.subtitle, current.value?.subtitle ?? '')
}

function previewPrice(values: Record<string, unknown>) {
  return normalizeNumber(values.price, current.value?.price ?? 0)
}

function previewStoreDisabeld(values: Record<string, unknown>) {
  return normalizeString(values.storeDisabeld, current.value?.storeDisabeld ?? '')
}

function buildMetaAISource(values: Record<string, unknown>) {
  return {
    titolo: normalizeString(values.title, current.value?.title ?? ''),
    sottotitolo: normalizeString(values.subtitle, current.value?.subtitle ?? ''),
    descrizione: normalizeString(values.description, current.value?.description ?? ''),
    metaAIAttuale: normalizeString(values.metaAI, current.value?.metaAI ?? ''),
    prezzo: normalizeNumber(values.price, current.value?.price ?? 0),
    visibileNelloStore: normalizeBoolean(values.storeVisible, current.value?.storeVisible ?? true),
    nonDisponibilePer: normalizeString(values.storeDisabeld, current.value?.storeDisabeld ?? ''),
    categorie: selectedCategoryItems.value.map((item) => item.title),
    trattamentiConsigliati: selectedTreatmentItems.value.map((item) => ({
      id: item.id,
      titolo: item.title,
      sottotitolo: item.subtitle ?? '',
      metaAI: item.metaAI ?? '',
    })),
    tipiDiPelle: normalizeString(current.value?.tipiDiPelle ?? ''),
    consigliUso: normalizeString(current.value?.consigliUso ?? ''),
    ingredienti: normalizeString(current.value?.ingredienti ?? ''),
    tag: [...(current.value?.tag ?? [])],
  }
}

async function generateMetaAI(values: Record<string, unknown>, setFieldValue: SetFieldValueFn) {
  if (!hasAiPermission.value) {
    toast.error('Permesso AI richiesto')
    return
  }

  const title = normalizeString(values.title, current.value?.title ?? '')
  if (!title) {
    window.alert('Inserisci un titolo prima di usare AI.')
    return
  }

  isGeneratingMetaAI.value = true
  try {
    const response = await callMetaAIAgent({
      entityType: 'product',
      source: buildMetaAISource(values),
      maxWords: 180,
    })
    setFieldValue('metaAI', response.metaAI, true)
    toast.success('metaAI prodotto generato')
  } catch (error) {
    console.error(error)
    toast.error(parseAiError(error))
  } finally {
    isGeneratingMetaAI.value = false
  }
}

onMounted(() => {
  loadItem()
})
watch(() => route.params.id, loadItem)
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp
      :title="isCreateMode ? 'Nuovo prodotto' : 'Modifica prodotto'"
      :to="headerTo"
    >
      <Btn
        v-if="!isCreateMode"
        icon="visibility"
        variant="ghost"
        @click="goPageDettaglio"
      />
    </HeaderApp>

    <div class="edit-wrapper mx-auto py-3 py-md-4">
      <div v-if="isLoading" class="text-muted small">Caricamento...</div>

      <Form
        v-else-if="current || isCreateMode"
        :key="formKey"
        :validation-schema="schema"
        :initial-values="initialValues"
        @submit="onSubmit"
        v-slot="{ isSubmitting, values, setFieldValue }"
      >
        <div class="card border-0 shadow-sm p-2 p-md-3 mb-3 preview-shell">
          <CatalogCard
            :title="previewTitle(values)"
            :subtitle="previewSubtitle(values)"
            :price="previewPrice(values)"
            :img-urls="previewImgUrls"
            :store-disabeld="previewStoreDisabeld(values)"
          />

          <div class="d-flex gap-2 mt-3">
            <Btn
              type="submit"
              color="dark"
              icon="save"
              :loading="isSubmitting || isUploadingImage || isDeleting"
              :disabled="isDeleting || isUploadingImage || isSubmitting"
            >
              {{ isCreateMode ? 'Crea' : 'Salva' }}
            </Btn>
          </div>
        </div>

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

            <div class="col-12">
              <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-1">
                <label class="form-label mb-0">Categorie prodotto (almeno una)</label>
                <Btn type="button" color="secondary" variant="outline" icon="edit_note" @click="goToCategoryManager">
                  Gestisci categorie
                </Btn>
              </div>
              <div v-if="categoryOptions.length" class="relation-grid">
                <button
                  v-for="option in categoryOptions"
                  :key="option.id"
                  type="button"
                  class="relation-chip"
                  :class="{ 'relation-chip--active': isCategorySelected(option.id) }"
                  @click="toggleCategory(option.id)"
                >
                  {{ categoryLabel(option) }}
                </button>
              </div>
              <div v-else class="form-text">Nessuna categoria disponibile.</div>
              <small v-if="!selectedCategoryIds.length" class="text-danger d-block mt-1">
                Seleziona almeno una categoria.
              </small>

              <div v-if="selectedCategoryItems.length" class="selected-relations mt-2">
                <span v-for="item in selectedCategoryItems" :key="item.id" class="selected-relation">
                  {{ categoryLabel(item) }}
                  <button type="button" aria-label="Rimuovi categoria" @click="removeCategorySelection(item.id)">
                    x
                  </button>
                </span>
              </div>
            </div>

            <div class="col-12">
              <label class="form-label mb-1">Trattamenti consigliati</label>
              <div v-if="groupedTreatmentOptions.length">
                <div v-for="(group, index) in groupedTreatmentOptions" :key="group.id" :class="{ 'mt-3': index > 0 }">
                  <p class="small text-muted fw-semibold mb-2">{{ group.title }}</p>
                  <div class="relation-grid">
                    <button
                      v-for="option in group.items"
                      :key="option.id"
                      type="button"
                      class="relation-chip relation-chip--secondary"
                      :class="{ 'relation-chip--active': isTreatmentSelected(option.id) }"
                      @click="toggleTreatment(option.id)"
                    >
                      {{ option.title }}
                    </button>
                  </div>
                </div>
              </div>
              <div v-else class="form-text">Nessun trattamento disponibile.</div>
              <small class="form-text text-muted d-block mt-1">
                Relazione unica: questi collegamenti saranno visibili anche nella scheda trattamento.
              </small>

              <div v-if="selectedTreatmentItems.length" class="selected-relations mt-2">
                <span v-for="item in selectedTreatmentItems" :key="item.id" class="selected-relation">
                  {{ item.title }}
                  <button type="button" aria-label="Rimuovi trattamento" @click="removeTreatmentSelection(item.id)">
                    x
                  </button>
                </span>
              </div>
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

            <div v-if="hasAiPermission" class="col-10">
              <label class="form-label">metaAI</label>
              <Field name="metaAI" as="textarea" rows="5" class="form-control" />
              <small class="form-text text-muted d-block">
                Testo pulito usato dagli agenti AI per trovare i match migliori.
              </small>
              <ErrorMessage name="metaAI" class="text-danger small" />
            </div>

            <div v-if="hasAiPermission" class="col-2 pt-4">
              <BtnAi
                type="button"
                class="mt-2"
                :loading="isGeneratingMetaAI"
                :disabled="isSubmitting || isUploadingImage || isDeleting"
                @click="generateMetaAI(values, setFieldValue)"
              />
            </div>

            <div class="col-12">
              <label class="form-label">Carica immagini prodotto (opzionale)</label>
              <FieldFile
                name="uploadImages"
                v-model="fileValue"
                accept="image/*"
                multiple
                :show-errors="false"
                :disabled="isUploadingImage"
                @clear="resetFileSelection"
              >
                <template #dropzone="{ open, clear, files, disabled, dragging }">
                  <div class="dropzone-wrap" :class="{ dragging, disabled }">
                    <div class="fw-semibold">
                      {{ dragging ? 'Rilascia qui le immagini' : 'Trascina immagini o clicca per selezionare' }}
                    </div>
                    <div class="small text-muted mb-2">I nuovi file verranno aggiunti alle immagini gia presenti.</div>
                    <div class="d-flex gap-2 flex-wrap">
                      <Btn type="button" icon="upload_file" color="dark" :disabled="disabled" @click="open">
                        Scegli file
                      </Btn>
                      <Btn type="button" icon="delete" variant="outline" color="secondary" :disabled="disabled || !files.length" @click="clear">
                        Svuota selezione
                      </Btn>
                    </div>
                    <div class="small mt-2">File selezionati: <strong>{{ files.length }}</strong></div>
                  </div>
                </template>
              </FieldFile>
              <div class="form-text">Puoi selezionare piu immagini insieme.</div>
            </div>

            <div v-if="existingImgUrls.length" class="col-12">
              <label class="form-label">Immagini gia salvate</label>
              <div class="saved-image-grid">
                <article v-for="(url, index) in existingImgUrls" :key="`${url}-${index}`" class="saved-image-card">
                  <img :src="url" :alt="`Immagine prodotto ${index + 1}`" class="saved-image" />
                  <button type="button" class="btn btn-sm btn-outline-danger" @click="removeExistingImage(index)">
                    Rimuovi
                  </button>
                </article>
              </div>
            </div>
          </div>

          <div class="d-flex gap-2 mt-4">
            <Btn type="submit" color="dark" icon="save" :loading="isSubmitting || isUploadingImage || isDeleting" :disabled="isDeleting">
              {{ isCreateMode ? 'Crea' : 'Salva' }}
            </Btn>
            <Btn color="secondary" icon="sync" :disabled="isSubmitting || isUploadingImage || isDeleting" @click="loadItem">
              Ricarica
            </Btn>
            <Btn
              v-if="!isCreateMode"
              type="button"
              color="danger"
              variant="outline"
              icon="delete"
              :loading="isDeleting"
              :disabled="isSubmitting || isUploadingImage || isDeleting"
              @click="onDeleteProduct"
            >
              Elimina
            </Btn>
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

.preview-shell :deep(.catalog-card) {
  animation: none;
}

.preview-shell :deep(.catalog-card--clickable) {
  cursor: default;
  transform: none;
  box-shadow: 0 8px 20px rgba(45, 23, 31, 0.12);
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

.relation-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.relation-chip {
  border: 1px solid rgba(84, 44, 58, 0.24);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.7);
  padding: 0.34rem 0.6rem;
  font-size: 0.8rem;
  color: #4b2935;
  transition: all 0.18s ease;
}

.relation-chip:hover {
  border-color: rgba(84, 44, 58, 0.45);
}

.relation-chip--active {
  background: rgba(232, 179, 190, 0.42);
  border-color: rgba(84, 44, 58, 0.68);
  color: #3d232c;
  font-weight: 600;
}

.relation-chip--secondary.relation-chip--active {
  background: rgba(214, 236, 255, 0.62);
  border-color: rgba(34, 78, 112, 0.5);
  color: #23445f;
}

.selected-relations {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.selected-relation {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(84, 44, 58, 0.26);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.82);
  padding: 2px 8px;
  font-size: 0.78rem;
}

.selected-relation button {
  border: 0;
  background: transparent;
  color: #7d1d1d;
  font-weight: 700;
  line-height: 1;
}
</style>

