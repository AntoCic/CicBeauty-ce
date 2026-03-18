<script setup lang="ts">
import { Btn } from 'cic-kit'
import { ErrorMessage, Field, Form } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { computed, ref } from 'vue'
import { buildGiftCouponCode } from '../../../utils/couponUtils'
import type { CouponGiftFormValues } from '../couponGiftShared'

type ClientOption = {
  id: string
  name?: string
  surname?: string
}

type TreatmentOption = {
  id: string
  title?: string
  duration?: number
  price?: number
}

type SetFieldValue = (field: string, value: unknown, shouldValidate?: boolean) => void

const props = withDefaults(
  defineProps<{
    initialValues: CouponGiftFormValues
    clients: ClientOption[]
    treatments: TreatmentOption[]
    loading?: boolean
    submitLabel?: string
    cardTitle?: string
    showCancel?: boolean
  }>(),
  {
    loading: false,
    submitLabel: 'Salva coupon',
    cardTitle: 'Coupon regalo',
    showCancel: false,
  },
)

const emit = defineEmits<{
  (event: 'submit', values: CouponGiftFormValues): void
  (event: 'cancel'): void
}>()

const treatmentSearch = ref('')

const schema = toTypedSchema(
  yup.object({
    code: yup.string().required('Codice obbligatorio'),
    from: yup.string().required('Inserisci il nome di chi invia il regalo'),
    client_id: yup.string().required('Seleziona il cliente destinatario'),
    trattamenti: yup.array(yup.string().required()).min(1, 'Seleziona almeno un trattamento'),
    valid_from: yup.string().required('Data inizio obbligatoria'),
    valid_to: yup
      .string()
      .required('Data fine obbligatoria')
      .test('valid-after-from', 'La data fine deve essere uguale o successiva alla data inizio', function validate(value) {
        const validFrom = String(this.parent.valid_from ?? '').trim()
        const validTo = String(value ?? '').trim()
        if (!validFrom || !validTo) return true
        return validTo >= validFrom
      }),
    note: yup.string().default(''),
  }),
)

const formKey = computed(() => JSON.stringify(props.initialValues))
const sortedClients = computed(() =>
  [...props.clients].sort((a, b) => {
    const labelA = `${String(a.surname ?? '')} ${String(a.name ?? '')}`.trim()
    const labelB = `${String(b.surname ?? '')} ${String(b.name ?? '')}`.trim()
    return labelA.localeCompare(labelB, 'it')
  }),
)

const filteredTreatments = computed(() => {
  const search = String(treatmentSearch.value ?? '').toLocaleLowerCase().trim()
  if (!search) return props.treatments
  return props.treatments.filter((treatment) => {
    const label = `${String(treatment.title ?? '')} ${String(treatment.duration ?? '')}`.toLocaleLowerCase()
    return label.includes(search)
  })
})

const treatmentsById = computed(() => new Map(props.treatments.map((treatment) => [treatment.id, treatment])))

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(normalizeNumber(value, 0))
}

function clientLabel(client: ClientOption) {
  const fullName = `${normalizeString(client.name)} ${normalizeString(client.surname)}`.trim()
  return fullName || client.id
}

function normalizeTreatmentIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((entry) => normalizeString(entry)).filter(Boolean))]
}

function isTreatmentSelected(treatmentId: string, values: Record<string, unknown>) {
  return normalizeTreatmentIds(values.trattamenti).includes(treatmentId)
}

function toggleTreatment(treatmentId: string, values: Record<string, unknown>, setFieldValue: SetFieldValue) {
  const current = normalizeTreatmentIds(values.trattamenti)
  const exists = current.includes(treatmentId)
  const next = exists ? current.filter((id) => id !== treatmentId) : [...current, treatmentId]
  setFieldValue('trattamenti', next, true)
}

function estimateTreatmentsTotal(values: Record<string, unknown>) {
  const ids = normalizeTreatmentIds(values.trattamenti)
  const total = ids.reduce((sum, treatmentId) => {
    return sum + normalizeNumber(treatmentsById.value.get(treatmentId)?.price, 0)
  }, 0)
  return Math.max(0, Math.round(total * 100) / 100)
}

