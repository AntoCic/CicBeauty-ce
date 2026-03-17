<script setup lang="ts">
import {
  Btn,
  FieldFile,
  FieldTiptap,
  cicKitStore,
  getFileExtension,
  normalizeGender,
  toast,
  toFileArray,
  uploadFilesToUrls,
  type FieldFileValue,
  type Gender,
} from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import { Timestamp } from 'firebase/firestore'
import * as yup from 'yup'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppointmentWatchManager } from '../../composables/useAppointmentWatchManager'
import type { Client, ClientDeposit, ClientDepositSettlement } from '../../models/Client'
import { computeFitzpatrickScore, resolveFitzpatrickPhototype } from '../../models/laserSheet'
import { Auth } from '../../main'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { asDate } from '../../utils/date'
import { sanitizePhoneNumberInput } from '../../utils/phone'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import ClientAppointmentCard from './components/ClientAppointmentCard.vue'
import ClientPersonCard from './components/ClientPersonCard.vue'
import { appointmentClientId, buildClientAppointmentSummary, type AppointmentLike } from './clientAppointmentUtils'

const EMPTY_NOTE_HTML = '<p></p>'

type ClientForm = {
  name: string
  surname: string
  phone_number: string
  consenso_promozioni_whatsapp: boolean
  gender: Gender
  email: string
  birthdate: string
  note: string
}

type ClientUpsertPayload = {
  name: string
  surname: string
  phone_number: string
  consenso_promozioni_whatsapp: boolean
  data_consenso_promozioni?: Timestamp | null
  gender: Gender
  email: string
  birthdate: string
  note: string
  updateBy: string
}

type GenderToggleOption = {
  value: 'f' | 'o' | 'm'
  label: string
  className: string
}

type FormSetFieldValue = (field: string, value: unknown, shouldValidate?: boolean) => void

const genderToggleOptions: GenderToggleOption[] = [
  { value: 'f', label: 'F', className: 'gender-segment--f' },
  { value: 'o', label: 'O', className: 'gender-segment--o' },
  { value: 'm', label: 'M', className: 'gender-segment--m' },
]

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const current = ref<Client | undefined>(undefined)
const isLoading = ref(false)
const isDeleting = ref(false)
const isEditMode = ref(false)
const isDeleteClientModalOpen = ref(false)
const isPurchaseModalOpen = ref(false)
const purchaseDraft = ref<ClientDeposit>(emptyDeposit())
const editingPurchaseIndex = ref(-1)
const isPurchaseHeaderEditing = ref(false)
const settlementEditMap = ref<Record<number, boolean>>({})
const isSavingPurchase = ref(false)
const clientFilesValue = ref<FieldFileValue>([])
const isUploadingClientFiles = ref(false)
const isDeletingClientFile = ref(false)

const routeId = computed(() => String(route.params.id ?? '').trim())
const isCreateMode = computed(() => !routeId.value || routeId.value === 'new')
const isCreatingPurchase = computed(() => editingPurchaseIndex.value < 0)
const CLIENT_EDIT_WATCH_SUSPEND_REASON = 'client-edit-view'
const { suspendAppointmentWatch, releaseAppointmentWatch } = useAppointmentWatchManager()

suspendAppointmentWatch(CLIENT_EDIT_WATCH_SUSPEND_REASON)
onBeforeUnmount(() => {
  releaseAppointmentWatch(CLIENT_EDIT_WATCH_SUSPEND_REASON)
})

const schema = toTypedSchema(
  yup.object({
    name: yup.string().required('Campo obbligatorio'),
    surname: yup.string().required('Campo obbligatorio'),
    phone_number: yup.string().matches(/^\+?\d*$/, 'Inserisci solo numeri e +').default(''),
    consenso_promozioni_whatsapp: yup.boolean().default(false),
    gender: yup.string().oneOf(['f', 'm', 'o']).required('Campo obbligatorio').default('f'),
    email: yup.string().email('Email non valida').default(''),
    birthdate: yup.string().default(''),
    note: yup.string().default(EMPTY_NOTE_HTML),
  }),
)

const formKey = computed(() => (isCreateMode.value ? 'client-new' : current.value?.id ?? 'client-edit'))
const initialValues = computed<ClientForm>(() => ({
  name: current.value?.name ?? '',
  surname: current.value?.surname ?? '',
  phone_number: sanitizePhoneNumberInput(current.value?.phone_number ?? ''),
  consenso_promozioni_whatsapp: Boolean(current.value?.consenso_promozioni_whatsapp),
  gender: normalizeGenderForForm(current.value?.gender),
  email: current.value?.email ?? '',
  birthdate: current.value?.birthdate ?? '',
  note: normalizeNoteForEditor(current.value?.note),
}))

const clientAppointments = computed(() => {
  if (!current.value) return []
  const clientId = current.value.id
  return [...appointmentStore.itemsActiveArray]
    .filter((appointment) => appointmentClientId(appointment) === clientId)
    .sort((a, b) => (asDate(b.date_time)?.getTime() ?? 0) - (asDate(a.date_time)?.getTime() ?? 0))
})

const appointmentSummary = computed(() => buildClientAppointmentSummary(clientAppointments.value))
const laserScore = computed(() => computeFitzpatrickScore(current.value?.schedaLaser))
const laserPhototype = computed(() => resolveFitzpatrickPhototype(laserScore.value))
const hasLaserSheet = computed(() => Boolean(current.value?.schedaLaser && Object.keys(current.value.schedaLaser).length))
const laserClarificationCount = computed(() => normalizeStringArray(current.value?.laserShareSkippedKeys).length)
const hasLaserClarifications = computed(() => laserClarificationCount.value > 0)
const clientDisplayName = computed(() => {
  const name = normalizeString(current.value?.name)
  const surname = normalizeString(current.value?.surname)
  return `${name} ${surname}`.trim() || 'questo cliente'
})

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => normalizeString(item)).filter(Boolean))]
}

