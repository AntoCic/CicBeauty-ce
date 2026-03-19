<script setup lang="ts">
import { Btn, cicKitStore, toast } from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { computed, onMounted, ref } from 'vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { Auth } from '../../main'
import { calendarRecurrenceStore } from '../../stores/calendarRecurrenceStore'
import {
  CALENDAR_RECURRENCE_CATEGORIES,
  CALENDAR_RECURRENCE_FREQUENCIES,
  RECURRENCE_LABELS,
  type CalendarRecurrenceCategory,
  type CalendarRecurrenceFrequency,
} from '../../utils/calendarSpecialDays'

type CalendarRecurrenceForm = {
  title: string
  emoji: string
  startsOn: string
  recurrence: CalendarRecurrenceFrequency
  category: CalendarRecurrenceCategory
  active: boolean
  updateBy: string
}

onMounted(() => {
  void calendarRecurrenceStore.get({ orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } })
})

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const formKey = ref(0)
const editingRuleId = ref('')
const deletingIds = ref<Record<string, boolean>>({})

const editingRule = computed(() =>
  editingRuleId.value ? calendarRecurrenceStore.findItemsById(editingRuleId.value) : undefined,
)

const isEditMode = computed(() => Boolean(editingRule.value))

const categoryOptions: Array<{ value: CalendarRecurrenceCategory; label: string }> = [
  { value: 'italian-holiday', label: 'Festivita italiana' },
  { value: 'local-holiday', label: 'Festivita locale/paese' },
  { value: 'general', label: 'Ricorrenza generale' },
]

const frequencyOptions: Array<{ value: CalendarRecurrenceFrequency; label: string }> =
  CALENDAR_RECURRENCE_FREQUENCIES.map((frequency) => ({
    value: frequency,
    label: RECURRENCE_LABELS[frequency],
  }))

const categoryLabelByValue = new Map(categoryOptions.map((option) => [option.value, option.label]))

const defaultUpdateBy = computed(() => {
  const email = String(Auth.user?.email ?? '').trim()
  if (email) return email
  const uid = String(Auth.uid ?? '').trim()
  if (uid) return uid
  return 'admin'
})

