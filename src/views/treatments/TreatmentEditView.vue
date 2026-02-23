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
import HeaderApp from '../../components/HeaderApp.vue'

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

useChangeHeader('Modifica trattamento', { name: 'TreatmentCategoriesView' })
useStoreWatch([
  { store: typeExpenseStore, getOpts: { forceLocalSet: true } },
  {
    store: treatmentCategoryStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
  },
])

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const current = ref<Treatment | undefined>(undefined)
const isLoading = ref(false)
const isDeleting = ref(false)
const selectedCategoryIds = ref<string[]>([])

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
const selectedCategoryItems = computed(() =>
  selectedCategoryIds.value
    .map((id) => treatmentCategoryStore.findItemsById(id))
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

function goToCategoryManager() {
  router.push({ name: 'TreatmentCategoriesManageView' })
}

async function loadItem() {
  if (isCreateMode.value) {
    current.value = undefined
    selectedCategoryIds.value = []
    return
  }

  isLoading.value = true
  try {
    current.value = await treatmentStore.ensureOne(routeId.value)
    if (!current.value) {
      toast.warning('Trattamento non trovato')
    }
    selectedCategoryIds.value = normalizeCategoryIds(current.value?.categoryIds ?? [])
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

  const updatePayload = {
    title: form.title,
    subtitle: form.subtitle,
    type_expense_id: form.type_expense_id,
    categoryIds: normalizedCategoryIds,
    duration: normalizeNumber(form.duration, 0),
    price: normalizeNumber(form.price, 0),
    description: form.description,
    storeVisible: normalizeBoolean(form.storeVisible, true),
    storeDisabeld: normalizeString(form.storeDisabeld, ''),
    updateBy: defaultUpdateBy.value,
  }

  try {
    if (isCreateMode.value) {
      await treatmentStore.add(buildCreatePayload(form, normalizedCategoryIds))
      toast.success('Trattamento creato')
      await router.replace({ name: 'TreatmentsView', params: { categoryId: normalizedCategoryIds[0] } })
      return
    }

    if (!current.value) return

    await current.value.update(updatePayload)
    toast.success('Trattamento aggiornato')
    await router.replace({ name: 'TreatmentsView', params: { categoryId: normalizedCategoryIds[0] } })
  } catch (error) {
    console.error(error)
    toast.error('Errore salvataggio trattamento')
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

function goPageDettaglio() {
  if (isCreateMode.value) return
  router.push({
    name: 'TreatmentView',
    params: { id: route.params.id },
    query: { categoryId: selectedCategoryIds.value[0] ?? undefined },
  })
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
        v-slot="{ isSubmitting }"
      >
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
              {{ isCreateMode ? 'Crea' : 'Salva' }}
            </Btn>
            <Btn color="secondary" icon="sync" :disabled="isSubmitting || isDeleting" @click="loadItem">
              Ricarica
            </Btn>
            <Btn
              v-if="!isCreateMode"
              type="button"
              color="danger"
              variant="outline"
              icon="delete"
              :loading="isDeleting"
              :disabled="isSubmitting || isDeleting"
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