function onPhoneNumberInput(event: Event, setFieldValue: FormSetFieldValue) {
  if (!(event.target instanceof HTMLInputElement)) return
  setFieldValue('phone_number', sanitizePhoneNumberInput(event.target.value), true)
}

function onPhoneNumberPaste(event: ClipboardEvent, setFieldValue: FormSetFieldValue) {
  const pastedText = event.clipboardData?.getData('text') ?? ''
  if (!pastedText) return
  event.preventDefault()
  setFieldValue('phone_number', sanitizePhoneNumberInput(pastedText), true)
}

function normalizeGenderForForm(value: unknown): Gender {
  const normalized = normalizeGender(value)
  return normalized || 'f'
}

function normalizeNoteForEditor(value: unknown) {
  const normalized = String(value ?? '').trim()
  return normalized || EMPTY_NOTE_HTML
}

function normalizeNoteForSave(value: unknown) {
  const normalized = String(value ?? '').trim()
  return normalized && normalized !== EMPTY_NOTE_HTML ? normalized : ''
}

function normalizeMoney(value: unknown, fallback = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.round(parsed * 100) / 100)
}

function normalizeBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim()
    return normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes'
  }
  return Boolean(value)
}

function toIsoDate(value: unknown, fallback = '') {
  const raw = normalizeString(value)
  if (!raw) return fallback
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return fallback
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function sanitizeFileName(name: string) {
  const safe = normalizeString(name)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return safe || 'client-file'
}

function stripFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0) return fileName
  return fileName.slice(0, dotIndex)
}

function resetClientFilesSelection() {
  clientFilesValue.value = []
}

async function uploadClientFiles(files: File[], clientId: string) {
  if (!clientStore.storageFolder) {
    throw new Error('Storage clienti non disponibile')
  }
  const batchId = Date.now()
  return uploadFilesToUrls(files, async (file, index) => {
    const extension = getFileExtension(file)
    const baseName = sanitizeFileName(stripFileExtension(file.name))
    const path = extension
      ? `${clientId}/files/${batchId}_${index}_${baseName}.${extension}`
      : `${clientId}/files/${batchId}_${index}_${baseName}`
    const uploaded = await clientStore.storageFolder!.update(path, file)
    return uploaded.url
  })
}

async function addClientFiles() {
  if (!current.value || isCreateMode.value || isUploadingClientFiles.value || isDeletingClientFile.value) return
  const selectedFiles = toFileArray(clientFilesValue.value)
  if (!selectedFiles.length) {
    toast.warning('Seleziona almeno un file')
    return
  }
  if (!clientStore.storageFolder) {
    toast.error('Storage clienti non disponibile')
    return
  }

  isUploadingClientFiles.value = true
  try {
    const uploadedUrls = await uploadClientFiles(selectedFiles, current.value.id)
    if (!uploadedUrls.length) {
      toast.warning('Nessun file caricato')
      return
    }
    await current.value.update({
      fileUrls: [...(current.value.fileUrls ?? []), ...uploadedUrls],
      updateBy: defaultUpdateBy(),
    })
    await loadItem()
    toast.success('File cliente caricati')
  } catch (error) {
    console.error(error)
    toast.error('Errore upload file cliente')
  } finally {
    isUploadingClientFiles.value = false
    resetClientFilesSelection()
  }
}

function openClientFile(url: string) {
  window.open(url, '_blank', 'noopener')
}

function clientFileName(url: string) {
  const withoutQuery = String(url ?? '').split('?')[0] ?? ''
  const rawName = withoutQuery.split('/').pop() ?? 'file'
  try {
    return decodeURIComponent(rawName)
  } catch (error) {
    return rawName
  }
}

async function removeClientFile(url: string) {
  if (!current.value || isCreateMode.value || isDeletingClientFile.value) return
  const ok = window.confirm('Eliminare questo file cliente?')
  if (!ok) return

  isDeletingClientFile.value = true
  try {
    await clientStore.storageFolder?.removeFromUrl(url)
    await current.value.update({
      fileUrls: (current.value.fileUrls ?? []).filter((item) => item !== url),
      updateBy: defaultUpdateBy(),
    })
    await loadItem()
    toast.success('File cliente eliminato')
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione file cliente')
  } finally {
    isDeletingClientFile.value = false
  }
}

function openLaserSheetPage() {
  if (!current.value || isCreateMode.value) return
  router.push({ name: 'ClientLaserSheetView', params: { id: current.value.id } })
}

function cloneSettlements(list: ClientDepositSettlement[]) {
  return list.map((item) => ({
    note: normalizeString(item.note),
    paidAmount: normalizeMoney(item.paidAmount),
    date: toIsoDate(item.date),
  }))
}

function cloneDeposits(list: ClientDeposit[]) {
  return list.map((deposit) => ({
    totalAmount: normalizeMoney(deposit.totalAmount),
    reason: normalizeString(deposit.reason),
    settlements: cloneSettlements(deposit.settlements ?? []),
  }))
}

function emptySettlement(): ClientDepositSettlement {
  return {
    note: '',
    paidAmount: 0,
    date: toIsoDate(new Date()),
  }
}

function emptyDeposit(): ClientDeposit {
  return {
    totalAmount: 0,
    reason: '',
    settlements: [],
  }
}

