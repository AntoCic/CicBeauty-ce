<script setup lang="ts">
import { Accordion, Btn, FieldTiptap, cicKitStore, toast } from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { Timestamp } from 'firebase/firestore'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { callAvailabilityAgent } from '../../call/callAvailabilityAgent'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { useAppointmentWatchManager } from '../../composables/useAppointmentWatchManager'
import { Auth } from '../../main'
import type { Appointment } from '../../models/Appointment'
import { appConfigStore } from '../../stores/appConfigStore'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { couponStore } from '../../stores/couponStore'
import { publicUserStore } from '../../stores/publicUser'
import { treatmentStore } from '../../stores/treatmentStore'
import { computeAppointmentDurationMinutes, fromDateTimeLocalValue, toDateTimeLocalValue } from '../../utils/calendar'
import { asDate } from '../../utils/date'
import { hasAiAndOperatorAccess } from '../../utils/permissions'
import ClientPersonCard from '../clients/components/ClientPersonCard.vue'
import AppointmentDetailsCard from './components/AppointmentDetailsCard.vue'
import AppointmentOperatorCard from './components/AppointmentOperatorCard.vue'

const EMPTY_NOTE_HTML = '<p></p>'
const PERSONAL_DEFAULT_NOTE = 'personale'
const FIX_DURATION_LIMIT_MINUTES = 60
const FIX_DURATION_STEP_MINUTES = 5

type AppointmentForm = {
  date_time: string
  client_id: string
  notes: string
  discount: number | string
  extra: number | string
  fix_duration: number | string
  isPersonal: boolean
  coupon_id: string
}

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const canUseAvailabilityAi = computed(() => hasAiAndOperatorAccess())

const current = ref<Appointment | undefined>(undefined)
const isLoading = ref(false)
const isDeleting = ref(false)
const isEditMode = ref(false)
const selectedTreatmentIds = ref<string[]>([])
const selectedOperatorIds = ref<string[]>([])
const aiSuggestions = ref<Array<{ start: string; end: string; reason: string }>>([])
const aiClientContext = ref<{ previousAppointmentAt?: string; nextAppointmentAt?: string; totalAppointments: number } | undefined>()
const isAiLoading = ref(false)
const clientSearch = ref('')
const treatmentSearch = ref('')

const routeId = computed(() => String(route.params.id ?? '').trim())
const isCreateMode = computed(() => !routeId.value || routeId.value === 'new')
const EDIT_WATCH_SUSPEND_REASON = 'appointment-edit-view'
const { suspendAppointmentWatch, releaseAppointmentWatch } = useAppointmentWatchManager()

suspendAppointmentWatch(EDIT_WATCH_SUSPEND_REASON)
onBeforeUnmount(() => {
  releaseAppointmentWatch(EDIT_WATCH_SUSPEND_REASON)
})

const formKey = computed(() => (isCreateMode.value ? 'appointment-new' : current.value?.id ?? 'appointment-edit'))
const schema = toTypedSchema(
  yup.object({
    date_time: yup.string().required('Campo obbligatorio'),
    client_id: yup
      .string()
      .default('')
      .when('isPersonal', {
        is: false,
        then: (value) => value.required('Cliente obbligatorio'),
        otherwise: (value) => value.default(''),
      }),
    notes: yup.string().default(EMPTY_NOTE_HTML),
    discount: yup.number().typeError('Numero non valido').default(0),
    extra: yup.number().typeError('Numero non valido').default(0),
    fix_duration: yup.number().typeError('Numero non valido').min(-FIX_DURATION_LIMIT_MINUTES).max(FIX_DURATION_LIMIT_MINUTES).default(0),
    isPersonal: yup.boolean().required(),
    coupon_id: yup.string().default(''),
  }),
)

const initialValues = computed<AppointmentForm>(() => {
  const queryDateTime = String(route.query.dateTime ?? '').trim()
  const queryDate = String(route.query.date ?? '').trim()
  const initialDateTime =
    toDateTimeLocalValue(asDate(current.value?.date_time)) ||
    (queryDateTime ? toDateTimeLocalValue(asDate(queryDateTime)) : '') ||
    (queryDate ? `${queryDate}T09:00` : '') ||
    toDateTimeLocalValue(new Date()) ||
    ''

  return {
    date_time: initialDateTime,
    client_id: String(current.value?.client_id ?? current.value?.user_id ?? ''),
    notes: normalizeNoteForEditor(current.value?.notes),
    discount: Number(current.value?.discount ?? 0),
    extra: Number(current.value?.extra ?? 0),
    fix_duration: clampFixDuration(current.value?.fix_duration ?? 0),
    isPersonal: Boolean(current.value?.isPersonal),
    coupon_id: String(current.value?.coupon_id ?? ''),
  }
})

