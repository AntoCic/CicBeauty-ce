<script setup lang="ts">
import { Btn, cicKitStore, toast, useStoreWatch } from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HeaderApp from '../../components/HeaderApp.vue'
import { callAvailabilityAgent } from '../../call/callAvailabilityAgent'
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
import { hasAiAndOperatorAccess, hasBetaFeaturesAccess, hasOperatorAccess } from '../../utils/permissions'

type AppointmentForm = {
  date_time: string
  status: string
  client_id: string
  notes: string
  discount: number | string
  extra: number | string
  fix_duration: number | string
  custom_duration_minutes: number | string
  isPersonal: boolean
  coupon_id: string
  old_id: string
}

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const canOperate = computed(() => hasOperatorAccess())
const canUseAvailabilityAi = computed(() => hasAiAndOperatorAccess())
const hasBetaFeatures = computed(() => hasBetaFeaturesAccess())

const current = ref<Appointment | undefined>(undefined)
const isLoading = ref(false)
const isDeleting = ref(false)
const selectedTreatmentIds = ref<string[]>([])
const selectedOperatorIds = ref<string[]>([])
const aiSuggestions = ref<Array<{ start: string; end: string; reason: string }>>([])
const aiClientContext = ref<{ previousAppointmentAt?: string; nextAppointmentAt?: string; totalAppointments: number } | undefined>()
const isAiLoading = ref(false)

const routeId = computed(() => String(route.params.id ?? '').trim())
const isCreateMode = computed(() => !routeId.value || routeId.value === 'new')

useStoreWatch(
  canOperate.value
    ? [
        { store: appointmentStore, getOpts: { forceLocalSet: true } },
        { store: clientStore, getOpts: { orderBy: { fieldPath: 'surname', directionStr: 'asc' }, forceLocalSet: true } },
        { store: treatmentStore, getOpts: { orderBy: { fieldPath: 'title', directionStr: 'asc' }, forceLocalSet: true }, checkLogin: false },
        { store: publicUserStore, getOpts: { forceLocalSet: true } },
        { store: appConfigStore, getOpts: { forceLocalSet: true }, checkLogin: false },
        { store: couponStore, getOpts: { forceLocalSet: true } },
      ]
    : [],
)

const formKey = computed(() => (isCreateMode.value ? 'appointment-new' : current.value?.id ?? 'appointment-edit'))
const schema = toTypedSchema(
  yup.object({
    date_time: yup.string().required('Campo obbligatorio'),
    status: yup.string().required('Campo obbligatorio'),
    client_id: yup.string().default(''),
    notes: yup.string().default(''),
    discount: yup.number().typeError('Numero non valido').default(0),
    extra: yup.number().typeError('Numero non valido').default(0),
    fix_duration: yup.number().typeError('Numero non valido').default(0),
    custom_duration_minutes: yup.number().typeError('Numero non valido').default(0),
    isPersonal: yup.boolean().required(),
    coupon_id: yup.string().default(''),
    old_id: yup.string().default(''),
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
    status: current.value?.status ?? 'planned',
    client_id: String(current.value?.client_id ?? current.value?.user_id ?? ''),
    notes: current.value?.notes ?? '',
    discount: Number(current.value?.discount ?? 0),
    extra: Number(current.value?.extra ?? 0),
    fix_duration: Number(current.value?.fix_duration ?? 0),
    custom_duration_minutes: Number(current.value?.custom_duration_minutes ?? 0),
    isPersonal: current.value?.isPersonal ?? false,
    coupon_id: String(current.value?.coupon_id ?? ''),
    old_id: String(current.value?.old_id ?? ''),
  }
})

const treatmentsById = computed(() => new Map(treatmentStore.itemsActiveArray.map((item) => [item.id, item])))

const estimatedDuration = computed(() => {
  const fallback = appConfigStore.getConfigData().defaultAppointmentDurationMinutes
  const tempAppointment = {
    custom_duration_minutes: undefined,
    fix_duration: 0,
    treatment_ids: selectedTreatmentIds.value,
  }
  return computeAppointmentDurationMinutes(tempAppointment, treatmentsById.value, fallback)
})

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function normalizeUniqueIds(values: string[]) {
  return [...new Set(values.map((value) => normalizeString(value)).filter(Boolean))]
}

function defaultUpdateBy() {
  return normalizeString(Auth.user?.email ?? Auth.uid ?? 'admin')
}