function normalizeDepositsForSave(deposits: ClientDeposit[]) {
  return deposits.map((deposit) => ({
    totalAmount: normalizeMoney(deposit.totalAmount),
    reason: normalizeString(deposit.reason),
    settlements: (deposit.settlements ?? []).map((settlement) => ({
      note: normalizeString(settlement.note),
      paidAmount: normalizeMoney(settlement.paidAmount),
      date: toIsoDate(settlement.date),
    })),
  }))
}

function normalizeSingleDepositForSave(deposit: ClientDeposit) {
  return normalizeDepositsForSave([deposit])[0] ?? emptyDeposit()
}

function resetPurchaseModalState() {
  isPurchaseModalOpen.value = false
  purchaseDraft.value = emptyDeposit()
  editingPurchaseIndex.value = -1
  isPurchaseHeaderEditing.value = false
  settlementEditMap.value = {}
}

function closePurchaseModal() {
  if (isSavingPurchase.value) return
  resetPurchaseModalState()
}

function cloneCurrentDeposits() {
  return cloneDeposits(current.value?.deposits ?? [])
}

function openPurchaseModalForCreate() {
  if (!current.value || isCreateMode.value) return
  purchaseDraft.value = emptyDeposit()
  editingPurchaseIndex.value = -1
  isPurchaseHeaderEditing.value = true
  settlementEditMap.value = {}
  isPurchaseModalOpen.value = true
}

function openPurchaseModalForEdit(depositIndex: number) {
  const selected = cloneCurrentDeposits()[depositIndex]
  if (!selected) return
  purchaseDraft.value = selected
  editingPurchaseIndex.value = depositIndex
  isPurchaseHeaderEditing.value = false
  settlementEditMap.value = {}
  isPurchaseModalOpen.value = true
}

function setSettlementInEditMode(index: number, enabled: boolean) {
  if (index < 0) return
  const next = { ...settlementEditMap.value }
  if (enabled) {
    next[index] = true
  } else {
    delete next[index]
  }
  settlementEditMap.value = next
}

function isSettlementInEditMode(index: number) {
  return Boolean(settlementEditMap.value[index])
}

function addPurchaseSettlement() {
  purchaseDraft.value.settlements = [...(purchaseDraft.value.settlements ?? []), emptySettlement()]
  setSettlementInEditMode((purchaseDraft.value.settlements ?? []).length - 1, true)
}

function removePurchaseSettlement(settlementIndex: number) {
  const settlements = purchaseDraft.value.settlements ?? []
  if (settlementIndex < 0 || settlementIndex >= settlements.length) return

  purchaseDraft.value.settlements = settlements.filter((_, index) => index !== settlementIndex)

  const nextMap: Record<number, boolean> = {}
  Object.entries(settlementEditMap.value).forEach(([key, enabled]) => {
    const index = Number(key)
    if (!enabled || !Number.isInteger(index) || index === settlementIndex) return
    nextMap[index < settlementIndex ? index : index - 1] = true
  })
  settlementEditMap.value = nextMap
}

function buildDepositsFromPurchaseDraft() {
  const next = cloneCurrentDeposits()
  const draft = normalizeSingleDepositForSave(purchaseDraft.value)
  if (editingPurchaseIndex.value >= 0 && editingPurchaseIndex.value < next.length) {
    next[editingPurchaseIndex.value] = draft
    return next
  }
  return [...next, draft]
}

async function savePurchaseModal() {
  if (!current.value || isCreateMode.value || isSavingPurchase.value) return

  const nextDeposits = buildDepositsFromPurchaseDraft()
  const savePayload = normalizeDepositsForSave(nextDeposits)
  const wasEditingExistingPurchase = editingPurchaseIndex.value >= 0

  isSavingPurchase.value = true
  try {
    await current.value.update({
      acconti: savePayload,
      deposits: savePayload,
      updateBy: defaultUpdateBy(),
    })
    await loadItem()
    resetPurchaseModalState()
    toast.success(wasEditingExistingPurchase ? 'Acquisto con acconto aggiornato' : 'Acquisto con acconto creato')
  } catch (error) {
    console.error(error)
    toast.error('Errore salvataggio acquisto con acconto')
  } finally {
    isSavingPurchase.value = false
  }
}

async function deletePurchaseFromModal() {
  if (!current.value || isCreateMode.value || isSavingPurchase.value || editingPurchaseIndex.value < 0) return
  const ok = window.confirm('Eliminare questo acquisto con acconto?')
  if (!ok) return

  const indexToDelete = editingPurchaseIndex.value
  const nextDeposits = cloneCurrentDeposits().filter((_, index) => index !== indexToDelete)
  const savePayload = normalizeDepositsForSave(nextDeposits)

  isSavingPurchase.value = true
  try {
    await current.value.update({
      acconti: savePayload,
      deposits: savePayload,
      updateBy: defaultUpdateBy(),
    })
    await loadItem()
    resetPurchaseModalState()
    toast.success('Acquisto con acconto eliminato')
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione acquisto con acconto')
  } finally {
    isSavingPurchase.value = false
  }
}

function depositPaidTotal(deposit: ClientDeposit) {
  return normalizeMoney(
    (deposit.settlements ?? []).reduce((total, settlement) => total + normalizeMoney(settlement.paidAmount), 0),
  )
}

function depositRemainingTotal(deposit: ClientDeposit) {
  return normalizeMoney(Math.max(0, normalizeMoney(deposit.totalAmount) - depositPaidTotal(deposit)))
}