const treatmentsById = computed(() => new Map(treatmentStore.itemsActiveArray.map((item) => [item.id, item])))
const clientsById = computed(() => new Map(clientStore.itemsActiveArray.map((item) => [item.id, item])))
const operatorUsers = computed(() => publicUserStore.itemsActiveArray.filter((item) => Boolean(item.operatore)))
const operatorsById = computed(() => new Map(operatorUsers.value.map((item) => [item.id, item])))
const filteredClients = computed(() => {
  const search = normalizeString(clientSearch.value).toLocaleLowerCase()
  if (!search) return clientStore.itemsActiveArray
  return clientStore.itemsActiveArray.filter((client) => {
    const label = `${client.name} ${client.surname} ${client.phone_number ?? ''} ${client.email ?? ''}`.toLocaleLowerCase()
    return label.includes(search)
  })
})
const filteredTreatments = computed(() => {
  const search = normalizeString(treatmentSearch.value).toLocaleLowerCase()
  if (!search) return treatmentStore.itemsActiveArray
  return treatmentStore.itemsActiveArray.filter((treatment) => {
    const label = `${treatment.title} ${treatment.duration ?? ''}`.toLocaleLowerCase()
    return label.includes(search)
  })
})
const selectableCoupons = computed(() => {
  const nowMs = Date.now()
  return couponStore.itemsActiveArray.filter((coupon) => {
    if (!coupon.active) return false

    const from = asDate(coupon.valid_from)
    if (from && from.getTime() > nowMs) return false

    const to = asDate(coupon.valid_to)
    if (to && to.getTime() < nowMs) return false

    return true
  })
})

const currentClientId = computed(() => normalizeString(current.value?.client_id ?? current.value?.user_id))
const currentClient = computed(() => {
  const clientId = currentClientId.value
  if (!clientId) return undefined
  return clientsById.value.get(clientId)
})

const currentPrimaryOperatorId = computed(() => normalizeString((current.value?.operator_ids ?? [])[0]))
const currentPrimaryOperator = computed(() => {
  const operatorId = currentPrimaryOperatorId.value
  if (!operatorId) return undefined
  return operatorsById.value.get(operatorId)
})

const currentStartDate = computed(() => asDate(current.value?.date_time))
const currentDurationMinutes = computed(() => {
  if (!current.value) return 0
  return computeAppointmentDurationMinutes(current.value, treatmentsById.value, appConfigStore.getConfigData().defaultAppointmentDurationMinutes)
})

const currentEndDate = computed(() => {
  if (!currentStartDate.value) return undefined
  return new Date(currentStartDate.value.getTime() + currentDurationMinutes.value * 60000)
})

const currentDateLabel = computed(() => {
  if (!currentStartDate.value) return '-'
  return currentStartDate.value.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
})

const currentTimeLabel = computed(() => {
  if (!currentStartDate.value || !currentEndDate.value) return '-'
  return `${formatHour(currentStartDate.value)} - ${formatHour(currentEndDate.value)}`
})

const currentClientLabel = computed(() => {
  const client = currentClient.value
  if (!client) return 'Cliente non associato'
  return `${client.name} ${client.surname}`.trim() || 'Cliente non associato'
})

const currentOperatorLabel = computed(() => {
  const operator = currentPrimaryOperator.value
  if (!operator) {
    const operatorId = currentPrimaryOperatorId.value
    return operatorId || 'Operatore non assegnato'
  }
  return `${operator.name} ${operator.surname}`.trim() || operator.email || operator.id
})

const currentTreatmentsLabel = computed(() => {
  if (!current.value) return '-'
  const labels = (current.value.treatment_ids ?? [])
    .map((id) => treatmentsById.value.get(id)?.title ?? id)
    .filter(Boolean)
  return labels.length ? labels.join(', ') : 'Nessun trattamento'
})

const currentCouponLabel = computed(() => {
  const couponId = normalizeString(current.value?.coupon_id)
  if (!couponId) return 'Nessun coupon'
  const coupon = couponStore.findItemsById(couponId)
  if (!coupon) return couponId
  return `${coupon.code} - ${coupon.title}`
})

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function clampFixDuration(value: unknown) {
  const normalized = normalizeNumber(value, 0)
  const stepped = Math.round(normalized / FIX_DURATION_STEP_MINUTES) * FIX_DURATION_STEP_MINUTES
  return Math.max(-FIX_DURATION_LIMIT_MINUTES, Math.min(FIX_DURATION_LIMIT_MINUTES, stepped))
}

function normalizeUniqueIds(values: unknown[]) {
  return [...new Set(values.map((value) => normalizeString(value)).filter(Boolean))]
}

function normalizeNoteForEditor(value: unknown) {
  const normalized = normalizeString(value)
  return normalized || EMPTY_NOTE_HTML
}

function normalizeNoteForSave(value: unknown) {
  const normalized = normalizeString(value)
  if (!normalized || normalized === EMPTY_NOTE_HTML) return ''
  return normalized
}

