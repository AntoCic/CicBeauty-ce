<script setup lang="ts">
import { Btn, cicKitStore, toast, useChangeHeader, useStoreWatch } from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Treatment, TreatmentData } from '../../models/Treatment'
import { Auth } from '../../main'
import { treatmentStore } from '../../stores/treatmentStore'
import { typeExpenseStore } from '../../stores/typeExpenseStore'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { productStore } from '../../stores/productStore'
import HeaderApp from '../../components/HeaderApp.vue'
import CatalogCard from '../../components/CatalogCard.vue'
import { callMarketingAgent, parseAiError } from '../../services/aiAgents'

type TreatmentForm = {
  title: string
  subtitle: string
  type_expense_id: string
  duration: number | string
  price: number | string
  description: string
  storeVisible: boolean | string
  storeDisabeld: string
}
type SetFieldValueFn = (field: string, value: unknown, shouldValidate?: boolean) => void

useChangeHeader('Modifica trattamento', { name: 'TreatmentCategoriesView' })
useStoreWatch([
  { store: typeExpenseStore, getOpts: { forceLocalSet: true } },
  {
    store: treatmentCategoryStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
  },
  {
    store: productStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
    checkLogin: false,
  },
])

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const current = ref<Treatment | undefined>(undefined)
const isLoading = ref(false)
const isDeleting = ref(false)
const isSyncingRelations = ref(false)
const selectedCategoryIds = ref<string[]>([])
const selectedProductIds = ref<string[]>([])
const hasEditedProductLinks = ref(false)
const isGeneratingSubtitle = ref(false)
const isGeneratingDescription = ref(false)

const routeId = computed(() => String(route.params.id ?? '').trim())
const isCreateMode = computed(() => !routeId.value || routeId.value === 'new')
const headerTo = computed(() => {
  if (isCreateMode.value) {
    return { name: 'TreatmentCategoriesView' }
  }
  return {
    name: 'TreatmentView',
    params: { id: route.params.id },
    query: { categoryId: selectedCategoryIds.value[0] ?? undefined },
  }
})
const typeExpenseOptions = computed(() =>
  [...typeExpenseStore.itemsActiveArray].sort((a, b) => a.name.localeCompare(b.name, 'it')),
)
const categoryOptions = computed(() =>
  [...treatmentCategoryStore.itemsActiveArray].sort((a, b) => a.title.localeCompare(b.title, 'it')),
)
const productOptions = computed(() =>
  [...productStore.itemsActiveArray].sort((a, b) => a.title.localeCompare(b.title, 'it')),
)
const selectedCategoryItems = computed(() =>
  selectedCategoryIds.value
    .map((id) => treatmentCategoryStore.findItemsById(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item)),
)
const selectedProductItems = computed(() =>
  selectedProductIds.value
    .map((id) => productStore.findItemsById(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item)),
)
const defaultUpdateBy = computed(() => String(Auth.uid ?? '').trim())

const schema = toTypedSchema(
  yup.object({
    title: yup.string().required('Campo obbligatorio'),
    subtitle: yup.string().default(''),
    type_expense_id: yup.string().required('Campo obbligatorio'),
    duration: yup.number().typeError('Numero obbligatorio').required('Campo obbligatorio'),
    price: yup.number().typeError('Numero obbligatorio').required('Campo obbligatorio'),
    description: yup.string().default(''),
    storeVisible: yup.boolean().required('Campo obbligatorio'),
    storeDisabeld: yup.string().default(''),
  }),
)

const formKey = computed(() => (isCreateMode.value ? 'treatment-new' : current.value?.id ?? 'treatment-edit'))

const initialValues = computed<TreatmentForm>(() => ({
  title: current.value?.title ?? '',
  subtitle: current.value?.subtitle ?? '',
  type_expense_id: current.value?.type_expense_id ?? '',
  duration: current.value?.duration ?? 0,
  price: current.value?.price ?? 0,
  description: current.value?.description ?? '',
  storeVisible: current.value?.storeVisible ?? true,
  storeDisabeld: current.value?.storeDisabeld ?? '',
}))