function latestSettlement(deposit: ClientDeposit) {
  const settlements = deposit.settlements ?? []
  if (!settlements.length) return undefined

  return settlements.reduce<{ item: ClientDepositSettlement; date: string; index: number } | undefined>(
    (best, item, index) => {
      const date = toIsoDate(item.date)
      if (!best) return { item, date, index }
      if (date > best.date) return { item, date, index }
      if (date === best.date && index > best.index) return { item, date, index }
      return best
    },
    undefined,
  )?.item
}

function latestSettlementLabel(deposit: ClientDeposit) {
  const latest = latestSettlement(deposit)
  if (!latest) return ''
  const note = normalizeString(latest.note)
  const amount = formatCurrency(latest.paidAmount)
  return note
    ? `Ultimo acconto: ${formatDepositDate(latest.date)} - ${amount} - ${note}`
    : `Ultimo acconto: ${formatDepositDate(latest.date)} - ${amount}`
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(normalizeMoney(value))
}

function formatDepositDate(value: unknown) {
  const normalized = toIsoDate(value)
  if (!normalized) return '-'
  return new Date(`${normalized}T12:00:00`).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatConsentTimestamp(value: unknown) {
  const date = asDate(value)
  if (!date) return '-'
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function defaultUpdateBy() {
  return String(Auth.user?.email ?? Auth.uid ?? 'admin').trim()
}

function enterEditMode() {
  resetPurchaseModalState()
  isDeleteClientModalOpen.value = false
  isEditMode.value = true
}

function onCancelEdit() {
  if (isCreateMode.value) {
    void router.replace({ name: 'ClientsView' })
    return
  }
  isEditMode.value = false
}

function openAppointment(appointment: AppointmentLike) {
  router.push({ name: 'AppointmentEditView', params: { id: appointment.id } })
}

async function loadItem() {
  resetPurchaseModalState()
  resetClientFilesSelection()
  isDeleteClientModalOpen.value = false
  if (isCreateMode.value) {
    current.value = undefined
    isEditMode.value = true
    return
  }

  isLoading.value = true
  try {
    current.value = await clientStore.ensureOne(routeId.value)
    if (!current.value) {
      toast.warning('Cliente non trovato')
      return
    }
    isEditMode.value = false
  } catch (error) {
    console.error(error)
    toast.error('Errore caricamento cliente')
  } finally {
    isLoading.value = false
  }
}

async function onSubmit(values: Record<string, unknown>) {
  const consensoPromozioniWhatsapp = normalizeBoolean(values.consenso_promozioni_whatsapp)
  const previousConsent = Boolean(current.value?.consenso_promozioni_whatsapp)
  const consentHasChanged = isCreateMode.value
    ? true
    : consensoPromozioniWhatsapp !== previousConsent

  const payload: ClientUpsertPayload = {
    name: normalizeString(values.name),
    surname: normalizeString(values.surname),
    phone_number: sanitizePhoneNumberInput(values.phone_number),
    consenso_promozioni_whatsapp: consensoPromozioniWhatsapp,
    gender: normalizeGenderForForm(values.gender),
    email: normalizeString(values.email),
    birthdate: normalizeString(values.birthdate),
    note: normalizeNoteForSave(values.note),
    updateBy: defaultUpdateBy(),
  }

  if (consentHasChanged) {
    payload.data_consenso_promozioni = consensoPromozioniWhatsapp ? Timestamp.now() : null
  }

  try {
    if (isCreateMode.value) {
      const created = await clientStore.add(payload)
      current.value = created
      isEditMode.value = false
      toast.success('Cliente creato')
      await router.replace({ name: 'ClientEditView', params: { id: created.id } })
      return
    }

    if (!current.value) return
    await current.value.update(payload)
    await loadItem()
    isEditMode.value = false
    toast.success('Cliente aggiornato')
  } catch (error) {
    console.error(error)
    toast.error('Errore salvataggio cliente')
  }
}

async function onDeleteClient() {
  if (!current.value || isCreateMode.value || isDeleting.value) return

  isDeleting.value = true
  try {
    await current.value.delete(clientStore)
    isDeleteClientModalOpen.value = false
    toast.success('Cliente eliminato')
    await router.replace({ name: 'ClientsView' })
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione cliente')
  } finally {
    isDeleting.value = false
  }
}

function openDeleteClientModal() {
  if (isCreateMode.value || !current.value || isDeleting.value) return
  isDeleteClientModalOpen.value = true
}

function closeDeleteClientModal() {
  if (isDeleting.value) return
  isDeleteClientModalOpen.value = false
}

onMounted(loadItem)
watch(() => route.params.id, loadItem)
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp :title="isCreateMode ? 'Nuovo cliente' : 'Cliente'" :to="{ name: 'ClientsView' }" />

    <div class="edit-wrapper mx-auto py-3">
      <p v-if="isLoading" class="text-muted small mt-3">Caricamento...</p>

      <Form
        v-else-if="isEditMode && (isCreateMode || current)"
        :key="formKey"
        :validation-schema="schema"
        :initial-values="initialValues"
        @submit="onSubmit"
        v-slot="{ isSubmitting, values, setFieldValue }"
        class="card border-0 shadow-sm p-3 p-md-4 form-shell"
      >
        <div class="row g-3">
          <div class="col-12 col-md-6">
            <label class="form-label">Nome</label>
            <Field name="name" class="form-control" />
            <ErrorMessage name="name" class="text-danger small" />
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">Cognome</label>
            <Field name="surname" class="form-control" />
            <ErrorMessage name="surname" class="text-danger small" />
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">Telefono</label>
            <Field
              name="phone_number"
              class="form-control"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="+39..."
              @input="onPhoneNumberInput($event, setFieldValue)"
              @paste="onPhoneNumberPaste($event, setFieldValue)"
            />
            <ErrorMessage name="phone_number" class="text-danger small" />
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label d-block">Gender</label>
            <div class="gender-switch" role="radiogroup" aria-label="Selezione gender">
              <button
                v-for="option in genderToggleOptions"
                :key="option.value"
                type="button"
                class="gender-segment"
                :class="[option.className, { 'is-active': values.gender === option.value }]"
                :aria-pressed="values.gender === option.value"
                @click="setFieldValue('gender', option.value, true)"
              >
                {{ option.label }}
              </button>
            </div>
            <ErrorMessage name="gender" class="text-danger small d-block mt-1" />
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">Email</label>
            <Field name="email" class="form-control" placeholder="mail@dominio.it" />
            <ErrorMessage name="email" class="text-danger small" />
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">Data di nascita</label>
            <Field name="birthdate" type="date" class="form-control" />
            <ErrorMessage name="birthdate" class="text-danger small" />
          </div>

          <div class="col-12">
            <div class="form-check">
              <Field
                name="consenso_promozioni_whatsapp"
                type="checkbox"
                class="form-check-input"
                :value="true"
                :unchecked-value="false"
              />
              <label class="form-check-label">Consenso promozioni WhatsApp</label>
            </div>
            <small
              v-if="values.consenso_promozioni_whatsapp && current?.data_consenso_promozioni"
              class="text-muted d-block mt-1"
            >
              Consenso registrato il {{ formatConsentTimestamp(current.data_consenso_promozioni) }}
            </small>
          </div>

          <div class="col-12">
            <FieldTiptap
              name="note"
              label="Note"
              :required="false"
              :show-errors="false"
              :model-value="normalizeNoteForEditor(values.note)"
              toolbar-sticky-on="top"
              @update:model-value="(value) => setFieldValue('note', value)"
            />
            <ErrorMessage name="note" class="text-danger small" />
          </div>

          <template v-if="!isCreateMode">
            <div class="col-12 col-md-6">
              <label class="form-label">user_id (sola lettura)</label>
              <input class="form-control" :value="current?.user_id || '-'" disabled readonly>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">old_id (sola lettura)</label>
              <input class="form-control" :value="current?.old_id || '-'" disabled readonly>
            </div>
          </template>
        </div>

        <div class="form-primary-actions mt-4">
          <Btn type="submit" color="dark" icon="save" :loading="isSubmitting || isDeleting">
            {{ isCreateMode ? 'Crea' : 'Salva' }}
          </Btn>
          <Btn type="button" color="secondary" variant="outline" icon="close" :disabled="isSubmitting" @click="onCancelEdit">
            Annulla
          </Btn>
        </div>

        <section v-if="!isCreateMode" class="danger-zone-card mt-4">
          <div class="danger-zone-card__copy">
            <h3 class="danger-zone-card__title">Elimina cliente</h3>
            <p class="danger-zone-card__subtitle mb-0">
              Questa azione elimina in modo definitivo il cliente e i suoi dati associati.
            </p>
          </div>
          <Btn
            type="button"
            color="danger"
            variant="outline"
            icon="delete"
            :disabled="isSubmitting"
            @click="openDeleteClientModal"
          >
            Elimina cliente
          </Btn>
        </section>
      </Form>

      <div v-else-if="current" class="view-shell">
        <section class="client-section-card client-section-card--hero">
          <ClientPersonCard
            :name="current.name"
            :surname="current.surname"
            :gender="current.gender"
            :phone-number="current.phone_number"
            :email="current.email"
            :birthdate="current.birthdate"
            :note="current.note"
            :consenso-promozioni-whatsapp="current.consenso_promozioni_whatsapp"
            :show-details="true"
            compact
            class="client-main-card mx-auto"
          >
            <template #actions>
              <Btn
                type="button"
                color="dark"
                variant="outline"
                icon="edit"
                title="Modifica cliente"
                aria-label="Modifica cliente"
                @click="enterEditMode"
              />
            </template>
          </ClientPersonCard>
        </section>

        <section class="client-section-card">
          <h2 class="client-section-card__title">Appuntamenti rapidi</h2>
          <div class="row g-2 mt-1">
            <div class="col-12 col-md-6">
              <ClientAppointmentCard
                title="Prossimo appuntamento"
                :appointment="appointmentSummary.next"
                empty-label="Nessun prossimo appuntamento"
                :show-today-emoji="appointmentSummary.hasTodayAppointment"
                today-emoji-label="&#x1F4C5; Oggi c'e un appuntamento"
              />
            </div>
            <div class="col-12 col-md-6">
              <ClientAppointmentCard
                title="Appuntamento precedente"
                :appointment="appointmentSummary.previous"
                empty-label="Nessun appuntamento precedente"
              />
            </div>
          </div>
        </section>

        <section class="client-section-card">
          <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <h2 class="h6 mb-0">Scheda laser</h2>
              <span v-if="hasLaserClarifications" class="laser-clarification-badge" title="Sono presenti campi da chiarire">
                <span class="material-symbols-outlined" aria-hidden="true">help</span>
                Chiarimenti: {{ laserClarificationCount }}
              </span>
            </div>
            <Btn type="button" color="dark" variant="outline" icon="description" @click="openLaserSheetPage">
              Apri scheda laser
            </Btn>
          </div>

          <div class="laser-summary-card">
            <p class="mb-1">
              Numero scheda: <strong>{{ current.schedaLaserNumber || '-' }}</strong>
            </p>
            <p class="mb-1">
              Data scheda:
              <strong>{{ formatConsentTimestamp(current.dataSchiedaLaser) }}</strong>
            </p>
            <p class="mb-0">
              Fitzpatrick: <strong>{{ hasLaserSheet ? `${laserScore}/40` : '-' }}</strong> | Fototipo:
              <strong>{{ hasLaserSheet ? laserPhototype : '-' }}</strong>
            </p>
          </div>
        </section>

        <section class="client-section-card">
          <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
            <h2 class="h6 mb-0">File cliente</h2>
            <Btn
              type="button"
              color="dark"
              icon="upload_file"
              :loading="isUploadingClientFiles"
              @click="addClientFiles"
            >
              Carica file
            </Btn>
          </div>

          <FieldFile
            name="client-files"
            v-model="clientFilesValue"
            multiple
            :show-errors="false"
            :disabled="isUploadingClientFiles || isDeletingClientFile"
            @clear="resetClientFilesSelection"
          >
            <template #dropzone="{ open, clear, files, disabled }">
              <div class="dropzone-wrap" :class="{ disabled }">
                <div class="d-flex gap-2 flex-wrap">
                  <Btn type="button" icon="upload_file" color="dark" :disabled="disabled" @click="open">
                    Scegli file
                  </Btn>
                  <Btn type="button" icon="delete" variant="outline" color="secondary" :disabled="disabled || !files.length" @click="clear">
                    Svuota selezione
                  </Btn>
                </div>
                <small class="text-muted d-block mt-1">File selezionati: {{ files.length }}</small>
              </div>
            </template>
          </FieldFile>

          <div v-if="current.fileUrls?.length" class="vstack gap-2 mt-2">
            <article v-for="url in current.fileUrls" :key="url" class="client-file-row">
              <p class="mb-0 text-truncate">{{ clientFileName(url) }}</p>
              <div class="d-flex gap-2 flex-wrap">
                <Btn type="button" color="secondary" variant="outline" icon="download" @click="openClientFile(url)">
                  Scarica
                </Btn>
                <Btn
                  type="button"
                  color="danger"
                  variant="outline"
                  icon="delete"
                  :disabled="isDeletingClientFile || isUploadingClientFiles"
                  @click="removeClientFile(url)"
                >
                  Elimina
                </Btn>
              </div>
            </article>
          </div>
          <p v-else class="text-muted small mb-0 mt-2">Nessun file cliente caricato.</p>
        </section>

        <section class="client-section-card">
          <h2 class="h6 mb-2">Appuntamenti cliente</h2>
          <div class="vstack gap-2">
            <ClientAppointmentCard
              v-for="appointment in clientAppointments"
              :key="appointment.id"
              title="Appuntamento"
              :appointment="appointment"
              :show-status="true"
              :clickable="true"
              @click="openAppointment"
            />
            <p v-if="!clientAppointments.length" class="text-muted small mb-0">Nessun appuntamento trovato per questo cliente.</p>
          </div>
        </section>

        <section class="client-section-card">
          <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
            <h2 class="h6 mb-0">Acquisti con acconto</h2>
            <Btn type="button" color="dark" variant="outline" icon="add" @click="openPurchaseModalForCreate">
              Aggiungi acquisto con acconto
            </Btn>
          </div>

          <div v-if="(current.deposits ?? []).length" class="vstack gap-2">
            <button
              v-for="(deposit, depositIndex) in current.deposits"
              :key="`view-deposit-${depositIndex}`"
              type="button"
              class="deposit-view-card deposit-view-card--button text-start"
              @click="openPurchaseModalForEdit(depositIndex)"
            >
              <div class="deposit-view-card__head">
                <div>
                  <p class="mb-1 fw-semibold">{{ deposit.reason || 'Acquisto con acconto senza motivo' }}</p>
                  <small class="text-muted d-block">Totale acquisto: {{ formatCurrency(deposit.totalAmount) }}</small>
                  <small class="text-muted d-block">Residuo: {{ formatCurrency(depositRemainingTotal(deposit)) }}</small>
                </div>
                <span class="badge text-bg-light border deposit-view-card__open">Apri</span>
              </div>

              <small class="text-muted deposit-view-card__latest">
                {{ latestSettlementLabel(deposit) || 'Nessun acconto registrato.' }}
              </small>
            </button>
          </div>
          <p v-else class="text-muted small mb-0">Nessun acquisto con acconto registrato.</p>
        </section>

        <div
          v-if="isPurchaseModalOpen"
          class="client-purchase-modal"
          role="dialog"
          aria-modal="true"
          :aria-label="isCreatingPurchase ? 'Nuovo acquisto con acconto' : 'Dettaglio acquisto con acconto'"
        >
          <div class="client-purchase-modal__backdrop" @click="closePurchaseModal"></div>

          <div class="client-purchase-modal__content card border-0 shadow-lg p-3 p-md-4">
            <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
              <h3 class="h6 mb-0">{{ isCreatingPurchase ? 'Nuovo acquisto con acconto' : 'Acquisto con acconto' }}</h3>
              <button type="button" class="btn-close" aria-label="Chiudi acquisto con acconto" @click="closePurchaseModal"></button>
            </div>

            <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
              <strong>Dettagli acquisto</strong>
              <Btn
                type="button"
                color="secondary"
                variant="outline"
                icon="edit"
                @click="isPurchaseHeaderEditing = !isPurchaseHeaderEditing"
              >
                {{ isPurchaseHeaderEditing ? 'Fine modifica dettagli' : 'Modifica dettagli' }}
              </Btn>
            </div>

            <div class="row g-2">
              <div class="col-12 col-md-4">
                <label class="form-label mb-1">Totale acquisto</label>
                <input
                  v-if="isPurchaseHeaderEditing"
                  v-model.number="purchaseDraft.totalAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  class="form-control"
                >
                <p v-else class="form-control-plaintext mb-0 fw-semibold">{{ formatCurrency(purchaseDraft.totalAmount) }}</p>
              </div>
              <div class="col-12 col-md-8">
                <label class="form-label mb-1">Motivo</label>
                <input
                  v-if="isPurchaseHeaderEditing"
                  v-model="purchaseDraft.reason"
                  type="text"
                  class="form-control"
                  placeholder="Es. Conferma pacchetto, prenotazione evento..."
                >
                <p v-else class="form-control-plaintext mb-0">{{ purchaseDraft.reason || '-' }}</p>
              </div>
            </div>

            <div class="deposit-card__meta mt-2">
              <span class="badge text-bg-light border">Totale acconti: {{ formatCurrency(depositPaidTotal(purchaseDraft)) }}</span>
              <span class="badge text-bg-light border">Residuo: {{ formatCurrency(depositRemainingTotal(purchaseDraft)) }}</span>
            </div>

            <div class="deposit-settlements mt-3">
              <div class="deposit-settlements__header">
                <strong>Acconti</strong>
                <Btn type="button" color="dark" variant="outline" icon="add" @click="addPurchaseSettlement">
                  Aggiungi acconto
                </Btn>
              </div>

              <div v-if="!(purchaseDraft.settlements ?? []).length" class="deposit-settlements__empty">
                Nessun acconto registrato.
              </div>

              <div
                v-for="(settlement, settlementIndex) in purchaseDraft.settlements"
                :key="`modal-settlement-${settlementIndex}`"
                class="deposit-settlement-row"
              >
                <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-1">
                  <small class="text-muted fw-semibold">Acconto {{ settlementIndex + 1 }}</small>
                  <div class="d-flex gap-2">
                    <Btn
                      type="button"
                      color="secondary"
                      variant="outline"
                      icon="edit"
                      @click="setSettlementInEditMode(settlementIndex, !isSettlementInEditMode(settlementIndex))"
                    >
                      {{ isSettlementInEditMode(settlementIndex) ? 'Fine modifica' : 'Modifica' }}
                    </Btn>
                    <Btn
                      type="button"
                      color="danger"
                      variant="outline"
                      icon="delete"
                      @click="removePurchaseSettlement(settlementIndex)"
                    >
                      Rimuovi
                    </Btn>
                  </div>
                </div>

                <div class="row g-2 align-items-end">
                  <div class="col-12 col-md-3">
                    <label class="form-label mb-1">Data</label>
                    <input
                      v-if="isSettlementInEditMode(settlementIndex)"
                      v-model="settlement.date"
                      type="date"
                      class="form-control"
                    >
                    <p v-else class="form-control-plaintext mb-0">{{ formatDepositDate(settlement.date) }}</p>
                  </div>
                  <div class="col-12 col-md-3">
                    <label class="form-label mb-1">Acconto</label>
                    <input
                      v-if="isSettlementInEditMode(settlementIndex)"
                      v-model.number="settlement.paidAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      class="form-control"
                    >
                    <p v-else class="form-control-plaintext mb-0">{{ formatCurrency(settlement.paidAmount) }}</p>
                  </div>
                  <div class="col-12 col-md-6">
                    <label class="form-label mb-1">Nota</label>
                    <input
                      v-if="isSettlementInEditMode(settlementIndex)"
                      v-model="settlement.note"
                      type="text"
                      class="form-control"
                      placeholder="Es. acconto in contanti, bonifico, POS..."
                    >
                    <p v-else class="form-control-plaintext mb-0">{{ settlement.note || '-' }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="d-flex gap-2 mt-3 flex-wrap">
              <Btn type="button" color="dark" icon="save" :loading="isSavingPurchase" @click="savePurchaseModal">
                Salva acquisto con acconto
              </Btn>
              <Btn
                type="button"
                color="secondary"
                variant="outline"
                icon="close"
                :disabled="isSavingPurchase"
                @click="closePurchaseModal"
              >
                Annulla
              </Btn>
              <Btn
                v-if="!isCreatingPurchase"
                type="button"
                color="danger"
                variant="outline"
                icon="delete"
                :loading="isSavingPurchase"
                @click="deletePurchaseFromModal"
              >
                Elimina acquisto con acconto
              </Btn>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="isDeleteClientModalOpen"
        class="client-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Conferma eliminazione cliente"
      >
        <div class="client-delete-modal__backdrop" @click="closeDeleteClientModal"></div>

        <div class="client-delete-modal__content card border-0 shadow-lg p-3 p-md-4">
          <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
            <div>
              <h3 class="h6 mb-1">Conferma eliminazione</h3>
              <p class="small text-muted mb-0">
                Stai per eliminare <strong>{{ clientDisplayName }}</strong>. Operazione non reversibile.
              </p>
            </div>
            <button type="button" class="btn-close" aria-label="Chiudi conferma eliminazione" @click="closeDeleteClientModal"></button>
          </div>

          <div class="d-flex gap-2 mt-3 flex-wrap">
            <Btn type="button" color="danger" icon="delete" :loading="isDeleting" @click="onDeleteClient">
              Elimina definitivamente
            </Btn>
            <Btn type="button" color="secondary" variant="outline" :disabled="isDeleting" @click="closeDeleteClientModal">
              Annulla
            </Btn>
          </div>
        </div>
      </div>

      <p v-if="!isLoading && !(isEditMode && (isCreateMode || current)) && !current" class="text-muted small mt-3">
        Cliente non trovato.
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.edit-wrapper {
  max-width: 880px;
}

.form-shell {
  max-width: 760px;
  margin-inline: auto;
}

.form-primary-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.danger-zone-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
  flex-wrap: wrap;
  border: 1px solid rgba(180, 58, 74, 0.32);
  border-radius: 0.82rem;
  padding: 0.9rem 1rem;
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 187, 197, 0.38) 0%, transparent 48%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(254, 240, 242, 0.95));
}