function defaultUpdateBy() {
  return normalizeString(Auth.user?.email ?? Auth.uid ?? 'admin')
}

function clientLabel(clientId: string) {
  const client = clientStore.findItemsById(clientId)
  if (!client) return clientId
  return `${client.name} ${client.surname}`.trim()
}

function formatHour(date: Date) {
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function estimateDurationForFix(fixDuration: unknown) {
  return computeAppointmentDurationMinutes(
    {
      fix_duration: clampFixDuration(fixDuration),
      treatment_ids: selectedTreatmentIds.value,
    },
    treatmentsById.value,
    appConfigStore.getConfigData().defaultAppointmentDurationMinutes,
  )
}

function onFixDurationRangeInput(
  event: Event,
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void,
) {
  if (!(event.target instanceof HTMLInputElement)) return
  setFieldValue('fix_duration', clampFixDuration(event.target.value), true)
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function estimateTreatmentsAmount() {
  const total = selectedTreatmentIds.value
    .map((id) => normalizeNumber(treatmentsById.value.get(id)?.price, 0))
    .filter((value) => Number.isFinite(value))
    .reduce((sum, current) => sum + current, 0)
  return roundCurrency(Math.max(0, total))
}

function estimateGrossAmount(values: Record<string, unknown>) {
  const extra = normalizeNumber(values.extra, 0)
  return roundCurrency(Math.max(0, estimateTreatmentsAmount() + extra))
}

function normalizeDiscountAmount(value: unknown, max = Number.POSITIVE_INFINITY) {
  const normalized = roundCurrency(Math.max(0, normalizeNumber(value, 0)))
  return roundCurrency(Math.min(normalized, max))
}

function estimateFinalAmount(values: Record<string, unknown>) {
  const gross = estimateGrossAmount(values)
  const discount = normalizeDiscountAmount(values.discount, gross)
  return roundCurrency(Math.max(0, gross - discount))
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(normalizeNumber(value, 0))
}

function summaryClientLabel(values: Record<string, unknown>) {
  const clientId = normalizeString(values.client_id)
  if (!clientId) return 'Nessun cliente'
  const client = clientsById.value.get(clientId)
  if (!client) return clientId
  return `${client.name} ${client.surname}`.trim() || clientId
}

function summaryDayLabel(values: Record<string, unknown>) {
  const date = fromDateTimeLocalValue(normalizeString(values.date_time))
  if (!date) return '-'
  return date.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function summaryTreatmentsLabel() {
  const labels = selectedTreatmentIds.value
    .map((id) => normalizeString(treatmentsById.value.get(id)?.title ?? id))
    .filter(Boolean)
  return labels.length ? labels.join(', ') : 'Nessun trattamento'
}

function applyDiscountPercent(
  percent: number,
  values: Record<string, unknown>,
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void,
) {
  const gross = estimateGrossAmount(values)
  const discount = normalizeDiscountAmount((gross * percent) / 100, gross)
  setFieldValue('discount', discount, true)
}

function applyDiscountRound(
  values: Record<string, unknown>,
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void,
) {
  const gross = estimateGrossAmount(values)
  const remainder = roundCurrency(gross % 5)
  const discount = remainder > 0 && remainder <= 3 ? remainder : 0
  setFieldValue('discount', normalizeDiscountAmount(discount, gross), true)
}

function isCenterAppointment(values: Record<string, unknown>) {
  return !Boolean(values.isPersonal)
}

function hasClientAccordionError(
  values: Record<string, unknown>,
  errors: Record<string, string | undefined>,
  submitCount: number,
) {
  if (!isCenterAppointment(values)) return false
  if (normalizeString(errors.client_id)) return true
  if (submitCount < 1) return false
  return !normalizeString(values.client_id)
}

function isTreatmentsRequiredMissing(values: Record<string, unknown>) {
  if (!isCenterAppointment(values)) return false
  return !selectedTreatmentIds.value.length
}

function hasTreatmentsAccordionError(values: Record<string, unknown>, submitCount: number) {
  return isTreatmentsRequiredMissing(values) && submitCount > 0
}

function hasOperatorsSelectionError(values: Record<string, unknown>, submitCount: number) {
  if (!isCenterAppointment(values)) return false
  if (submitCount < 1) return false
  return !selectedOperatorIds.value.length
}

function toggleTreatment(id: string) {
  const normalized = normalizeString(id)
  if (!normalized) return
  if (selectedTreatmentIds.value.includes(normalized)) {
    selectedTreatmentIds.value = selectedTreatmentIds.value.filter((value) => value !== normalized)
    return
  }
  selectedTreatmentIds.value = [...selectedTreatmentIds.value, normalized]
}

function toggleOperator(id: string) {
  const normalized = normalizeString(id)
  if (!normalized) return
  if (selectedOperatorIds.value.includes(normalized)) {
    selectedOperatorIds.value = selectedOperatorIds.value.filter((value) => value !== normalized)
    return
  }
  selectedOperatorIds.value = [...selectedOperatorIds.value, normalized]
}

function isTreatmentSelected(id: string) {
  return selectedTreatmentIds.value.includes(normalizeString(id))
}

function isOperatorSelected(id: string) {
  return selectedOperatorIds.value.includes(normalizeString(id))
}

function isPrimarySelectedOperator(id: string) {
  const normalized = normalizeString(id)
  if (!normalized || !selectedOperatorIds.value.length) return false
  return selectedOperatorIds.value[0] === normalized
}

function enterEditMode() {
  isEditMode.value = true
}

function onCancelEdit() {
  if (isCreateMode.value) {
    void router.replace({ name: 'CalendarView' })
    return
  }
  isEditMode.value = false
}

async function loadItem() {
  aiSuggestions.value = []
  aiClientContext.value = undefined

  if (isCreateMode.value) {
    current.value = undefined
    selectedTreatmentIds.value = []
    selectedOperatorIds.value = normalizeUniqueIds([String(route.query.operatorId ?? ''), String(Auth.uid ?? '')])
    isEditMode.value = true
    return
  }

  isLoading.value = true
  try {
    current.value = await appointmentStore.ensureOne(routeId.value)
    if (!current.value) {
      toast.warning('Appuntamento non trovato')
      return
    }
    selectedTreatmentIds.value = normalizeUniqueIds(current.value.treatment_ids ?? [])
    selectedOperatorIds.value = normalizeUniqueIds(current.value.operator_ids ?? [])
    if (!selectedOperatorIds.value.length) {
      selectedOperatorIds.value = normalizeUniqueIds([String(Auth.uid ?? '')])
    }
    isEditMode.value = false
  } catch (error) {
    console.error(error)
    toast.error('Errore caricamento appuntamento')
  } finally {
    isLoading.value = false
  }
}

async function onSubmit(values: Record<string, unknown>) {
  const startDate = fromDateTimeLocalValue(normalizeString(values.date_time))
  if (!startDate) {
    toast.error('Data/ora non valida')
    return
  }

  const isPersonal = Boolean(values.isPersonal)
  const clientId = isPersonal ? '' : normalizeString(values.client_id)
  const normalizedTreatments = normalizeUniqueIds(selectedTreatmentIds.value)
  const normalizedOperators = normalizeUniqueIds(selectedOperatorIds.value)

  if (!isPersonal && !clientId) {
    toast.error('Cliente obbligatorio per appuntamento Centro Estetico')
    return
  }
  if (!isPersonal && !normalizedTreatments.length) {
    toast.error('Seleziona almeno un trattamento')
    return
  }
  if (!isPersonal && !normalizedOperators.length) {
    toast.error('Seleziona almeno un operatore')
    return
  }
  if (isPersonal && !normalizedOperators.length) {
    const me = normalizeString(Auth.uid)
    if (me) {
      normalizedOperators.push(me)
    }
  }

  const normalizedNotes = normalizeNoteForSave(values.notes)
  const notes = isPersonal && !normalizedNotes ? PERSONAL_DEFAULT_NOTE : normalizedNotes
  const grossAmount = estimateGrossAmount(values)

  const payload = {
    date_time: Timestamp.fromDate(startDate),
    user_id: clientId || undefined,
    client_id: clientId || undefined,
    treatment_ids: isPersonal ? [] : normalizedTreatments,
    product_ids: current.value?.product_ids ?? [],
    operator_ids: normalizedOperators,
    isPersonal,
    discount: isPersonal ? 0 : normalizeDiscountAmount(values.discount, grossAmount),
    extra: isPersonal ? 0 : normalizeNumber(values.extra, 0),
    fix_duration: clampFixDuration(values.fix_duration),
    coupon_id: isPersonal ? undefined : normalizeString(values.coupon_id) || undefined,
    notes,
    reminded: current.value?.reminded ?? false,
    googleCalendarEventId: current.value?.googleCalendarEventId,
    googleCalendarSyncedAt: current.value?.googleCalendarSyncedAt,
    updateBy: defaultUpdateBy(),
  }

  try {
    if (isCreateMode.value) {
      const created = await appointmentStore.add(payload)
      current.value = created
      isEditMode.value = false
      toast.success('Appuntamento creato')
      await router.replace({ name: 'AppointmentEditView', params: { id: created.id } })
      return
    }

    if (!current.value) return
    await current.value.update(payload)
    await loadItem()
    isEditMode.value = false
    toast.success('Appuntamento aggiornato')
  } catch (error) {
    console.error(error)
    toast.error('Errore salvataggio appuntamento')
  }
}

async function onDeleteAppointment() {
  if (!current.value || isCreateMode.value || isDeleting.value) return

  const ok = window.confirm('Eliminare definitivamente questo appuntamento?')
  if (!ok) return

  isDeleting.value = true
  try {
    await current.value.delete(appointmentStore)
    toast.success('Appuntamento eliminato')
    await router.replace({ name: 'CalendarView' })
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione appuntamento')
  } finally {
    isDeleting.value = false
  }
}

function applySuggestion(value: string, setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void) {
  const next = asDate(value)
  if (!next) return
  const dateTimeString = toDateTimeLocalValue(next)
  if (!dateTimeString) return
  setFieldValue('date_time', dateTimeString, true)
}

async function requestAiSuggestions(values: Record<string, unknown>) {
  if (!canUseAvailabilityAi.value) {
    toast.error('Permessi AI + OPERATORE richiesti')
    return
  }

  const dateValue = normalizeString(values.date_time)
  const date = fromDateTimeLocalValue(dateValue) ?? new Date()
  const treatmentIds = normalizeUniqueIds(selectedTreatmentIds.value)

  isAiLoading.value = true
  aiSuggestions.value = []
  aiClientContext.value = undefined
  try {
    const response = await callAvailabilityAgent({
      referenceDate: date.toISOString(),
      clientId: normalizeString(values.client_id) || undefined,
      treatmentIds,
      overrideDurationMinutes: estimateDurationForFix(values.fix_duration),
      rangeDays: appConfigStore.getConfigData().availabilitySearchDays,
    })
    aiSuggestions.value = response.slots ?? []
    aiClientContext.value = response.clientContext
    toast.success('Suggerimenti disponibilita aggiornati')
  } catch (error) {
    console.error(error)
    toast.error('Errore agente disponibilita')
  } finally {
    isAiLoading.value = false
  }
}

onMounted(loadItem)
watch(() => route.params.id, loadItem)
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp :title="isCreateMode ? 'Nuovo appuntamento' : 'Appuntamento'" :to="{ name: 'CalendarView' }" />

    <div class="edit-wrapper mx-auto py-3">
      <p v-if="isLoading" class="text-muted small mt-3">Caricamento...</p>

      <Form
        v-else-if="isEditMode && (isCreateMode || current)"
        :key="formKey"
        :validation-schema="schema"
        :initial-values="initialValues"
        @submit="onSubmit"
        v-slot="{ isSubmitting, values, setFieldValue, errors, submitCount }"
        class="card border-0 shadow-sm p-3 p-md-4 form-shell"
      >
        <div class="row g-3">
          <div class="col-12">
            <div class="appointment-type-switch" role="group" aria-label="Tipo appuntamento">
              <button
                type="button"
                class="appointment-type-switch__btn"
                :class="{ 'appointment-type-switch__btn--active': !values.isPersonal }"
                @click="setFieldValue('isPersonal', false, false)"
              >
                Appuntamento Centro Estetico
              </button>
              <button
                type="button"
                class="appointment-type-switch__btn"
                :class="{ 'appointment-type-switch__btn--active': values.isPersonal }"
                @click="setFieldValue('isPersonal', true, false)"
              >
                Personale
              </button>
            </div>
            <ErrorMessage name="isPersonal" class="text-danger small" />
          </div>

          <div :class="values.isPersonal ? 'col-12 col-md-6' : 'col-12'">
            <label class="form-label">Data e ora</label>
            <Field name="date_time" type="datetime-local" class="form-control" />
            <ErrorMessage name="date_time" class="text-danger small" />
          </div>

          <div v-if="values.isPersonal" class="col-12 col-md-6">
            <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
              <label class="form-label mb-0">Durata</label>
              <span class="badge text-bg-light border">{{ estimateDurationForFix(values.fix_duration) }} min</span>
            </div>
            <Field
              name="fix_duration"
              type="number"
              class="form-control"
              :min="-FIX_DURATION_LIMIT_MINUTES"
              :max="FIX_DURATION_LIMIT_MINUTES"
              :step="FIX_DURATION_STEP_MINUTES"
            />
            <ErrorMessage name="fix_duration" class="text-danger small" />
          </div>

          <div v-if="!values.isPersonal" class="col-12">
            <Accordion id="appointment-client-accordion" title="Cliente" :defaultOpen="true" class="appointment-filter-accordion">
              <template #header>
                <div class="accordion-header-row">
                  <span>Cliente</span>
                  <span v-if="hasClientAccordionError(values, errors, submitCount)" class="badge text-bg-danger">
                    Obbligatorio
                  </span>
                </div>
              </template>
              <input
                v-model="clientSearch"
                type="search"
                class="form-control mb-2"
                placeholder="Cerca cliente per nome, cognome, telefono o email"
              />
              <div class="chip-grid">
                <button
                  type="button"
                  class="chip chip--secondary"
                  :class="{ 'chip--active': !normalizeString(values.client_id) }"
                  @click="setFieldValue('client_id', '', true)"
                >
                  Nessun cliente
                </button>
                <button
                  v-for="client in filteredClients"
                  :key="client.id"
                  type="button"
                  class="chip chip--secondary"
                  :class="{ 'chip--active': normalizeString(values.client_id) === client.id }"
                  @click="setFieldValue('client_id', client.id, true)"
                >
                  {{ clientLabel(client.id) }}
                </button>
              </div>
              <small v-if="!filteredClients.length" class="text-muted d-block mt-1">Nessun cliente trovato.</small>
              <ErrorMessage name="client_id" class="text-danger small d-block mt-1" />
            </Accordion>
          </div>

          <div v-if="!values.isPersonal" class="col-12">
            <Accordion
              id="appointment-treatment-accordion"
              title="Trattamenti"
              :defaultOpen="true"
              class="appointment-filter-accordion"
            >
              <template #header>
                <div class="accordion-header-row">
                  <span>Trattamenti</span>
                  <span v-if="isTreatmentsRequiredMissing(values)" class="badge text-bg-danger">Obbligatorio</span>
                </div>
              </template>
              <input
                v-model="treatmentSearch"
                type="search"
                class="form-control mb-2"
                placeholder="Cerca trattamento per nome o durata"
              />
              <div class="chip-grid">
                <button
                  v-for="treatment in filteredTreatments"
                  :key="treatment.id"
                  type="button"
                  class="chip"
                  :class="{ 'chip--active': isTreatmentSelected(treatment.id) }"
                  @click="toggleTreatment(treatment.id)"
                >
                  {{ treatment.title }} ({{ treatment.duration }}m | {{ formatCurrency(treatment.price) }})
                </button>
              </div>
              <small v-if="!filteredTreatments.length" class="text-muted d-block mt-1">Nessun trattamento trovato.</small>
              <small v-if="hasTreatmentsAccordionError(values, submitCount)" class="text-danger d-block mt-1">
                Seleziona almeno un trattamento.
              </small>
            </Accordion>
          </div>

          <div v-if="!values.isPersonal" class="col-12">
            <div class="price-adjust-box mt-1">
              <span class="badge text-bg-dark price-adjust-box__badge">Costo finale {{ formatCurrency(estimateFinalAmount(values)) }}</span>
              <div class="row g-2">
                <div class="col-6">
                  <label class="form-label">Sconto</label>
                  <Field name="discount" type="number" step="1" inputmode="decimal" class="form-control" />
                  <div class="d-flex flex-wrap gap-1 mt-2">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary discount-preset-btn"
                      @click="applyDiscountPercent(10, values, setFieldValue)"
                    >
                      10%
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary discount-preset-btn"
                      @click="applyDiscountPercent(20, values, setFieldValue)"
                    >
                      20%
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary discount-preset-btn"
                      @click="applyDiscountPercent(50, values, setFieldValue)"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary discount-preset-btn"
                      @click="applyDiscountPercent(100, values, setFieldValue)"
                    >
                      100%
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-dark discount-preset-btn"
                      aria-label="Arrotonda"
                      title="Arrotonda"
                      @click="applyDiscountRound(values, setFieldValue)"
                    >
                      <span class="material-symbols-outlined discount-preset-icon" aria-hidden="true">payment_arrow_down</span>
                    </button>
                  </div>
                  <ErrorMessage name="discount" class="text-danger small d-block mt-1" />
                </div>

                <div class="col-6">
                  <label class="form-label">Extra</label>
                  <Field name="extra" type="number" step="1" inputmode="decimal" class="form-control" />
                  <ErrorMessage name="extra" class="text-danger small d-block mt-1" />
                </div>
              </div>
            </div>
          </div>

          <div v-if="!values.isPersonal" class="col-12">
            <label class="form-label">Coupon</label>
            <Field name="coupon_id" as="select" class="form-select">
              <option value="">Nessuno</option>
              <option v-for="coupon in selectableCoupons" :key="coupon.id" :value="coupon.id">
                {{ coupon.code }} - {{ coupon.title }}
              </option>
            </Field>
            <ErrorMessage name="coupon_id" class="text-danger small" />
          </div>

          <div v-if="!values.isPersonal" class="col-12">
            <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
              <label class="form-label mb-0">Durata</label>
              <span class="badge text-bg-light border">{{ estimateDurationForFix(values.fix_duration) }} min</span>
            </div>
            <input
              type="range"
              class="form-range"
              :min="-FIX_DURATION_LIMIT_MINUTES"
              :max="FIX_DURATION_LIMIT_MINUTES"
              :step="FIX_DURATION_STEP_MINUTES"
              :value="clampFixDuration(values.fix_duration)"
              @input="(event) => onFixDurationRangeInput(event, setFieldValue)"
            />
            <div class="d-flex justify-content-between text-muted small px-1 mt-1">
              <span>-{{ FIX_DURATION_LIMIT_MINUTES }}</span>
              <span>0</span>
              <span>+{{ FIX_DURATION_LIMIT_MINUTES }}</span>
            </div>
            <ErrorMessage name="fix_duration" class="text-danger small d-block mt-1" />
          </div>

          <div v-if="!values.isPersonal" class="col-12">
            <div class="operators-box">
              <label class="form-label mb-1">Operatori assegnati</label>
              <div class="chip-grid">
                <button
                  v-for="operator in operatorUsers"
                  :key="operator.id"
                  type="button"
                  class="chip chip--secondary chip--operator"
                  :class="{ 'chip--active': isOperatorSelected(operator.id) }"
                  :title="isPrimarySelectedOperator(operator.id) ? 'Operatore principale' : undefined"
                  @click="toggleOperator(operator.id)"
                >
                  <span v-if="isPrimarySelectedOperator(operator.id)" class="chip-primary-dot" aria-hidden="true" />
                  {{ operator.name }} {{ operator.surname }}
                </button>
              </div>
            </div>
            <small v-if="hasOperatorsSelectionError(values, submitCount)" class="text-danger d-block mt-1">
              Seleziona almeno un operatore.
            </small>
          </div>

          <div class="col-12">
            <FieldTiptap
              name="notes"
              label="Note"
              :required="false"
              :show-errors="false"
              :model-value="normalizeNoteForEditor(values.notes)"
              toolbar-sticky-on="top"
              @update:model-value="(value) => setFieldValue('notes', value)"
            />
            <ErrorMessage name="notes" class="text-danger small" />
          </div>

        </div>

        <div v-if="canUseAvailabilityAi && !values.isPersonal" class="card border-0 bg-light mt-3 p-3">
          <div class="d-flex justify-content-between align-items-center gap-2">
            <strong>Agente disponibilita</strong>
            <Btn type="button" color="dark" icon="psychology" :loading="isAiLoading" @click="requestAiSuggestions(values)">
              Suggerisci slot
            </Btn>
          </div>
          <small class="text-muted d-block mt-1">
            Richiede permessi AI + OPERATORE. Tiene conto di trattamenti e durata stimata.
          </small>

          <div v-if="aiClientContext" class="mt-2 small">
            <div>Appuntamenti cliente: {{ aiClientContext.totalAppointments }}</div>
            <div v-if="aiClientContext.previousAppointmentAt">Precedente: {{ new Date(aiClientContext.previousAppointmentAt).toLocaleString('it-IT') }}</div>
            <div v-if="aiClientContext.nextAppointmentAt">Prossimo: {{ new Date(aiClientContext.nextAppointmentAt).toLocaleString('it-IT') }}</div>
          </div>

          <div class="vstack gap-2 mt-2">
            <button
              v-for="slot in aiSuggestions"
              :key="slot.start"
              type="button"
              class="slot-btn"
              @click="applySuggestion(slot.start, setFieldValue)"
            >
              {{ new Date(slot.start).toLocaleString('it-IT') }} - {{ new Date(slot.end).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) }}
              <small class="d-block text-muted">{{ slot.reason }}</small>
            </button>
            <small v-if="!aiSuggestions.length" class="text-muted">Nessun suggerimento ancora disponibile.</small>
          </div>
        </div>

        <div class="d-flex gap-2 mt-4 flex-wrap">
          <Btn type="submit" color="dark" icon="save" :loading="isSubmitting || isDeleting">
            {{ isCreateMode ? 'Crea' : 'Salva' }}
          </Btn>
          <Btn type="button" color="secondary" variant="outline" icon="close" :disabled="isSubmitting" @click="onCancelEdit">
            Annulla
          </Btn>
          <Btn
            v-if="!isCreateMode"
            type="button"
            color="danger"
            variant="outline"
            icon="delete"
            :loading="isDeleting"
            :disabled="isSubmitting"
            @click="onDeleteAppointment"
          >
            Elimina
          </Btn>
        </div>

        <div v-if="!values.isPersonal" class="summary-compact mt-3">
          <div class="summary-compact__metrics">
            <div>
              Durata totale:
              <strong>{{ estimateDurationForFix(values.fix_duration) }} min</strong>
            </div>
            <div>
              Costo finale:
              <strong>{{ formatCurrency(estimateFinalAmount(values)) }}</strong>
            </div>
          </div>
          <div class="summary-compact__meta text-muted">
            <span><strong>Cliente:</strong> {{ summaryClientLabel(values) }}</span>
            <span><strong>Giorno:</strong> {{ summaryDayLabel(values) }}</span>
            <span><strong>Trattamenti:</strong> {{ summaryTreatmentsLabel() }}</span>
          </div>
        </div>
      </Form>

      <div v-else-if="current" class="view-shell">
        <AppointmentDetailsCard
          :date-label="currentDateLabel"
          :time-label="currentTimeLabel"
          :duration-minutes="currentDurationMinutes"
          :client-label="currentClientLabel"
          :operator-label="currentOperatorLabel"
          :treatments-label="currentTreatmentsLabel"
          :coupon-label="currentCouponLabel"
          :discount="current.discount"
          :extra="current.extra"
          :is-personal="current.isPersonal"
          :notes="current.notes"
          :reminded="current.reminded"
          class="appointment-main-card mx-auto"
        >
          <template #actions>
            <Btn type="button" color="dark" icon="edit" @click="enterEditMode">Modifica</Btn>
          </template>
        </AppointmentDetailsCard>

        <div class="row g-2 mt-2">
          <div class="col-12 col-md-6">
            <ClientPersonCard
              v-if="currentClient"
              :name="currentClient.name"
              :surname="currentClient.surname"
              :gender="currentClient.gender"
              :phone-number="currentClient.phone_number"
              :email="currentClient.email"
              :birthdate="currentClient.birthdate"
              :note="currentClient.note"
              :show-details="true"
              compact
            />
            <article v-else class="card border-0 shadow-sm p-3 h-100">
              <p class="fw-semibold mb-1">Cliente</p>
              <p class="text-muted small mb-0">Nessun cliente associato a questo appuntamento.</p>
            </article>
          </div>

          <div class="col-12 col-md-6">
            <AppointmentOperatorCard
              :operator-id="currentPrimaryOperatorId || undefined"
              :operator="
                currentPrimaryOperator
                  ? {
                      id: currentPrimaryOperator.id,
                      name: currentPrimaryOperator.name,
                      surname: currentPrimaryOperator.surname,
                      email: currentPrimaryOperator.email,
                    }
                  : undefined
              "
            />
          </div>
        </div>

        <div class="d-flex gap-2 mt-2 flex-wrap">
          <Btn type="button" color="danger" variant="outline" icon="delete" :loading="isDeleting" @click="onDeleteAppointment">
            Elimina appuntamento
          </Btn>
        </div>
      </div>

      <p v-else class="text-muted small mt-3">Appuntamento non trovato.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.edit-wrapper {
  max-width: 980px;
}

.form-shell {
  max-width: 820px;
  margin-inline: auto;
}

.appointment-main-card {
  max-width: 760px;
}

.appointment-type-switch {
  display: flex;
  width: 100%;
  border: 1px solid rgba(84, 44, 58, 0.28);
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.86);
}

.appointment-type-switch__btn {
  flex: 1 1 0;
  border: 0;
  background: transparent;
  padding: 0.45rem 0.7rem;
  font-size: 0.8rem;
  line-height: 1.25;
  text-align: center;
  white-space: normal;
  color: #4a3241;
  transition: background 0.2s ease, color 0.2s ease;
}

.appointment-type-switch__btn--active {
  background: rgba(84, 44, 58, 0.9);
  color: #fff;
}

.accordion-header-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: 1px solid rgba(84, 44, 58, 0.22);
  border-radius: 0.45rem;
  background: rgba(255, 255, 255, 0.78);
  padding: 0.35rem 0.56rem;
  font-size: 0.82rem;
}