const schema = toTypedSchema(
  yup.object({
    title: yup.string().trim().required('Campo obbligatorio'),
    emoji: yup.string().default(''),
    startsOn: yup
      .string()
      .trim()
      .matches(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido (YYYY-MM-DD)')
      .required('Campo obbligatorio'),
    recurrence: yup
      .mixed<CalendarRecurrenceFrequency>()
      .oneOf([...CALENDAR_RECURRENCE_FREQUENCIES], 'Cadenza non valida')
      .required('Campo obbligatorio'),
    category: yup
      .mixed<CalendarRecurrenceCategory>()
      .oneOf([...CALENDAR_RECURRENCE_CATEGORIES], 'Tipo non valido')
      .required('Campo obbligatorio'),
    active: yup.boolean().required(),
    updateBy: yup.string().trim().required('Campo obbligatorio'),
  }),
)

const defaultValues = computed<CalendarRecurrenceForm>(() => ({
  title: String(editingRule.value?.title ?? '').trim(),
  emoji: String(editingRule.value?.emoji ?? '').trim(),
  startsOn: String(editingRule.value?.startsOn ?? ''),
  recurrence: editingRule.value?.recurrence ?? 'yearly',
  category: editingRule.value?.category ?? 'general',
  active: editingRule.value?.active ?? true,
  updateBy: String(editingRule.value?.updateBy ?? defaultUpdateBy.value).trim(),
}))

const recurrenceItems = computed(() => {
  return [...calendarRecurrenceStore.itemsActiveArray].sort((a, b) => {
    const byDate = String(a.startsOn ?? '').localeCompare(String(b.startsOn ?? ''))
    if (byDate !== 0) return byDate
    return String(a.title ?? '').localeCompare(String(b.title ?? ''), 'it')
  })
})

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeDateOnly(value: unknown) {
  return normalizeString(value).slice(0, 10)
}

function normalizeBoolean(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value

  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false

  return fallback
}

function goCreateMode() {
  editingRuleId.value = ''
  formKey.value += 1
}

function goEditMode(ruleId: string) {
  const normalized = normalizeString(ruleId)
  if (!normalized) return
  editingRuleId.value = normalized
  formKey.value += 1
}

async function onSubmit(values: Record<string, unknown>) {
  const payload: CalendarRecurrenceForm = {
    title: normalizeString(values.title),
    emoji: normalizeString(values.emoji),
    startsOn: normalizeDateOnly(values.startsOn),
    recurrence: values.recurrence as CalendarRecurrenceFrequency,
    category: values.category as CalendarRecurrenceCategory,
    active: normalizeBoolean(values.active, editingRule.value?.active ?? true),
    updateBy: normalizeString(values.updateBy) || defaultUpdateBy.value,
  }

  try {
    if (editingRule.value) {
      await editingRule.value.update(payload)
      toast.success('Ricorrenza aggiornata')
      goCreateMode()
      return
    }

    await calendarRecurrenceStore.add(payload)
    toast.success('Ricorrenza creata')
    formKey.value += 1
  } catch (error) {
    console.error(error)
    toast.error(isEditMode.value ? 'Errore aggiornamento ricorrenza' : 'Errore creazione ricorrenza')
  }
}

async function removeRecurrence(rule: (typeof recurrenceItems.value)[number]) {
  if (deletingIds.value[rule.id]) return
  const confirmed = window.confirm(`Eliminare la ricorrenza "${rule.title}"?`)
  if (!confirmed) return

  deletingIds.value = { ...deletingIds.value, [rule.id]: true }
  try {
    await rule.delete(calendarRecurrenceStore)
    if (editingRuleId.value === rule.id) {
      goCreateMode()
    }
    toast.success('Ricorrenza eliminata')
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione ricorrenza')
  } finally {
    const nextDeleting = { ...deletingIds.value }
    delete nextDeleting[rule.id]
    deletingIds.value = nextDeleting
  }
}

function categoryLabel(value: CalendarRecurrenceCategory) {
  return categoryLabelByValue.get(value) ?? value
}

function recurrenceLabel(value: CalendarRecurrenceFrequency) {
  return RECURRENCE_LABELS[value] ?? value
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Ricorrenze calendario" :to="{ name: 'home' }" />

    <Form
      :key="formKey"
      class="card border-0 shadow-sm p-3 my-3"
      :validation-schema="schema"
      :initial-values="defaultValues"
      @submit="onSubmit"
      v-slot="{ isSubmitting }"
    >
      <p class="fw-semibold mb-2">{{ isEditMode ? 'Modifica ricorrenza' : 'Nuova ricorrenza' }}</p>

      <div class="row g-3">
        <div class="col-12 col-md-4">
          <label class="form-label">Tipo</label>
          <Field name="category" as="select" class="form-select">
            <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </Field>
          <ErrorMessage name="category" class="text-danger small" />
        </div>

        <div class="col-12 col-md-4">
          <label class="form-label">Cadenza</label>
          <Field name="recurrence" as="select" class="form-select">
            <option v-for="option in frequencyOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </Field>
          <ErrorMessage name="recurrence" class="text-danger small" />
        </div>

        <div class="col-12 col-md-4">
          <label class="form-label">Data inizio</label>
          <Field name="startsOn" type="date" class="form-control" />
          <ErrorMessage name="startsOn" class="text-danger small" />
        </div>

        <div class="col-12 col-md-8">
          <label class="form-label">Titolo</label>
          <Field name="title" class="form-control" placeholder="Es. Festa patronale" />
          <ErrorMessage name="title" class="text-danger small" />
        </div>

        <div class="col-12 col-md-2">
          <label class="form-label">Emoji</label>
          <Field name="emoji" class="form-control" placeholder="es. *" />
          <ErrorMessage name="emoji" class="text-danger small" />
        </div>

        <div class="col-12 col-md-2">
          <label class="form-label">Attiva</label>
          <Field name="active" as="select" class="form-select">
            <option :value="true">Si</option>
            <option :value="false">No</option>
          </Field>
          <ErrorMessage name="active" class="text-danger small" />
        </div>

        <div class="col-12">
          <label class="form-label">Aggiornato da</label>
          <Field name="updateBy" class="form-control" />
          <ErrorMessage name="updateBy" class="text-danger small" />
        </div>
      </div>

      <div class="d-flex gap-2 mt-3 flex-wrap">
        <Btn
          type="submit"
          color="dark"
          :icon="isEditMode ? 'save' : 'add'"
          :loading="isSubmitting"
        >
          {{ isEditMode ? 'Salva ricorrenza' : 'Aggiungi ricorrenza' }}
        </Btn>
        <Btn
          v-if="isEditMode"
          type="button"
          color="secondary"
          variant="outline"
          icon="close"
          :disabled="isSubmitting"
          @click="goCreateMode"
        >
          Annulla modifica
        </Btn>
      </div>
    </Form>

    <div class="vstack gap-2 mb-3">
      <article v-for="rule in recurrenceItems" :key="rule.id" class="card border-0 shadow-sm p-3">
        <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
          <div class="min-w-0">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <strong class="text-break">{{ rule.emoji }} {{ rule.title }}</strong>
              <span class="badge rounded-pill border text-bg-light">{{ categoryLabel(rule.category) }}</span>
              <span v-if="!rule.active" class="badge rounded-pill text-bg-secondary">Disattiva</span>
            </div>
            <p class="small text-muted mb-0">
              {{ recurrenceLabel(rule.recurrence) }} | inizio: {{ rule.startsOn }}
            </p>
            <p class="small text-muted mb-0">Aggiornato da: {{ rule.updateBy }}</p>
          </div>

          <div class="d-flex gap-2 flex-wrap">
            <Btn type="button" icon="edit" color="secondary" variant="outline" @click="goEditMode(rule.id)">
              Edit
            </Btn>
            <Btn
              type="button"
              icon="delete"
              color="danger"
              variant="outline"
              :loading="Boolean(deletingIds[rule.id])"
              @click="removeRecurrence(rule)"
            >
              Elimina
            </Btn>
          </div>
        </div>
      </article>

      <p v-if="!recurrenceItems.length" class="text-muted small mb-0">Nessuna ricorrenza configurata.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.min-w-0 {
  min-width: 0;
}
</style>