.danger-zone-card__copy {
  display: grid;
  gap: 0.28rem;
  max-width: 30rem;
}

.danger-zone-card__title {
  margin: 0;
  font-size: 0.94rem;
  font-weight: 700;
  color: #84253a;
}

.danger-zone-card__subtitle {
  color: #7a4958;
  font-size: 0.8rem;
  line-height: 1.35;
}

.view-shell {
  display: grid;
  gap: 0.9rem;
}

.client-main-card {
  max-width: 100%;
  margin: 0;
}

.client-section-card {
  border: 1px solid rgba(84, 44, 58, 0.18);
  border-radius: 0.95rem;
  padding: 0.9rem;
  background:
    radial-gradient(circle at 92% 0%, rgba(232, 179, 190, 0.34) 0%, transparent 52%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(247, 241, 242, 0.93));
  box-shadow: 0 10px 22px rgba(45, 27, 35, 0.08);
}

.client-section-card--hero {
  padding: 0.7rem;
}

.client-section-card__title {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #643a49;
  margin: 0;
}

.gender-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;
}

.gender-segment {
  border: 1px solid #d6d8da;
  background: #ffffff;
  color: #212529;
  border-radius: 0.45rem;
  font-weight: 700;
  line-height: 1;
  min-height: 2.4rem;
  transition: all 0.18s ease;
}