function clientLabel(clientId: string) {
  const client = clientStore.findItemsById(clientId)
  if (!client) return clientId
  return `${client.name} ${client.surname}`.trim()
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

async function loadItem() {
  if (!canOperate.value) return
  if (isCreateMode.value) {
    current.value = undefined
    selectedTreatmentIds.value = []
    selectedOperatorIds.value = normalizeUniqueIds([
      String(route.query.operatorId ?? ''),
      String(Auth.uid ?? ''),
    ])
    aiSuggestions.value = []
    aiClientContext.value = undefined
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
    selectedOperatorIds.value = normalizeUniqueIds(current.value.operator_ids ?? [String(current.value.operator_id ?? '')])
    aiSuggestions.value = []
    aiClientContext.value = undefined
  } catch (error) {
    console.error(error)
    toast.error('Errore caricamento appuntamento')
  } finally {
    isLoading.value = false
  }
}

async function onSubmit(values: Record<string, unknown>) {
  if (!canOperate.value) {
    toast.error('Permesso OPERATORE richiesto')
    return
  }

  const start = fromDateTimeLocalValue(normalizeString(values.date_time))
  if (!start) {
    toast.error('Data/ora non valida')
    return
  }

  const appointmentForDuration = {
    custom_duration_minutes: normalizeNumber(values.custom_duration_minutes, 0) || undefined,
    fix_duration: normalizeNumber(values.fix_duration, 0),
    treatment_ids: selectedTreatmentIds.value,
  }
  const fallback = appConfigStore.getConfigData().defaultAppointmentDurationMinutes
  const durationMinutes = computeAppointmentDurationMinutes(appointmentForDuration, treatmentsById.value, fallback)
  const end = new Date(start.getTime() + durationMinutes * 60000)

  const normalizedOperators = normalizeUniqueIds(selectedOperatorIds.value)
  if (!normalizedOperators.length) {
    normalizedOperators.push(String(Auth.uid ?? ''))
  }

  const clientId = normalizeString(values.client_id)
  const isPersonal = Boolean(values.isPersonal)

  const payload = {
    date_time: start,
    end_time: end,
    user_id: clientId || undefined,
    client_id: clientId || undefined,
    treatment_ids: normalizeUniqueIds(selectedTreatmentIds.value),
    operator_id: normalizedOperators[0] || String(Auth.uid ?? ''),
    operator_ids: normalizedOperators,
    ownerOperatorId: isPersonal ? String(Auth.uid ?? '') : '',
    isPersonal,
    discount: normalizeNumber(values.discount, 0),
    extra: normalizeNumber(values.extra, 0),
    fix_duration: normalizeNumber(values.fix_duration, 0),
    custom_duration_minutes: normalizeNumber(values.custom_duration_minutes, 0),
    coupon_id: normalizeString(values.coupon_id),
    old_id: hasBetaFeatures.value ? normalizeString(values.old_id) : '',
    status: normalizeString(values.status) || 'planned',
    notes: normalizeString(values.notes),
    updateBy: defaultUpdateBy(),
  }

  try {
    if (isCreateMode.value) {
      await appointmentStore.add(payload)
      toast.success('Appuntamento creato')
      await router.replace({ name: 'CalendarDayView', query: { date: start.toISOString().slice(0, 10) } })
      return
    }
    if (!current.value) return
    await current.value.update(payload)
    toast.success('Appuntamento aggiornato')
    await router.replace({ name: 'CalendarDayView', query: { date: start.toISOString().slice(0, 10) } })
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
      overrideDurationMinutes: normalizeNumber(values.custom_duration_minutes, 0) || undefined,
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
    <HeaderApp :title="isCreateMode ? 'Nuovo appuntamento' : 'Modifica appuntamento'" :to="{ name: 'CalendarView' }" />

    <div class="edit-wrapper mx-auto py-3">
      <p v-if="!canOperate" class="text-muted small mt-3">Permesso `OPERATORE` richiesto.</p>
      <p v-else-if="isLoading" class="text-muted small mt-3">Caricamento...</p>

      <Form
        v-else-if="isCreateMode || current"
        :key="formKey"
        :validation-schema="schema"
        :initial-values="initialValues"
        @submit="onSubmit"
        v-slot="{ isSubmitting, values, setFieldValue }"
        class="card border-0 shadow-sm p-3 p-md-4"
      >
        <div class="row g-3">
          <div class="col-12 col-md-4">
            <label class="form-label">Data e ora</label>
            <Field name="date_time" type="datetime-local" class="form-control" />
            <ErrorMessage name="date_time" class="text-danger small" />
          </div>
          <div class="col-12 col-md-4">
            <label class="form-label">Stato</label>
            <Field name="status" as="select" class="form-select">
              <option value="planned">Planned</option>
              <option value="confirmed">Confirmed</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </Field>
            <ErrorMessage name="status" class="text-danger small" />
          </div>
          <div class="col-12 col-md-4">
            <label class="form-label">Cliente</label>
            <Field name="client_id" as="select" class="form-select">
              <option value="">Seleziona cliente</option>
              <option v-for="client in clientStore.itemsActiveArray" :key="client.id" :value="client.id">
                {{ clientLabel(client.id) }}
              </option>
            </Field>
            <ErrorMessage name="client_id" class="text-danger small" />
          </div>

          <div class="col-12 col-md-3">
            <label class="form-label">Sconto</label>
            <Field name="discount" type="number" step="0.01" class="form-control" />
            <ErrorMessage name="discount" class="text-danger small" />
          </div>
          <div class="col-12 col-md-3">
            <label class="form-label">Extra</label>
            <Field name="extra" type="number" step="0.01" class="form-control" />
            <ErrorMessage name="extra" class="text-danger small" />
          </div>
          <div class="col-12 col-md-3">
            <label class="form-label">Fix durata (min)</label>
            <Field name="fix_duration" type="number" class="form-control" />
            <ErrorMessage name="fix_duration" class="text-danger small" />
          </div>
          <div class="col-12 col-md-3">
            <label class="form-label">Durata custom (min)</label>
            <Field name="custom_duration_minutes" type="number" min="0" class="form-control" />
            <ErrorMessage name="custom_duration_minutes" class="text-danger small" />
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">Coupon</label>
            <Field name="coupon_id" as="select" class="form-select">
              <option value="">Nessuno</option>
              <option v-for="coupon in couponStore.itemsActiveArray" :key="coupon.id" :value="coupon.id">
                {{ coupon.code }} - {{ coupon.title }}
              </option>
            </Field>
            <ErrorMessage name="coupon_id" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label d-block">Tipo</label>
            <div class="form-check">
              <Field id="isPersonal" name="isPersonal" type="checkbox" class="form-check-input" />
              <label for="isPersonal" class="form-check-label">Appuntamento personale (solo io)</label>
            </div>
            <ErrorMessage name="isPersonal" class="text-danger small" />
          </div>

          <div class="col-12">
            <label class="form-label">Trattamenti (tempo base {{ estimatedDuration }} min)</label>
            <div class="chip-grid">
              <button
                v-for="treatment in treatmentStore.itemsActiveArray"
                :key="treatment.id"
                type="button"
                class="chip"
                :class="{ 'chip--active': isTreatmentSelected(treatment.id) }"
                @click="toggleTreatment(treatment.id)"
              >
                {{ treatment.title }} ({{ treatment.duration }}m)
              </button>
            </div>
          </div>

          <div class="col-12">
            <label class="form-label">Operatori assegnati</label>
            <div class="chip-grid">
              <button
                v-for="operator in publicUserStore.itemsActiveArray"
                :key="operator.id"
                type="button"
                class="chip chip--secondary"
                :class="{ 'chip--active': isOperatorSelected(operator.id) }"
                @click="toggleOperator(operator.id)"
              >
                {{ operator.name }} {{ operator.surname }}
              </button>
            </div>
          </div>

          <div class="col-12">
            <label class="form-label">Note</label>
            <Field name="notes" as="textarea" rows="3" class="form-control" />
            <ErrorMessage name="notes" class="text-danger small" />
          </div>

          <div v-if="hasBetaFeatures" class="col-12 col-md-4">
            <label class="form-label">old_id (migrazione)</label>
            <Field name="old_id" class="form-control" />
            <ErrorMessage name="old_id" class="text-danger small" />
          </div>
        </div>

        <div class="alert alert-light border mt-3 mb-0 small">
          Durata stimata: <strong>{{ estimatedDuration }} minuti</strong>
          <span v-if="Number(values.custom_duration_minutes || 0) > 0"> (override personalizzato)</span>
        </div>

        <div v-if="canUseAvailabilityAi" class="card border-0 bg-light mt-3 p-3">
          <div class="d-flex justify-content-between align-items-center gap-2">
            <strong>Agente disponibilita</strong>
            <Btn type="button" color="dark" icon="psychology" :loading="isAiLoading" @click="requestAiSuggestions(values)">
              Suggerisci slot
            </Btn>
          </div>
          <small class="text-muted d-block mt-1">
            Richiede permessi AI + OPERATORE. Tiene conto di trattamenti, durata personalizzata e agenda.
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

        <div class="d-flex gap-2 mt-4">
          <Btn type="submit" color="dark" icon="save" :loading="isSubmitting || isDeleting">
            {{ isCreateMode ? 'Crea' : 'Salva' }}
          </Btn>
          <Btn v-if="!isCreateMode" type="button" color="danger" variant="outline" icon="delete" :loading="isDeleting" @click="onDeleteAppointment">
            Elimina
          </Btn>
        </div>
      </Form>

      <p v-else class="text-muted small mt-3">Appuntamento non trovato.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.edit-wrapper {
  max-width: 900px;
}

.chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: 1px solid rgba(84, 44, 58, 0.22);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.72);
  padding: 0.35rem 0.56rem;
  font-size: 0.8rem;
}

.chip--secondary {
  border-color: rgba(35, 68, 95, 0.22);
}

.chip--active {
  background: rgba(232, 179, 190, 0.45);
  border-color: rgba(84, 44, 58, 0.58);
}

.slot-btn {
  text-align: left;
  border: 1px solid rgba(35, 68, 95, 0.3);
  background: rgba(219, 237, 255, 0.45);
  border-radius: 8px;
  padding: 0.45rem 0.55rem;
}
</style>