function normalizeSubmitValues(values: Record<string, unknown>): CouponGiftFormValues {
  return {
    code: normalizeString(values.code),
    from: normalizeString(values.from),
    client_id: normalizeString(values.client_id),
    trattamenti: normalizeTreatmentIds(values.trattamenti),
    valid_from: normalizeString(values.valid_from),
    valid_to: normalizeString(values.valid_to),
    note: normalizeString(values.note),
  }
}

function regenerateCode(setFieldValue: SetFieldValue) {
  setFieldValue('code', buildGiftCouponCode(new Date()), true)
}

function submit(values: Record<string, unknown>) {
  emit('submit', normalizeSubmitValues(values))
}
</script>

<template>
  <Form
    :key="formKey"
    class="card border-0 shadow-sm p-3"
    :initial-values="initialValues"
    :validation-schema="schema"
    @submit="submit"
    v-slot="{ values, isSubmitting, setFieldValue, submitCount, errors }"
  >
    <p class="fw-semibold mb-2">{{ cardTitle }}</p>

    <div class="row g-3">
      <div class="col-12 col-md-7">
        <label class="form-label d-flex align-items-center justify-content-between gap-2">
          <span>Codice coupon</span>
          <Btn type="button" icon="autorenew" color="secondary" variant="outline" @click="regenerateCode(setFieldValue)">
            Rigenera
          </Btn>
        </label>
        <Field name="code" class="form-control text-uppercase" readonly />
        <ErrorMessage name="code" class="text-danger small d-block mt-1" />
      </div>

      <div class="col-12 col-md-5">
        <label class="form-label">Da (nome completo)</label>
        <Field name="from" class="form-control" placeholder="Es. Laura Bianchi" />
        <ErrorMessage name="from" class="text-danger small d-block mt-1" />
      </div>

      <div class="col-12 col-md-6">
        <label class="form-label">Cliente destinatario</label>
        <Field name="client_id" as="select" class="form-select">
          <option value="">Seleziona cliente</option>
          <option v-for="client in sortedClients" :key="client.id" :value="client.id">
            {{ clientLabel(client) }}
          </option>
        </Field>
        <ErrorMessage name="client_id" class="text-danger small d-block mt-1" />
      </div>

      <div class="col-12 col-md-3">
        <label class="form-label">Valido dal</label>
        <Field name="valid_from" type="date" class="form-control" />
        <ErrorMessage name="valid_from" class="text-danger small d-block mt-1" />
      </div>

      <div class="col-12 col-md-3">
        <label class="form-label">Valido fino al</label>
        <Field name="valid_to" type="date" class="form-control" />
        <ErrorMessage name="valid_to" class="text-danger small d-block mt-1" />
      </div>

      <div class="col-12">
        <label class="form-label d-flex align-items-center justify-content-between gap-2">
          <span>Trattamenti regalo</span>
          <span class="badge text-bg-light border">
            Totale trattamenti {{ formatCurrency(estimateTreatmentsTotal(values)) }}
          </span>
        </label>
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
            :class="{ 'chip--active': isTreatmentSelected(treatment.id, values) }"
            @click="toggleTreatment(treatment.id, values, setFieldValue)"
          >
            {{ treatment.title }} ({{ treatment.duration }}m | {{ formatCurrency(treatment.price) }})
          </button>
        </div>
        <small v-if="!filteredTreatments.length" class="text-muted d-block mt-1">Nessun trattamento trovato.</small>
        <small v-if="submitCount > 0 && errors.trattamenti" class="text-danger d-block mt-1">
          {{ errors.trattamenti }}
        </small>
      </div>

      <div class="col-12">
        <label class="form-label">Messaggio opzionale</label>
        <Field name="note" as="textarea" rows="3" class="form-control" placeholder="Aggiungi una dedica personalizzata..." />
        <ErrorMessage name="note" class="text-danger small d-block mt-1" />
      </div>
    </div>

    <div class="d-flex gap-2 mt-3 flex-wrap">
      <Btn type="submit" color="dark" icon="save" :loading="isSubmitting || loading">
        {{ submitLabel }}
      </Btn>
      <Btn v-if="showCancel" type="button" color="secondary" variant="outline" icon="close" @click="emit('cancel')">
        Annulla
      </Btn>
    </div>
  </Form>
</template>

<style scoped lang="scss">
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

.chip--active {
  background: rgba(232, 179, 190, 0.45);
  border-color: rgba(84, 44, 58, 0.58);
}
</style>