.gender-segment--f {
  border-color: rgba(214, 51, 132, 0.42);
  background: rgba(214, 51, 132, 0.1);
  color: #d63384;
}

.gender-segment--o {
  border-color: rgba(17, 17, 17, 0.45);
  background: rgba(17, 17, 17, 0.1);
  color: #111111;
}

.gender-segment--m {
  border-color: rgba(13, 110, 253, 0.42);
  background: rgba(13, 110, 253, 0.1);
  color: #0d6efd;
}

.gender-segment--f.is-active {
  background: #d63384;
  border-color: #d63384;
  color: #ffffff;
}

.gender-segment--o.is-active {
  background: #111111;
  border-color: #111111;
  color: #ffffff;
}

.gender-segment--m.is-active {
  background: #0d6efd;
  border-color: #0d6efd;
  color: #ffffff;
}

.deposit-card__meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.deposit-settlements {
  border-top: 1px dashed rgba(84, 44, 58, 0.2);
  padding-top: 0.55rem;
  display: grid;
  gap: 0.45rem;
}

.deposit-settlements__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.deposit-settlements__empty {
  font-size: 0.84rem;
  color: #725663;
}

.deposit-settlement-row {
  padding: 0.45rem;
  border: 1px solid rgba(84, 44, 58, 0.12);
  border-radius: 0.5rem;
  background: rgba(247, 241, 242, 0.62);
}

