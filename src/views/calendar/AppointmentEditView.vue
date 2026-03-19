<script setup lang="ts">
import { Accordion, Btn, FieldTiptap, cicKitStore, toast } from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { Timestamp } from 'firebase/firestore'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { callAvailabilityAgent } from '../../call/callAvailabilityAgent'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { Auth } from '../../main'
import type { Appointment } from '../../models/Appointment'
import { appConfigStore } from '../../stores/appConfigStore'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { couponStore } from '../../stores/couponStore'
import { publicUserStore } from '../../stores/publicUser'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { treatmentStore } from '../../stores/treatmentStore'
import { appointmentPersonalOwnerId, isPersonalAppointment } from '../../utils/appointmentVisibility'
import { computeAppointmentDurationMinutes, fromDateTimeLocalValue, toDateTimeLocalValue } from '../../utils/calendar'
import { asDate } from '../../utils/date'
import { buildCouponUsageCountMap, couponDisplayTitle, couponRemainingUses } from '../../utils/couponUtils'
import { hasAiAndOperatorAccess, hasBetaFeaturesAccess } from '../../utils/permissions'
import { matchesPhoneSearch } from '../../utils/phone'
import { whatsAppTemplateStore } from '../../stores/whatsAppTemplateStore'
import {
  formatWhatsAppDate,
  formatWhatsAppDay,
  formatWhatsAppDuration,
  formatWhatsAppPrice,
  formatWhatsAppTime,
  normalizeWhatsAppPhoneNumber,
} from '../../utils/whatsapp'
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
  total: number | string
  fix_duration: number | string
  isPersonal: boolean
  isPublic: boolean
  coupon_id: string
}

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const canUseAvailabilityAi = computed(() => hasAiAndOperatorAccess())
const canUseAvailabilityAgent = computed(() => canUseAvailabilityAi.value && hasBetaFeaturesAccess())

const current = ref<Appointment | undefined>(undefined)
const isLoading = ref(false)
const isDeleting = ref(false)
const isEditMode = ref(false)
const selectedTreatmentIds = ref<string[]>([])
const selectedOperatorIds = ref<string[]>([])
const initialTreatmentIds = ref<string[]>([])
const initialTreatmentsTotal = ref(0)
const initialAppointmentTotal = ref(0)
const shouldForceTotalReentry = ref(false)
const aiSuggestions = ref<Array<{ start: string; end: string; reason: string }>>([])
const aiClientContext = ref<{ previousAppointmentAt?: string; nextAppointmentAt?: string; totalAppointments: number } | undefined>()
const isAiLoading = ref(false)
const clientSearch = ref('')
const treatmentSearch = ref('')
const sendWhatsAppOnSave = ref(true)
const sendWhatsAppOnDelete = ref(true)

const routeId = computed(() => String(route.params.id ?? '').trim())
const isCreateMode = computed(() => !routeId.value || routeId.value === 'new')
const saveWhatsAppLabel = computed(() => (isCreateMode.value ? 'Invia conferma WhatsApp' : 'Invia aggiornamento WhatsApp'))

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
    total: yup
      .number()
      .transform((value, originalValue) => {
        const raw = String(originalValue ?? '').trim().replace(',', '.')
        if (!raw) return Number.NaN
        const normalized = Number(raw)
        return Number.isFinite(normalized) ? normalized : value
      })
      .typeError('Numero non valido')
      .min(0, 'Prezzo non valido')
      .when('isPersonal', {
        is: false,
        then: (value) => value.required('Prezzo obbligatorio'),
        otherwise: (value) => value.default(0),
      }),
    fix_duration: yup.number().typeError('Numero non valido').min(-FIX_DURATION_LIMIT_MINUTES).max(FIX_DURATION_LIMIT_MINUTES).default(0),
    isPersonal: yup.boolean().required(),
    isPublic: yup.boolean().default(false),
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
    total: Number(current.value?.total ?? estimateTreatmentsAmount()),
    fix_duration: clampFixDuration(current.value?.fix_duration ?? 0),
    isPersonal: Boolean(current.value ? isPersonalAppointment(current.value) : false),
    isPublic: Boolean(current.value?.isPublic),
    coupon_id: String(current.value?.coupon_id ?? ''),
  }
})
const shouldOpenNotesAccordion = computed(() => hasMeaningfulNote(initialValues.value.notes))