function typeExpenseLabel(typeExpense: { emoji?: string; name: string }) {
  const emoji = String(typeExpense.emoji ?? '').trim()
  const name = String(typeExpense.name ?? '').trim()
  return [emoji, name].filter(Boolean).join(' ')
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

function buildCreatePayload(form: TreatmentForm, categoryIds: string[]): Omit<TreatmentData, 'id'> {
  return {
    title: form.title,
    subtitle: form.subtitle,
    icon: '',
    color: '#000000',
    type_expense_id: form.type_expense_id,
    categoryIds,
    duration: normalizeNumber(form.duration, 0),
    price: normalizeNumber(form.price, 0),
    description: form.description,
    imgUrls: [],
    storeOrder: 0,
    tag: [],
    imgDescriptionUrls: [],
    tipiDiPelle: '',
    prodottiConsigliatiIds: [],
    ingredienti: '',
    storeVisible: normalizeBoolean(form.storeVisible, true),
    storeDisabeld: normalizeString(form.storeDisabeld, ''),
    updateBy: defaultUpdateBy.value,
  }
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

function toggleProduct(productId: string) {
  hasEditedProductLinks.value = true
  const normalized = String(productId ?? '').trim()
  if (!normalized) return
  if (selectedProductIds.value.includes(normalized)) {
    selectedProductIds.value = selectedProductIds.value.filter((id) => id !== normalized)
    return
  }
  selectedProductIds.value = [...selectedProductIds.value, normalized]
}

function removeProductSelection(productId: string) {
  hasEditedProductLinks.value = true
  const normalized = String(productId ?? '').trim()
  selectedProductIds.value = selectedProductIds.value.filter((id) => id !== normalized)
}

function isProductSelected(productId: string) {
  return selectedProductIds.value.includes(String(productId ?? '').trim())
}

function goToCategoryManager() {
  router.push({ name: 'TreatmentCategoriesManageView' })
}

function findLinkedProductIds(treatmentId: string) {
  const normalizedTreatmentId = String(treatmentId ?? '').trim()
  if (!normalizedTreatmentId) return []
  return productStore.itemsActiveArray
    .filter((product) => normalizeRelationIds(product.trattamentiConsogliatiIds ?? []).includes(normalizedTreatmentId))
    .map((product) => product.id)
}

async function syncTreatmentProductLinks(treatmentId: string, nextProductIds: string[]) {
  const normalizedTreatmentId = String(treatmentId ?? '').trim()
  if (!normalizedTreatmentId) return

  const nextSet = new Set(normalizeRelationIds(nextProductIds))
  const currentlyLinkedProducts = productStore.itemsActiveArray.filter((product) =>
    normalizeRelationIds(product.trattamentiConsogliatiIds ?? []).includes(normalizedTreatmentId),
  )
  const currentlyLinkedIds = new Set(currentlyLinkedProducts.map((product) => product.id))

  const updates: Promise<unknown>[] = []

  for (const product of currentlyLinkedProducts) {
    if (nextSet.has(product.id)) continue
    const nextTreatmentIds = normalizeRelationIds(product.trattamentiConsogliatiIds ?? []).filter(
      (id) => id !== normalizedTreatmentId,
    )
    updates.push(
      product.update({
        trattamentiConsogliatiIds: nextTreatmentIds,
        updateBy: defaultUpdateBy.value,
      }),
    )
  }

  for (const productId of nextSet) {
    if (currentlyLinkedIds.has(productId)) continue
    const product = productStore.findItemsById(productId)
    if (!product) continue
    const nextTreatmentIds = normalizeRelationIds([
      ...(product.trattamentiConsogliatiIds ?? []),
      normalizedTreatmentId,
    ])
    updates.push(
      product.update({
        trattamentiConsogliatiIds: nextTreatmentIds,
        updateBy: defaultUpdateBy.value,
      }),
    )
  }

  if (updates.length) {
    await Promise.all(updates)
  }
}

async function loadItem() {
  if (isCreateMode.value) {
    current.value = undefined
    selectedCategoryIds.value = []
    selectedProductIds.value = []
    hasEditedProductLinks.value = false
    return
  }

  isLoading.value = true
  try {
    current.value = await treatmentStore.ensureOne(routeId.value)
    if (!current.value) {
      toast.warning('Trattamento non trovato')
    }
    selectedCategoryIds.value = normalizeCategoryIds(current.value?.categoryIds ?? [])
    const linkedProductIds = findLinkedProductIds(current.value?.id ?? '')
    selectedProductIds.value = linkedProductIds.length
      ? linkedProductIds
      : normalizeRelationIds(current.value?.prodottiConsigliatiIds ?? [])
    hasEditedProductLinks.value = false
  } catch (error) {
    console.error(error)
    toast.error('Errore caricamento trattamento')
  } finally {
    isLoading.value = false
  }
}

async function onSubmit(values: Record<string, unknown>) {
  const form: TreatmentForm = {
    title: normalizeString(values.title),
    subtitle: normalizeString(values.subtitle, ''),
    type_expense_id: normalizeString(values.type_expense_id),
    duration: normalizeNumber(values.duration, 0),
    price: normalizeNumber(values.price, 0),
    description: normalizeString(values.description, ''),
    storeVisible: normalizeBoolean(values.storeVisible, true),
    storeDisabeld: normalizeString(values.storeDisabeld, ''),
  }

  const normalizedCategoryIds = normalizeCategoryIds(selectedCategoryIds.value)
  if (!normalizedCategoryIds.length) {
    toast.error('Seleziona almeno una categoria trattamento')
    return
  }
  const normalizedProductIds = normalizeRelationIds(selectedProductIds.value)

  const updatePayload = {
    title: form.title,
    subtitle: form.subtitle,
    type_expense_id: form.type_expense_id,
    categoryIds: normalizedCategoryIds,
    duration: normalizeNumber(form.duration, 0),
    price: normalizeNumber(form.price, 0),
    description: form.description,
    prodottiConsigliatiIds: [],
    storeVisible: normalizeBoolean(form.storeVisible, true),
    storeDisabeld: normalizeString(form.storeDisabeld, ''),
    updateBy: defaultUpdateBy.value,
  }

  isSyncingRelations.value = true
  try {
    if (isCreateMode.value) {
      const created = await treatmentStore.add(buildCreatePayload(form, normalizedCategoryIds))
      await syncTreatmentProductLinks(created.id, normalizedProductIds)
      toast.success('Trattamento creato')
      await router.replace({ name: 'TreatmentsView', params: { categoryId: normalizedCategoryIds[0] } })
      return
    }

    if (!current.value) return

    await current.value.update(updatePayload)
    await syncTreatmentProductLinks(current.value.id, normalizedProductIds)
    toast.success('Trattamento aggiornato')
    await router.replace({ name: 'TreatmentsView', params: { categoryId: normalizedCategoryIds[0] } })
  } catch (error) {
    console.error(error)
    toast.error('Errore salvataggio trattamento')
  } finally {
    isSyncingRelations.value = false
  }
}

async function onDeleteTreatment() {
  if (isCreateMode.value || !current.value || isDeleting.value) return

  const treatment = current.value
  const treatmentLabel = normalizeString(treatment.title, 'questo trattamento')
  const confirmDelete = window.confirm(`Eliminare definitivamente "${treatmentLabel}"?`)
  if (!confirmDelete) return

  isDeleting.value = true
  try {
    await treatment.delete(treatmentStore)
    toast.success('Trattamento eliminato')
    await router.replace({ name: 'TreatmentCategoriesView' })
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione trattamento')
  } finally {
    isDeleting.value = false
  }
}

onMounted(() => {
  loadItem()
})
watch(() => route.params.id, loadItem)
watch(
  () => productStore.itemsActiveArray.length,
  () => {
    if (isCreateMode.value || !current.value || selectedProductIds.value.length || hasEditedProductLinks.value) return
    const linkedProductIds = findLinkedProductIds(current.value.id)
    selectedProductIds.value = linkedProductIds.length
      ? linkedProductIds
      : normalizeRelationIds(current.value.prodottiConsigliatiIds ?? [])
  },
)

function goPageDettaglio() {
  if (isCreateMode.value) return
  router.push({
    name: 'TreatmentView',
    params: { id: route.params.id },
    query: { categoryId: selectedCategoryIds.value[0] ?? undefined },
  })
}

function previewTitle(values: Record<string, unknown>) {
  return normalizeString(values.title, current.value?.title ?? 'Anteprima trattamento')
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

async function generateMarketingCopy(
  values: Record<string, unknown>,
  setFieldValue: SetFieldValueFn,
  target: 'subtitle' | 'description',
) {
  const title = normalizeString(values.title)
  if (!title) {
    toast.warning('Inserisci prima il titolo del trattamento')
    return
  }

  const context = [normalizeString(values.subtitle), normalizeString(values.description)].filter(Boolean).join('\n')

  if (target === 'subtitle') {
    isGeneratingSubtitle.value = true
  } else {
    isGeneratingDescription.value = true
  }

  try {
    const generated = await callMarketingAgent({
      title,
      context: context || undefined,
    })
    const nextValue = target === 'subtitle' ? generated.subtitle : generated.description
    setFieldValue(target, nextValue, true)
    toast.success(target === 'subtitle' ? 'Sottotitolo generato con AI' : 'Descrizione generata con AI')
  } catch (error) {
    console.error(error)
    toast.error(parseAiError(error))
  } finally {
    isGeneratingSubtitle.value = false
    isGeneratingDescription.value = false
  }
}

function generateSubtitle(values: Record<string, unknown>, setFieldValue: SetFieldValueFn) {
  void generateMarketingCopy(values, setFieldValue, 'subtitle')
}

function generateDescription(values: Record<string, unknown>, setFieldValue: SetFieldValueFn) {
  void generateMarketingCopy(values, setFieldValue, 'description')
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp
      :title="isCreateMode ? 'Nuovo trattamento' : 'Modifica trattamento'"
      :to="headerTo"
      :btn-icon="!isCreateMode ? 'visibility' : undefined"
      @btn-click="goPageDettaglio"
    />

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
            :store-disabeld="previewStoreDisabeld(values)"
          />

          <div class="d-flex gap-2 mt-3">
            <Btn
              type="submit"
              color="dark"
              icon="save"
              :loading="isSubmitting || isDeleting || isSyncingRelations"
              :disabled="isDeleting || isSyncingRelations || isSubmitting"
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
              <Btn
                v-if="isCreateMode"
                type="button"
                icon="wand_stars"
                color="dark"
                class="gemini-action-btn mt-2"
                :loading="isGeneratingSubtitle"
                :disabled="isSubmitting || isDeleting || isSyncingRelations || isGeneratingDescription"
                @click="generateSubtitle(values, setFieldValue)"
              >
                Genera sottotitolo con AI
              </Btn>
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
                <label class="form-label mb-0">Categorie trattamento (almeno una)</label>
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
                  {{ option.title }}
                </button>
              </div>
              <div v-else class="form-text">Nessuna categoria disponibile.</div>
              <small v-if="!selectedCategoryIds.length" class="text-danger d-block mt-1">
                Seleziona almeno una categoria.
              </small>

              <div v-if="selectedCategoryItems.length" class="selected-relations mt-2">
                <span v-for="item in selectedCategoryItems" :key="item.id" class="selected-relation">
                  {{ item.title }}
                  <button type="button" aria-label="Rimuovi categoria" @click="removeCategorySelection(item.id)">
                    x
                  </button>
                </span>
              </div>
            </div>

            <div class="col-12 mt-3">
              <label class="form-label mb-1">Prodotti consigliati</label>
              <div v-if="productOptions.length" class="relation-grid">
                <button
                  v-for="option in productOptions"
                  :key="option.id"
                  type="button"
                  class="relation-chip relation-chip--secondary"
                  :class="{ 'relation-chip--active': isProductSelected(option.id) }"
                  @click="toggleProduct(option.id)"
                >
                  {{ option.title }}
                </button>
              </div>
              <div v-else class="form-text">Nessun prodotto disponibile.</div>
              <small class="form-text text-muted d-block mt-1">
                Relazione unica: il link viene salvato sui prodotti e riflesso in modo automatico.
              </small>

              <div v-if="selectedProductItems.length" class="selected-relations mt-2">
                <span v-for="item in selectedProductItems" :key="item.id" class="selected-relation">
                  {{ item.title }}
                  <button type="button" aria-label="Rimuovi prodotto" @click="removeProductSelection(item.id)">
                    x
                  </button>
                </span>
              </div>
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
              <Btn
                v-if="isCreateMode"
                type="button"
                icon="wand_stars"
                color="dark"
                class="gemini-action-btn mt-2"
                :loading="isGeneratingDescription"
                :disabled="isSubmitting || isDeleting || isSyncingRelations || isGeneratingSubtitle"
                @click="generateDescription(values, setFieldValue)"
              >
                Genera descrizione con AI
              </Btn>
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
            <Btn type="submit" color="dark" icon="save" :loading="isSubmitting || isDeleting || isSyncingRelations" :disabled="isDeleting">
              {{ isCreateMode ? 'Crea' : 'Salva' }}
            </Btn>
            <Btn color="secondary" icon="sync" :disabled="isSubmitting || isDeleting || isSyncingRelations" @click="loadItem">
              Ricarica
            </Btn>
            <Btn
              v-if="!isCreateMode"
              type="button"
              color="danger"
              variant="outline"
              icon="delete"
              :loading="isDeleting"
              :disabled="isSubmitting || isDeleting || isSyncingRelations"
              @click="onDeleteTreatment"
            >
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

.preview-shell :deep(.catalog-card) {
  animation: none;
}

.preview-shell :deep(.catalog-card--clickable) {
  cursor: default;
  transform: none;
  box-shadow: 0 8px 20px rgba(45, 23, 31, 0.12);
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

.gemini-action-btn {
  border-color: transparent !important;
  background:
    linear-gradient(rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.95)) padding-box,
    linear-gradient(120deg, #4285f4, #34a853, #fbbc05, #ea4335, #4285f4) border-box;
  background-size: 100% 100%, 240% 240%;
  animation: geminiBorderFlow 6.5s linear infinite;
}

.gemini-action-btn:deep(.material-symbols-outlined) {
  background: linear-gradient(120deg, #4285f4, #34a853, #fbbc05, #ea4335, #4285f4);
  background-size: 240% 240%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: geminiIconFlow 4s linear infinite;
}

@keyframes geminiBorderFlow {
  0% {
    background-position: 0 0, 0% 50%;
  }
  100% {
    background-position: 0 0, 200% 50%;
  }
}

@keyframes geminiIconFlow {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gemini-action-btn,
  .gemini-action-btn:deep(.material-symbols-outlined) {
    animation: none;
  }
}
</style>