.deposit-view-card {
  border: 1px solid rgba(84, 44, 58, 0.14);
  border-radius: 0.62rem;
  padding: 0.62rem;
  background: rgba(255, 255, 255, 0.8);
  display: grid;
  gap: 0.45rem;
}

.deposit-view-card--button {
  width: 100%;
  border: 1px solid rgba(84, 44, 58, 0.14);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.deposit-view-card--button:hover,
.deposit-view-card--button:focus-visible {
  border-color: rgba(84, 44, 58, 0.32);
  box-shadow: 0 0 0 0.2rem rgba(84, 44, 58, 0.1);
  transform: translateY(-1px);
}

.deposit-view-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.deposit-view-card__open {
  align-self: flex-start;
}

.deposit-view-card__latest {
  font-size: 0.82rem;
  color: #6f4f5c;
}

.dropzone-wrap {
  border: 1px dashed rgba(84, 44, 58, 0.24);
  border-radius: 0.62rem;
  padding: 0.7rem;
  background: rgba(255, 255, 255, 0.7);
}

.dropzone-wrap.disabled {
  opacity: 0.65;
}

.client-file-row {
  border: 1px solid rgba(84, 44, 58, 0.16);
  border-radius: 0.55rem;
  padding: 0.5rem 0.6rem;
  background: rgba(255, 255, 255, 0.82);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.laser-summary-card {
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 0.75rem;
  padding: 0.7rem 0.78rem;
  background:
    radial-gradient(circle at 12% 0%, rgba(232, 179, 190, 0.28) 0%, transparent 55%),
    rgba(255, 255, 255, 0.88);
  font-size: 0.86rem;
}

.laser-clarification-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.24rem;
  border: 1px solid rgba(171, 128, 26, 0.45);
  border-radius: 999px;
  background: rgba(253, 244, 212, 0.95);
  color: #805d14;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 0.16rem 0.5rem;
}

.laser-clarification-badge .material-symbols-outlined {
  font-size: 0.95rem;
}

.client-delete-modal,
.client-purchase-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.client-delete-modal {
  z-index: 1300;
}

.client-delete-modal__backdrop,
.client-purchase-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
}

.client-delete-modal__content,
.client-purchase-modal__content {
  position: relative;
  width: min(calc(100vw - 2rem), 820px);
  max-height: calc(100vh - 2rem);
  overflow: auto;
}

@media (max-width: 767.98px) {
  .client-section-card {
    padding: 0.72rem;
    border-radius: 0.82rem;
  }

  .danger-zone-card {
    padding: 0.75rem;
  }
}
</style>