.chip--secondary {
  border-color: rgba(35, 68, 95, 0.22);
}

.chip--operator {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.chip--active {
  background: rgba(232, 179, 190, 0.45);
  border-color: rgba(84, 44, 58, 0.58);
}

.chip-primary-dot {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: #2e7d32;
  box-shadow: 0 0 0 1px rgba(46, 125, 50, 0.2);
  flex: 0 0 auto;
}

.operators-box {
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 0.5rem;
  padding: 0.6rem 0.55rem;
  background: rgba(255, 255, 255, 0.78);
}

.discount-preset-btn {
  --bs-btn-padding-y: 0.08rem;
  --bs-btn-padding-x: 0.45rem;
  --bs-btn-font-size: 0.72rem;
}

.discount-preset-icon {
  font-size: 0.9rem;
  line-height: 1;
}

.price-adjust-box {
  position: relative;
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 0.5rem;
  padding: 0.75rem 0.55rem 0.5rem;
  background: rgba(255, 255, 255, 0.78);
}

.price-adjust-box__badge {
  position: absolute;
  top: -0.55rem;
  right: 0.55rem;
  font-size: 0.68rem;
  font-weight: 600;
}

.summary-compact {
  border: 1px solid rgba(84, 44, 58, 0.16);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.8);
  padding: 0.45rem 0.6rem;
  font-size: 0.78rem;
  display: grid;
  gap: 0.4rem 0.8rem;
}

.summary-compact__metrics {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem 0.8rem;
}

.summary-compact__meta {
  display: grid;
  gap: 0.2rem;
  line-height: 1.2;
}

.slot-btn {
  text-align: left;
  border: 1px solid rgba(35, 68, 95, 0.3);
  background: rgba(219, 237, 255, 0.45);
  border-radius: 8px;
  padding: 0.45rem 0.55rem;
}
</style>