const treatmentsById = computed(() => new Map(treatmentStore.itemsActiveArray.map((item) => [item.id, item])))
const treatmentCategoryEmojiById = computed(() => {
  return new Map(
    treatmentCategoryStore.itemsActiveArray.map((category) => [
      category.id,
      String(category.emoji ?? '').trim(),
    ]),
  )
})
const clientsById = computed(() => new Map(clientStore.itemsActiveArray.map((item) => [item.id, item])))
const operatorUsers = computed(() => publicUserStore.itemsActiveArray.filter((item) => Boolean(item.operatore)))
const operatorsById = computed(() => new Map(operatorUsers.value.map((item) => [item.id, item])))
const sortedClients = computed(() => {
  return [...clientStore.itemsActiveArray].sort((a, b) =>
    `${normalizeString(a.name)} ${normalizeString(a.surname)}`.localeCompare(
      `${normalizeString(b.name)} ${normalizeString(b.surname)}`,
      'it',
    ),
  )
})
const filteredClients = computed(() => {
  const search = normalizeString(clientSearch.value).toLocaleLowerCase()
  if (!search) return sortedClients.value

  return sortedClients.value.filter((client) => {
    const textLabel = `${client.name} ${client.surname} ${client.email ?? ''}`.toLocaleLowerCase()
    if (textLabel.includes(search)) return true
    return matchesPhoneSearch(client.phone_number, search)
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
const couponUsageById = computed(() => buildCouponUsageCountMap(appointmentStore.itemsActiveArray))
const currentCouponId = computed(() => normalizeString(current.value?.coupon_id))
const selectableCoupons = computed(() => {
  const now = new Date()
  return couponStore.itemsActiveArray.filter((coupon) => {
    if (!coupon.active) return false
    const from = asDate(coupon.valid_from)
    if (from && from.getTime() > now.getTime()) return false
    const to = asDate(coupon.valid_to)
    if (to && to.getTime() < now.getTime()) return false

    const keepCurrentUsage = currentCouponId.value === coupon.id ? 1 : 0
    return couponRemainingUses(coupon, couponUsageById.value, keepCurrentUsage) > 0
  })
})

const currentClientId = computed(() => normalizeString(current.value?.client_id ?? current.value?.user_id))
const currentClient = computed(() => {
  const clientId = currentClientId.value
  if (!clientId) return undefined
  return clientsById.value.get(clientId)
})

const currentPrimaryOperatorId = computed(() => {
  if (!current.value) return ''
  const personalOwnerId = appointmentPersonalOwnerId(current.value)
  if (personalOwnerId) return personalOwnerId
  return normalizeString((current.value.operator_ids ?? [])[0])
})
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
const currentClientPath = computed(() => clientDetailPath(currentClientId.value))

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
  return couponDisplayTitle(coupon)
})
const currentCouponPath = computed(() => {
  const couponId = normalizeString(current.value?.coupon_id)
  if (!couponId) return ''
  return `/coupons/${encodeURIComponent(couponId)}`
})

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function clientDetailPath(clientId: unknown) {
  const normalized = normalizeString(clientId)
  if (!normalized) return ''
  return `/clients/${encodeURIComponent(normalized)}`
}

function openClientDetail(clientId: unknown) {
  const targetPath = clientDetailPath(clientId)
  if (!targetPath) return
  router.push(targetPath)
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

function hasMeaningfulNote(value: unknown) {
  const normalized = normalizeString(value)
  if (!normalized || normalized === EMPTY_NOTE_HTML || normalized === '<p><br></p>') return false

  const plainText = normalized
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim()

  return plainText.length > 0
}

function defaultUpdateBy() {
  return normalizeString(Auth.user?.email ?? Auth.uid ?? 'admin')
}

function clientLabel(clientId: string) {
  const client = clientStore.findItemsById(clientId)
  if (!client) return clientId
  return `${client.name} ${client.surname}`.trim()
}

function clientAccordionHeaderLabel(values: Record<string, unknown>) {
  const clientId = normalizeString(values.client_id)
  if (!clientId) return ''
  return clientLabel(clientId)
}

function treatmentPrimaryEmojiForId(treatmentId: string) {
  const treatment = treatmentsById.value.get(normalizeString(treatmentId))
  if (!treatment) return ''
  for (const categoryId of treatment.categoryIds ?? []) {
    const emoji = String(treatmentCategoryEmojiById.value.get(categoryId) ?? '').trim()
    if (emoji) return emoji
  }
  return ''
}

const selectedTreatmentsHeaderEmojis = computed(() => {
  return selectedTreatmentIds.value
    .map((id) => treatmentPrimaryEmojiForId(id))
    .filter(Boolean)
})

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

function estimateTreatmentsAmountForIds(ids: string[]) {
  const total = ids
    .map((id) => normalizeNumber(treatmentsById.value.get(id)?.price, 0))
    .filter((value) => Number.isFinite(value))
    .reduce((sum, current) => sum + current, 0)
  return roundCurrency(Math.max(0, total))
}

function estimateTreatmentsAmount() {
  return estimateTreatmentsAmountForIds(selectedTreatmentIds.value)
}

function normalizePriceValue(value: unknown) {
  const raw = String(value ?? '').trim().replace(',', '.')
  if (!raw) return undefined
  const normalized = Number(raw)
  if (!Number.isFinite(normalized)) return undefined
  return roundCurrency(Math.max(0, normalized))
}

function estimateFinalAmount(values: Record<string, unknown>) {
  return roundCurrency(Math.max(0, normalizePriceValue(values.total) ?? 0))
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(normalizeNumber(value, 0))
}

type AppointmentWhatsAppContext = {
  phoneNumber: string
  placeholders: Record<string, string>
}

function appointmentCenterAddress() {
  const address = normalizeString(appConfigStore.getConfigData().officeAddress)
  return address || 'Via Enrico de Nicola, 16'
}

function treatmentTitlesFromIds(ids: string[]) {
  return ids
    .map((id) => normalizeString(treatmentsById.value.get(id)?.title ?? id))
    .filter(Boolean)
}

function buildWhatsAppContextFromForm(values: Record<string, unknown>) {
  const clientId = normalizeString(values.client_id)
  if (!clientId) return undefined

  const client = clientsById.value.get(clientId)
  const phoneNumber = normalizeWhatsAppPhoneNumber(client?.phone_number)
  if (!phoneNumber) return undefined

  const startDate = fromDateTimeLocalValue(normalizeString(values.date_time))
  if (!startDate) return undefined

  const durationMinutes = estimateDurationForFix(values.fix_duration)
  const normalizedTotal = normalizePriceValue(values.total) ?? 0
  const treatments = treatmentTitlesFromIds(normalizeUniqueIds(selectedTreatmentIds.value))

  return {
    phoneNumber,
    placeholders: {
      '[NOME]': normalizeString(client?.name) || 'Cliente',
      '[COGNOME]': normalizeString(client?.surname),
      '[GIORNO]': formatWhatsAppDay(startDate),
      '[DATA]': formatWhatsAppDate(startDate),
      '[ORA]': formatWhatsAppTime(startDate),
      '[DURATA]': formatWhatsAppDuration(durationMinutes),
      '[PREZZO]': formatWhatsAppPrice(normalizedTotal),
      '[TRATTAMENTI]': treatments.join(', '),
      '[INDIRIZZO]': appointmentCenterAddress(),
    },
  } satisfies AppointmentWhatsAppContext
}

function buildWhatsAppContextFromCurrentAppointment() {
  if (!current.value) return undefined
  const clientId = normalizeString(current.value.client_id ?? current.value.user_id)
  if (!clientId) return undefined

  const client = clientsById.value.get(clientId)
  const phoneNumber = normalizeWhatsAppPhoneNumber(client?.phone_number)
  if (!phoneNumber) return undefined

  const startDate = asDate(current.value.date_time)
  if (!startDate) return undefined

  const durationMinutes = computeAppointmentDurationMinutes(
    current.value,
    treatmentsById.value,
    appConfigStore.getConfigData().defaultAppointmentDurationMinutes,
  )
  const treatments = treatmentTitlesFromIds(current.value.treatment_ids ?? [])

  return {
    phoneNumber,
    placeholders: {
      '[NOME]': normalizeString(client?.name) || 'Cliente',
      '[COGNOME]': normalizeString(client?.surname),
      '[GIORNO]': formatWhatsAppDay(startDate),
      '[DATA]': formatWhatsAppDate(startDate),
      '[ORA]': formatWhatsAppTime(startDate),
      '[DURATA]': formatWhatsAppDuration(durationMinutes),
      '[PREZZO]': formatWhatsAppPrice(current.value.total),
      '[TRATTAMENTI]': treatments.join(', '),
      '[INDIRIZZO]': appointmentCenterAddress(),
    },
  } satisfies AppointmentWhatsAppContext
}

function sendWhatsAppForAction(action: 'confirmation' | 'update' | 'delete', context?: AppointmentWhatsAppContext) {
  if (!context) {
    toast.warning('WhatsApp non inviato: numero cliente mancante o non valido.')
    return false
  }

  const message = whatsAppTemplateStore.buildMessage(action, context.placeholders)
  const sent = whatsAppTemplateStore.sendWhatsApp(message, context.phoneNumber)

  if (!sent) {
    toast.warning('WhatsApp non inviato: impossibile aprire la chat.')
    return false
  }

  return true
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

function isMissingPrice(values: Record<string, unknown>) {
  return normalizePriceValue(values.total) === undefined
}

function isInitialPriceDifferenceActive() {
  const difference = roundCurrency(initialAppointmentTotal.value - initialTreatmentsTotal.value)
  return Math.abs(difference) > 0.001
}

function initialPriceDifference() {
  return roundCurrency(initialAppointmentTotal.value - initialTreatmentsTotal.value)
}

function priceDiffMeta(totalValue: unknown, treatmentsTotal = estimateTreatmentsAmount()) {
  const normalizedTotal = normalizePriceValue(totalValue)
  if (normalizedTotal === undefined) {
    return {
      amount: 0,
      label: 'Da definire',
      icon: 'help',
      colorClass: 'price-diff-badge--missing',
    }
  }

  const diff = roundCurrency(normalizedTotal - treatmentsTotal)
  if (diff > 0) {
    return {
      amount: diff,
      label: `+${formatCurrency(diff)}`,
      icon: 'arrow_upward',
      colorClass: 'price-diff-badge--up',
    }
  }
  if (diff < 0) {
    return {
      amount: diff,
      label: `-${formatCurrency(Math.abs(diff))}`,
      icon: 'arrow_downward',
      colorClass: 'price-diff-badge--down',
    }
  }
  return {
    amount: 0,
    label: formatCurrency(0),
    icon: 'arrow_forward',
    colorClass: 'price-diff-badge--same',
  }
}

function resetTotalToTreatments(setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void) {
  shouldForceTotalReentry.value = false
  setFieldValue('total', estimateTreatmentsAmount(), true)
}

function applyDiscountPercent(
  percent: number,
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void,
) {
  const base = estimateTreatmentsAmount()
  const discountAmount = roundCurrency((base * percent) / 100)
  shouldForceTotalReentry.value = false
  setFieldValue('total', roundCurrency(Math.max(0, base - discountAmount)), true)
}

function applyDiscountRound(
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void,
) {
  const base = estimateTreatmentsAmount()
  const remainder = roundCurrency(base % 5)
  const discountAmount = remainder > 0 && remainder <= 3 ? remainder : 0
  shouldForceTotalReentry.value = false
  setFieldValue('total', roundCurrency(Math.max(0, base - discountAmount)), true)
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

function shouldAutoUpdateTotal(values: Record<string, unknown>, previousTreatmentsTotal: number) {
  if (shouldForceTotalReentry.value) return false
  const currentTotal = normalizePriceValue(values.total)
  if (currentTotal === undefined) return false
  return Math.abs(roundCurrency(currentTotal - previousTreatmentsTotal)) <= 0.001
}

function shouldForceTotalResetOnTreatmentAdd(wasAdded: boolean, nextTreatmentsCount: number) {
  if (!wasAdded) return false
  if (isCreateMode.value || !current.value) return false
  if (!isInitialPriceDifferenceActive()) return false
  return nextTreatmentsCount > initialTreatmentIds.value.length
}

function toggleTreatment(
  id: string,
  values: Record<string, unknown>,
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void,
) {
  const normalized = normalizeString(id)
  if (!normalized) return

  const previousSelection = [...selectedTreatmentIds.value]
  const previousTreatmentsTotal = estimateTreatmentsAmountForIds(previousSelection)
  const alreadySelected = previousSelection.includes(normalized)

  if (alreadySelected) {
    selectedTreatmentIds.value = previousSelection.filter((value) => value !== normalized)
  } else {
    selectedTreatmentIds.value = [...previousSelection, normalized]
  }

  const nextTreatmentsTotal = estimateTreatmentsAmount()
  if (shouldForceTotalResetOnTreatmentAdd(!alreadySelected, selectedTreatmentIds.value.length)) {
    shouldForceTotalReentry.value = true
    setFieldValue('total', '', true)
    return
  }

  if (shouldAutoUpdateTotal(values, previousTreatmentsTotal)) {
    setFieldValue('total', nextTreatmentsTotal, true)
  }
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
    void router.replace({ name: 'home' })
    return
  }
  isEditMode.value = false
}

async function loadItem() {
  aiSuggestions.value = []
  aiClientContext.value = undefined
  sendWhatsAppOnSave.value = true
  sendWhatsAppOnDelete.value = true

  if (isCreateMode.value) {
    current.value = undefined
    selectedTreatmentIds.value = []
    initialTreatmentIds.value = []
    initialTreatmentsTotal.value = 0
    initialAppointmentTotal.value = 0
    shouldForceTotalReentry.value = false
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
    initialTreatmentIds.value = [...selectedTreatmentIds.value]
    initialTreatmentsTotal.value = estimateTreatmentsAmount()
    initialAppointmentTotal.value = roundCurrency(normalizePriceValue(current.value.total) ?? initialTreatmentsTotal.value)
    shouldForceTotalReentry.value = false
    const personalOwnerId = appointmentPersonalOwnerId(current.value)
    selectedOperatorIds.value = normalizeUniqueIds([
      personalOwnerId,
      ...(current.value.operator_ids ?? []),
    ])
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
  const isPublic = isPersonal ? Boolean(values.isPublic) : true
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
  const personalOwnerId = isPersonal ? normalizeString(normalizedOperators[0] ?? Auth.uid) : ''
  if (isPersonal && !personalOwnerId) {
    toast.error('Impossibile salvare un appuntamento personale senza proprietario')
    return
  }
  if (isPersonal) {
    const normalizedForPersonal = normalizeUniqueIds([personalOwnerId, ...normalizedOperators])
    normalizedOperators.splice(0, normalizedOperators.length, ...normalizedForPersonal)
  }

  const normalizedNotes = normalizeNoteForSave(values.notes)
  const notes = isPersonal && !normalizedNotes ? PERSONAL_DEFAULT_NOTE : normalizedNotes
  const normalizedTotal = isPersonal ? 0 : normalizePriceValue(values.total)
  const saveWhatsAppContext = !isPersonal ? buildWhatsAppContextFromForm(values) : undefined
  const shouldSendWhatsApp = !isPersonal && sendWhatsAppOnSave.value
  if (!isPersonal && normalizedTotal === undefined) {
    toast.error('Inserisci un prezzo totale valido')
    return
  }

  const payload = {
    date_time: Timestamp.fromDate(startDate),
    user_id: clientId || undefined,
    client_id: clientId || undefined,
    treatment_ids: isPersonal ? [] : normalizedTreatments,
    product_ids: current.value?.product_ids ?? [],
    operator_ids: normalizedOperators,
    personalOwnerId: personalOwnerId || undefined,
    isPublic,
    isPersonal,
    total: isPersonal ? 0 : normalizedTotal,
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
      if (shouldSendWhatsApp) {
        sendWhatsAppForAction('confirmation', saveWhatsAppContext)
      }
      return
    }

    if (!current.value) return
    await current.value.update(payload)
    await loadItem()
    isEditMode.value = false
    toast.success('Appuntamento aggiornato')
    if (shouldSendWhatsApp) {
      sendWhatsAppForAction('update', saveWhatsAppContext)
    }
  } catch (error) {
    console.error(error)
    toast.error('Errore salvataggio appuntamento')
  }
}

async function onDeleteAppointment() {
  if (!current.value || isCreateMode.value || isDeleting.value) return

  const deleteWhatsAppContext = buildWhatsAppContextFromCurrentAppointment()
  const shouldSendDeleteWhatsApp = sendWhatsAppOnDelete.value && !Boolean(current.value.isPersonal)
  const ok = window.confirm('Eliminare definitivamente questo appuntamento?')
  if (!ok) return

  isDeleting.value = true
  try {
    await current.value.delete(appointmentStore)
    toast.success('Appuntamento eliminato')
    await router.replace({ name: 'home' })
    if (shouldSendDeleteWhatsApp) {
      sendWhatsAppForAction('delete', deleteWhatsAppContext)
    }
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
  if (!canUseAvailabilityAgent.value) {
    toast.error('Permessi AI + OPERATORE + beta_feature richiesti')
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
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp :title="isCreateMode ? 'Nuovo appuntamento' : 'Appuntamento'" :to="{ name: 'home' }" />

    <div class="edit-wrapper mx-auto py-3">
      <p v-if="isLoading" class="text-muted small mt-3">Caricamento...</p>

      <Form
        v-else-if="isEditMode && (isCreateMode || current)"
        :key="formKey"
        :validation-schema="schema"
        :initial-values="initialValues"
        @submit="onSubmit"
        v-slot="{ isSubmitting, values, setFieldValue, errors, submitCount }"
        class="card border-0 shadow-sm p-3 p-md-4 form-shell appointment-edit-card"
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

          <div v-if="values.isPersonal" class="col-12">
            <div class="form-check">
              <Field id="appointment-is-public" name="isPublic" type="checkbox" class="form-check-input" />
              <label class="form-check-label" for="appointment-is-public">
                Appuntamento personale visibile a tutti
              </label>
            </div>
            <small class="text-muted d-block mt-1">
              Se non attivo, lo vedra solo l'operatore proprietario.
            </small>
            <ErrorMessage name="isPublic" class="text-danger small d-block mt-1" />
          </div>

          <div v-if="!values.isPersonal" class="col-12">
            <Accordion id="appointment-client-accordion" title="Cliente" :defaultOpen="true" class="appointment-filter-accordion">
              <template #header>
                <div class="accordion-header-row">
                  <div class="accordion-header-meta">
                    <span>Cliente</span>
                    <button
                      v-if="clientAccordionHeaderLabel(values) && normalizeString(values.client_id)"
                      type="button"
                      class="accordion-header-value accordion-header-link"
                      :title="`Apri scheda cliente: ${clientAccordionHeaderLabel(values)}`"
                      @click.stop="openClientDetail(values.client_id)"
                    >
                      {{ clientAccordionHeaderLabel(values) }}
                      <span class="material-symbols-outlined accordion-header-link__icon" aria-hidden="true">arrow_outward</span>
                    </button>
                    <span v-else-if="clientAccordionHeaderLabel(values)" class="accordion-header-value" :title="clientAccordionHeaderLabel(values)">
                      {{ clientAccordionHeaderLabel(values) }}
                    </span>
                  </div>
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
                  <div class="accordion-header-meta">
                    <span>Trattamenti</span>
                    <span
                      v-if="selectedTreatmentsHeaderEmojis.length"
                      class="accordion-header-emojis"
                      aria-label="Tipi trattamenti selezionati"
                    >
                      <span
                        v-for="(emoji, index) in selectedTreatmentsHeaderEmojis"
                        :key="`${emoji}-${index}`"
                        class="accordion-header-emoji"
                        aria-hidden="true"
                      >
                        {{ emoji }}
                      </span>
                    </span>
                  </div>
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
                  @click="toggleTreatment(treatment.id, values, setFieldValue)"
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
            <div class="price-adjust-box mt-1">
              <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
                <label class="form-label mb-0">Prezzo</label>
                <span class="badge text-bg-light border">Totale trattamenti {{ formatCurrency(estimateTreatmentsAmount()) }}</span>
              </div>

              <div class="price-input-row">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary price-reset-btn"
                  aria-label="Reset prezzo"
                  title="Reset prezzo"
                  @click="resetTotalToTreatments(setFieldValue)"
                >
                  <span class="material-symbols-outlined" aria-hidden="true">restart_alt</span>
                </button>
                <Field name="total" type="number" step="0.01" inputmode="decimal" class="form-control" />
                <span class="badge price-diff-badge" :class="priceDiffMeta(values.total).colorClass">
                  <span class="material-symbols-outlined price-diff-badge__icon" aria-hidden="true">{{ priceDiffMeta(values.total).icon }}</span>
                  {{ priceDiffMeta(values.total).label }}
                </span>
              </div>
              <ErrorMessage name="total" class="text-danger small d-block mt-1" />

              <div
                v-if="shouldForceTotalReentry && isMissingPrice(values) && isInitialPriceDifferenceActive()"
                class="price-reentry-hint mt-2"
              >
                <span>Con {{ initialTreatmentIds.length }} trattamenti il totale era {{ formatCurrency(initialAppointmentTotal) }}</span>
                <span class="badge price-diff-badge" :class="priceDiffMeta(initialAppointmentTotal, initialTreatmentsTotal).colorClass">
                  <span class="material-symbols-outlined price-diff-badge__icon" aria-hidden="true">
                    {{ priceDiffMeta(initialAppointmentTotal, initialTreatmentsTotal).icon }}
                  </span>
                  {{ initialPriceDifference() >= 0 ? 'Extra' : 'Sconto' }} {{ priceDiffMeta(initialAppointmentTotal, initialTreatmentsTotal).label }}
                </span>
              </div>

              <div class="d-flex flex-wrap gap-1 mt-2">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary discount-preset-btn"
                  @click="applyDiscountPercent(10, setFieldValue)"
                >
                  10%
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary discount-preset-btn"
                  @click="applyDiscountPercent(20, setFieldValue)"
                >
                  20%
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary discount-preset-btn"
                  @click="applyDiscountPercent(50, setFieldValue)"
                >
                  50%
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary discount-preset-btn"
                  @click="applyDiscountPercent(100, setFieldValue)"
                >
                  100%
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-dark discount-preset-btn"
                  aria-label="Arrotonda"
                  title="Arrotonda"
                  @click="applyDiscountRound(setFieldValue)"
                >
                  <span class="material-symbols-outlined discount-preset-icon" aria-hidden="true">payment_arrow_down</span>
                </button>
              </div>
            </div>
          </div>

          <div v-if="!values.isPersonal" class="col-12">
            <label class="form-label">Coupon</label>
            <Field name="coupon_id" as="select" class="form-select">
              <option value="">Nessuno</option>
              <option v-for="coupon in selectableCoupons" :key="coupon.id" :value="coupon.id">
                {{ couponDisplayTitle(coupon) }}
              </option>
            </Field>
            <ErrorMessage name="coupon_id" class="text-danger small" />
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

          <div v-if="values.isPersonal" class="col-12">
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

          <div v-else class="col-12">
            <Accordion
              id="appointment-notes-accordion"
              title="Note"
              :defaultOpen="shouldOpenNotesAccordion"
              class="appointment-filter-accordion"
            >
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
            </Accordion>
          </div>

        </div>

        <div v-if="canUseAvailabilityAgent && !values.isPersonal" class="card border-0 bg-light mt-3 p-3">
          <div class="d-flex justify-content-between align-items-center gap-2">
            <strong>Agente disponibilita</strong>
            <Btn type="button" color="dark" icon="psychology" :loading="isAiLoading" @click="requestAiSuggestions(values)">
              Suggerisci slot
            </Btn>
          </div>
          <small class="text-muted d-block mt-1">
            Richiede permessi AI + OPERATORE + beta_feature. Tiene conto di trattamenti e durata stimata.
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

        <div v-if="!values.isPersonal" class="summary-compact mt-3">
          <div class="summary-compact__metrics">
            <div>
              Durata totale:
              <strong>{{ estimateDurationForFix(values.fix_duration) }} min</strong>
            </div>
            <div>
              Costo finale:
              <strong>{{ formatCurrency(estimateFinalAmount(values)) }}</strong>
              <span class="badge price-diff-badge ms-1" :class="priceDiffMeta(values.total).colorClass">
                <span class="material-symbols-outlined price-diff-badge__icon" aria-hidden="true">{{ priceDiffMeta(values.total).icon }}</span>
                {{ priceDiffMeta(values.total).label }}
              </span>
            </div>
          </div>
          <div class="summary-compact__meta text-muted">
            <span><strong>Cliente:</strong> {{ summaryClientLabel(values) }}</span>
            <span><strong>Giorno:</strong> {{ summaryDayLabel(values) }}</span>
            <span><strong>Trattamenti:</strong> {{ summaryTreatmentsLabel() }}</span>
          </div>
        </div>

        <div v-if="!values.isPersonal" class="whatsapp-automation-box mt-3">
          <div class="whatsapp-automation-box__content">
            <p class="whatsapp-automation-box__title mb-0">{{ saveWhatsAppLabel }}</p>

            <label class="whatsapp-toggle" for="appointment-send-whatsapp-on-save">
              <input
                id="appointment-send-whatsapp-on-save"
                v-model="sendWhatsAppOnSave"
                type="checkbox"
                class="whatsapp-toggle__input"
              />
              <span class="whatsapp-toggle__track">
                <span class="whatsapp-toggle__thumb">
                  <span class="material-symbols-outlined" aria-hidden="true">
                    {{ sendWhatsAppOnSave ? 'check' : 'close' }}
                  </span>
                </span>
              </span>
            </label>
          </div>
        </div>

        <div class="d-flex gap-2 mt-4 flex-wrap appointment-primary-actions">
          <Btn type="submit" color="dark" icon="save" :loading="isSubmitting || isDeleting">
            {{ isCreateMode ? 'Crea' : 'Salva' }}
          </Btn>
          <Btn type="button" color="secondary" variant="outline" icon="close" :disabled="isSubmitting" @click="onCancelEdit">
            Annulla
          </Btn>
        </div>

        <article v-if="!isCreateMode" class="appointment-secondary-actions mt-5">
          <div class="appointment-secondary-actions__header">
            <p class="appointment-secondary-actions__title mb-1">Azioni accessorie</p>
            <p class="appointment-secondary-actions__subtitle mb-0">
              Impostazioni di invio e cancellazione appuntamento: operazioni delicate ma importanti.
            </p>
          </div>

          <div class="appointment-secondary-actions__body">
            <div class="appointment-secondary-actions__toggle-wrap">
              <span class="appointment-secondary-actions__toggle-label">Invia WhatsApp su elimina</span>
              <label class="whatsapp-toggle whatsapp-toggle--compact" for="appointment-send-whatsapp-on-delete-edit">
                <input
                  id="appointment-send-whatsapp-on-delete-edit"
                  v-model="sendWhatsAppOnDelete"
                  type="checkbox"
                  class="whatsapp-toggle__input"
                  :disabled="values.isPersonal"
                />
                <span class="whatsapp-toggle__track">
                  <span class="whatsapp-toggle__thumb">
                    <span class="material-symbols-outlined" aria-hidden="true">
                      {{ sendWhatsAppOnDelete ? 'check' : 'close' }}
                    </span>
                  </span>
                </span>
              </label>
            </div>
            <small v-if="values.isPersonal" class="appointment-secondary-actions__helper text-muted">
              Gli appuntamenti personali non prevedono invio WhatsApp.
            </small>

            <Btn
              type="button"
              color="danger"
              icon="delete"
              class="appointment-secondary-actions__delete-btn"
              :loading="isDeleting"
              :disabled="isSubmitting"
              @click="onDeleteAppointment"
            >
              Elimina appuntamento
            </Btn>
          </div>
        </article>
      </Form>

      <div v-else-if="current" class="view-shell">
        <AppointmentDetailsCard
          :date-label="currentDateLabel"
          :time-label="currentTimeLabel"
          :duration-minutes="currentDurationMinutes"
          :client-label="currentClientLabel"
          :client-path="currentClientPath"
          :operator-label="currentOperatorLabel"
          :treatments-label="currentTreatmentsLabel"
          :coupon-label="currentCouponLabel"
          :coupon-path="currentCouponPath"
          :total="current.total"
          :is-personal="current.isPersonal"
          :is-public="current.isPublic"
          :notes="current.notes"
          :reminded="current.reminded"
          class="appointment-main-card mx-auto"
        >
          <template #actions>
            <Btn type="button" color="dark" icon="edit" @click="enterEditMode">Modifica</Btn>
          </template>
        </AppointmentDetailsCard>

        <div class="view-shell__section-header">
          <p class="view-shell__section-title mb-1">Dettagli correlati</p>
          <p class="view-shell__section-subtitle mb-0">Scheda cliente e operatore principale associato all'appuntamento.</p>
        </div>

        <div class="row g-3">
          <div class="col-12 col-md-6">
            <div
              v-if="currentClient"
              class="client-preview-tile"
              role="link"
              tabindex="0"
              :aria-label="`Apri dettaglio cliente ${currentClient.name} ${currentClient.surname}`"
              @click="openClientDetail(currentClient.id)"
              @keydown.enter.prevent="openClientDetail(currentClient.id)"
              @keydown.space.prevent="openClientDetail(currentClient.id)"
            >
              <ClientPersonCard
                :name="currentClient.name"
                :surname="currentClient.surname"
                :gender="currentClient.gender"
                :phone-number="currentClient.phone_number"
                :email="currentClient.email"
                :birthdate="currentClient.birthdate"
                :note="currentClient.note"
                :consenso-promozioni-whatsapp="currentClient.consenso_promozioni_whatsapp"
                :show-details="true"
                compact
              />
              <div class="client-preview-tile__cta">
                Apri scheda cliente
                <span class="material-symbols-outlined client-preview-tile__cta-icon" aria-hidden="true">arrow_outward</span>
              </div>
            </div>
            <article v-else class="card border-0 shadow-sm p-3 h-100 view-info-card">
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

.appointment-edit-card {
  border-radius: 0.9rem;
}

.view-shell {
  max-width: 900px;
  margin-inline: auto;
  display: grid;
  gap: 0.95rem;
}

.appointment-main-card {
  max-width: 100%;
}

.view-info-card {
  border-radius: 0.7rem;
}

.view-shell__section-header {
  display: grid;
  gap: 0.2rem;
  margin-top: 0.2rem;
}

.view-shell__section-title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #5b3744;
}

.view-shell__section-subtitle {
  font-size: 0.83rem;
  color: #6b5a60;
}

.client-preview-tile {
  position: relative;
  border-radius: 0.72rem;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.client-preview-tile:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(36, 68, 95, 0.13);
}

.client-preview-tile:focus-visible {
  outline: 2px solid rgba(35, 68, 95, 0.38);
  outline-offset: 2px;
}

.client-preview-tile__cta {
  position: absolute;
  right: 0.6rem;
  bottom: 0.55rem;
  display: inline-flex;
  align-items: center;
  gap: 0.18rem;
  border: 1px solid rgba(35, 68, 95, 0.25);
  border-radius: 999px;
  padding: 0.12rem 0.42rem;
  font-size: 0.68rem;
  font-weight: 600;
  color: #23445f;
  background: rgba(255, 255, 255, 0.9);
  pointer-events: none;
}

.client-preview-tile__cta-icon {
  font-size: 0.76rem;
  line-height: 1;
}

.whatsapp-automation-box {
  border: 1px solid rgba(37, 126, 62, 0.28);
  border-radius: 0.6rem;
  background:
    radial-gradient(circle at 14% 12%, rgba(37, 211, 102, 0.2) 0%, transparent 58%),
    linear-gradient(165deg, rgba(255, 255, 255, 0.92) 0%, rgba(243, 252, 246, 0.9) 100%);
  padding: 0.45rem 0.5rem;
  width: fit-content;
  max-width: 100%;
}

.whatsapp-automation-box__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
}

.whatsapp-automation-box__title {
  font-size: 0.76rem;
  font-weight: 700;
  color: #1b5f2f;
}

.whatsapp-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.whatsapp-toggle__input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.whatsapp-toggle__track {
  width: 66px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(37, 126, 62, 0.4);
  padding: 3px;
  background: rgba(112, 129, 116, 0.35);
  display: inline-flex;
  align-items: center;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.whatsapp-toggle__thumb {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #fff;
  color: #607070;
  box-shadow: 0 3px 8px rgba(15, 43, 24, 0.26);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateX(0);
  transition: transform 0.2s ease, background-color 0.2s ease, color 0.2s ease;
}

.whatsapp-toggle__thumb .material-symbols-outlined {
  font-size: 0.95rem;
  line-height: 1;
}

.whatsapp-toggle__input:checked + .whatsapp-toggle__track {
  background: linear-gradient(135deg, rgba(37, 211, 102, 0.32) 0%, rgba(9, 177, 66, 0.5) 100%);
  border-color: rgba(20, 138, 58, 0.58);
}

.whatsapp-toggle__input:checked + .whatsapp-toggle__track .whatsapp-toggle__thumb {
  transform: translateX(32px);
  background: #1fa748;
  color: #fff;
}

.whatsapp-toggle__input:focus-visible + .whatsapp-toggle__track {
  outline: 2px solid rgba(31, 167, 72, 0.52);
  outline-offset: 2px;
}

.whatsapp-toggle__input:disabled + .whatsapp-toggle__track {
  opacity: 0.5;
  cursor: not-allowed;
}

.whatsapp-toggle--compact .whatsapp-toggle__track {
  width: 56px;
  height: 30px;
}

.whatsapp-toggle--compact .whatsapp-toggle__thumb {
  width: 24px;
  height: 24px;
}

.whatsapp-toggle--compact .whatsapp-toggle__input:checked + .whatsapp-toggle__track .whatsapp-toggle__thumb {
  transform: translateX(26px);
}

.appointment-primary-actions {
  align-items: center;
}

.appointment-secondary-actions {
  border: 1px solid rgba(220, 53, 69, 0.26);
  border-radius: 0.85rem;
  padding: 0.9rem 0.95rem;
  background:
    radial-gradient(circle at 10% 12%, rgba(220, 53, 69, 0.12) 0%, transparent 58%),
    linear-gradient(165deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 244, 245, 0.9) 100%);
  box-shadow: 0 6px 18px rgba(97, 29, 39, 0.08);
}

.appointment-secondary-actions__header {
  margin-bottom: 0.75rem;
}

.appointment-secondary-actions__title {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #7b2432;
}

.appointment-secondary-actions__subtitle {
  font-size: 0.8rem;
  color: #6d4b52;
  line-height: 1.3;
}

.appointment-secondary-actions__body {
  display: grid;
  gap: 0.75rem;
}

.appointment-secondary-actions__toggle-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  flex-wrap: wrap;
  border: 1px solid rgba(37, 126, 62, 0.2);
  border-radius: 0.65rem;
  padding: 0.48rem 0.58rem;
  background: rgba(247, 253, 249, 0.86);
}

.appointment-secondary-actions__toggle-label {
  font-size: 0.78rem;
  color: #1b5f2f;
  font-weight: 600;
}

.appointment-secondary-actions__helper {
  display: block;
  margin-top: -0.25rem;
  font-size: 0.76rem;
}

.appointment-secondary-actions__delete-btn {
  justify-content: center;
}

@media (max-width: 575.98px) {
  .appointment-secondary-actions__delete-btn {
    width: 100%;
  }
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

.accordion-header-meta {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.34rem 0.45rem;
}

.accordion-header-value {
  max-width: min(42vw, 260px);
  color: #5b3f4b;
  font-size: 0.74rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.accordion-header-link {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  border: 0;
  padding: 0;
  background: transparent;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.accordion-header-link:focus-visible {
  outline: 2px solid rgba(35, 68, 95, 0.35);
  outline-offset: 2px;
  border-radius: 0.2rem;
}

.accordion-header-link__icon {
  font-size: 0.84rem;
  line-height: 1;
}

.accordion-header-emojis {
  display: inline-flex;
  align-items: center;
  gap: 0.12rem;
}

.accordion-header-emoji {
  font-size: 0.92rem;
  line-height: 1;
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
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 0.5rem;
  padding: 0.75rem 0.55rem 0.5rem;
  background: rgba(255, 255, 255, 0.78);
}

.price-input-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.35rem;
  align-items: center;
}

.price-reset-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.price-diff-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  border: 1px solid transparent;
  font-size: 0.72rem;
  font-weight: 600;
}

.price-diff-badge__icon {
  font-size: 0.9rem;
  line-height: 1;
}

.price-diff-badge--up {
  background: rgba(25, 135, 84, 0.12);
  border-color: rgba(25, 135, 84, 0.3);
  color: #0f6b44;
}

.price-diff-badge--down {
  background: rgba(220, 53, 69, 0.12);
  border-color: rgba(220, 53, 69, 0.3);
  color: #9f1f31;
}

.price-diff-badge--same {
  background: rgba(108, 117, 125, 0.11);
  border-color: rgba(108, 117, 125, 0.28);
  color: #495057;
}

.price-diff-badge--missing {
  background: rgba(255, 193, 7, 0.14);
  border-color: rgba(255, 193, 7, 0.35);
  color: #8d6300;
}

.price-reentry-hint {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.76rem;
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

