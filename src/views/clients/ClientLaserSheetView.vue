<script setup lang="ts">
import {
  Btn,
  cicKitStore,
  getFileExtension,
  toast,
  uploadFilesToUrls,
} from 'cic-kit'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { Timestamp } from 'firebase/firestore'
import QRCode from 'qrcode'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import ClientFilesGallery from './components/ClientFilesGallery.vue'
import {
  buildClientLaserShareUrl,
  createClientLaserShareToken,
  revokeClientLaserShareToken,
  type LaserShareTtlHours,
} from '../../call/clientLaserShare'
import type { Client } from '../../models/Client'
import {
  FITZPATRICK_QUESTIONS,
  LASER_SHEET_FITZPATRICK_IDS,
  computeFitzpatrickScore,
  readLaserSheetNumber,
  readLaserSheetString,
  resolveFitzpatrickPhototype,
  type LaserSheetRecord,
} from '../../models/laserSheet'
import { Auth } from '../../main'
import { clientStore } from '../../stores/clientStore'
import { publicUserStore } from '../../stores/publicUser'
import { asDate } from '../../utils/date'
import { normalizeWhatsAppPhoneNumber, sendWhatsAppMessage } from '../../utils/whatsapp'

type YesNoValue = '' | 'si' | 'no'
type FtzValue = '' | '0' | '1' | '2' | '3' | '4'

type LaserSheetForm = {
  [key: string]: string
  documentDate: string
  operatorName: string
  clientAddress: string
  clientAge: string
  clientGender: string
  epilationAlreadyDone: string
  epilationAreasDone: string
  epilationResults: string
  epilationCurrentMethods: string
  medsWomanAnticoncezionali: YesNoValue
  medsWomanAnabolizzanti: YesNoValue
  medsWomanCortisonici: YesNoValue
  medsWomanAltri: string
  medsManRicrescitaCapelli: YesNoValue
  medsManAnabolizzanti: YesNoValue
  medsManCortisonici: YesNoValue
  medsManAltri: string
  gravidanzaAllattamento: YesNoValue
  pacemaker: YesNoValue
  epilessia: YesNoValue
  cicloRegolare: YesNoValue
  zonaInteresse: string
  consensoFoto: YesNoValue
  fitzpatrick_q1: FtzValue
  fitzpatrick_q2: FtzValue
  fitzpatrick_q3: FtzValue
  fitzpatrick_q4: FtzValue
  fitzpatrick_q5: FtzValue
  fitzpatrick_q6: FtzValue
  fitzpatrick_q7: FtzValue
  fitzpatrick_q8: FtzValue
  fitzpatrick_q9: FtzValue
  fitzpatrick_q10: FtzValue
}

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const current = ref<Client | undefined>(undefined)
const isLoading = ref(false)
const isSaving = ref(false)
const isDownloadingPdf = ref(false)
const isUploadingDocs = ref(false)
const isDeletingFile = ref(false)
const isShareTokenModalOpen = ref(false)
const isCreatingShareToken = ref(false)
const isRevokingShareToken = ref(false)
const isCopyingShareLink = ref(false)
const shareQrDataUrl = ref('')
const clearingSkippedKeys = ref<string[]>([])
const isHydratingForm = ref(false)
type CurrentClient = NonNullable<typeof current.value>

const routeId = computed(() => String(route.params.id ?? '').trim())
const yesNoOptions: Array<{ value: Exclude<YesNoValue, ''>; label: string }> = [
  { value: 'si', label: 'Si' },
  { value: 'no', label: 'No' },
]
const binaryGenderOptions = [
  { value: 'F', label: 'Donna' },
  { value: 'M', label: 'Uomo' },
]
const shareTtlOptions: Array<{ value: LaserShareTtlHours; label: string; description: string }> = [
  { value: 3, label: '3 ore', description: 'Ideale per invio immediato' },
  { value: 12, label: '12 ore', description: 'Valido per tutta la giornata' },
  { value: 24, label: '1 giorno', description: 'Scadenza dopo 24 ore' },
  { value: 48, label: '2 giorni', description: 'Scadenza dopo 48 ore' },
  { value: 72, label: '3 giorni', description: 'Scadenza dopo 72 ore' },
]
const selectedShareTtl = ref<LaserShareTtlHours>(3)

const operatorNameFromLogin = computed(() => {
  const authUid = normalizeString(Auth.uid)
  const operator = publicUserStore.itemsActiveArray.find((item) => normalizeString(item.id) === authUid)
  const fullName = `${normalizeString(operator?.name)} ${normalizeString(operator?.surname)}`.trim()
  if (fullName) return fullName
  const operatorEmail = normalizeString(operator?.email)
  if (operatorEmail) return operatorEmail
  return normalizeString(Auth.user?.email ?? authUid)
})

const clientFullName = computed(() => {
  const name = normalizeString(current.value?.name)
  const surname = normalizeString(current.value?.surname)
  return `${name} ${surname}`.trim() || '-'
})

const form = ref<LaserSheetForm>(emptyForm())
const formSnapshot = ref<LaserSheetForm>(emptyForm())

const currentGender = computed<'F' | 'M' | ''>(() => {
  const normalized = normalizeString(form.value.clientGender).toUpperCase()
  if (normalized === 'F' || normalized === 'M') return normalized
  return ''
})

const isWomanFlow = computed(() => currentGender.value !== 'M')
const isManFlow = computed(() => currentGender.value !== 'F')
const showEpilationDetails = computed(() => Boolean(normalizeString(form.value.epilationAlreadyDone)))

const shareToken = computed(() => normalizeString(current.value?.laserShareToken))
const shareTokenExpiresAt = computed(() => asDate(current.value?.laserShareTokenExpiresAt))
const shareTokenExpired = computed(() => {
  if (!shareToken.value) return false
  const expiresAt = shareTokenExpiresAt.value
  if (!expiresAt) return true
  return expiresAt.getTime() <= Date.now()
})
const hasActiveShareToken = computed(() => Boolean(shareToken.value) && !shareTokenExpired.value)
const shareLink = computed(() => {
  if (!shareToken.value) return ''
  return buildClientLaserShareUrl(shareToken.value)
})
const shareOperatorFirstName = computed(() => {
  const fromClient = normalizeString(current.value?.laserShareTokenOperatorFirstName)
  if (fromClient) return fromClient
  const fromOperator = normalizeString(operatorNameFromLogin.value)
  if (!fromOperator) return 'operatore'
  const [firstName] = fromOperator.split(/\s+/)
  return normalizeString(firstName) || 'operatore'
})
const shareTokenExpiresAtLabel = computed(() => {
  const date = shareTokenExpiresAt.value
  if (!date) return '-'
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})
const canCreateShareToken = computed(() => Boolean(normalizeString(current.value?.phone_number)))
const shareWhatsAppPhone = computed(() => normalizeWhatsAppPhoneNumber(current.value?.phone_number))
const canSendShareLinkOnWhatsApp = computed(() => Boolean(shareLink.value) && Boolean(shareWhatsAppPhone.value))
const laserDocumentUrls = computed(() => {
  const urls = [
    ...(current.value?.laserDocUrls ?? []),
    ...(current.value?.laserMediaUrls ?? []),
  ]
  return [...new Set(urls.map((url) => normalizeString(url)).filter(Boolean))]
})

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => normalizeString(item)).filter(Boolean))]
}

function normalizeDateInput(value: unknown) {
  const raw = normalizeString(value)
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function defaultUpdateBy() {
  return normalizeString(Auth.user?.email ?? Auth.uid ?? 'admin')
}

function todayIsoDate() {
  return normalizeDateInput(new Date())
}

function ageFromBirthdate(value: unknown) {
  const date = asDate(value)
  if (!date) return ''
  const now = new Date()
  let age = now.getFullYear() - date.getFullYear()
  const currentMonth = now.getMonth()
  const birthMonth = date.getMonth()
  if (currentMonth < birthMonth || (currentMonth === birthMonth && now.getDate() < date.getDate())) {
    age -= 1
  }
  if (!Number.isFinite(age) || age < 0) return ''
  return String(age)
}

function changedFormKeys(previous: LaserSheetForm, next: LaserSheetForm) {
  const changed: string[] = []
  const keys = Object.keys(next) as Array<keyof LaserSheetForm>
  for (const key of keys) {
    const previousValue = normalizeString(previous[key])
    const nextValue = normalizeString(next[key])
    if (previousValue === nextValue) continue
    changed.push(String(key))
  }
  return changed
}

function emptyForm(): LaserSheetForm {
  return {
    documentDate: todayIsoDate(),
    operatorName: operatorNameFromLogin.value,
    clientAddress: '',
    clientAge: '',
    clientGender: '',
    epilationAlreadyDone: '',
    epilationAreasDone: '',
    epilationResults: '',
    epilationCurrentMethods: '',
    medsWomanAnticoncezionali: 'no',
    medsWomanAnabolizzanti: 'no',
    medsWomanCortisonici: 'no',
    medsWomanAltri: '',
    medsManRicrescitaCapelli: 'no',
    medsManAnabolizzanti: 'no',
    medsManCortisonici: 'no',
    medsManAltri: '',
    gravidanzaAllattamento: 'no',
    pacemaker: 'no',
    epilessia: 'no',
    cicloRegolare: 'no',
    zonaInteresse: '',
    consensoFoto: 'no',
    fitzpatrick_q1: '',
    fitzpatrick_q2: '',
    fitzpatrick_q3: '',
    fitzpatrick_q4: '',
    fitzpatrick_q5: '',
    fitzpatrick_q6: '',
    fitzpatrick_q7: '',
    fitzpatrick_q8: '',
    fitzpatrick_q9: '',
    fitzpatrick_q10: '',
  }
}

function toFitzValue(value: unknown): FtzValue {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return ''
  const normalized = Math.max(0, Math.min(4, Math.round(parsed)))
  return String(normalized) as FtzValue
}

function normalizeGenderForLaser(value: unknown) {
  const normalized = normalizeString(value).toLowerCase()
  if (normalized === 'm') return 'M'
  if (normalized === 'f') return 'F'
  return ''
}

function normalizeYesNo(value: unknown, fallback: Exclude<YesNoValue, ''> = 'no'): Exclude<YesNoValue, ''> {
  const normalized = normalizeString(value).toLowerCase()
  if (normalized === 'si' || normalized === 'no') return normalized
  return fallback
}

function setFormFromClient(client: CurrentClient) {
  const scheda = client.schedaLaser
  const dataDoc = normalizeDateInput(client.dataSchiedaLaser)
  isHydratingForm.value = true
  form.value = {
    ...emptyForm(),
    documentDate: dataDoc || readLaserSheetString(scheda, 'documentDate', todayIsoDate()),
    operatorName: readLaserSheetString(scheda, 'operatorName', operatorNameFromLogin.value),
    clientAddress: readLaserSheetString(scheda, 'clientAddress'),
    clientAge: readLaserSheetString(scheda, 'clientAge', ageFromBirthdate(client.birthdate)),
    clientGender: readLaserSheetString(scheda, 'clientGender', normalizeGenderForLaser(client.gender)),
    epilationAlreadyDone: readLaserSheetString(scheda, 'epilationAlreadyDone'),
    epilationAreasDone: readLaserSheetString(scheda, 'epilationAreasDone'),
    epilationResults: readLaserSheetString(scheda, 'epilationResults'),
    epilationCurrentMethods: readLaserSheetString(scheda, 'epilationCurrentMethods'),
    medsWomanAnticoncezionali: normalizeYesNo(readLaserSheetString(scheda, 'medsWomanAnticoncezionali')),
    medsWomanAnabolizzanti: normalizeYesNo(readLaserSheetString(scheda, 'medsWomanAnabolizzanti')),
    medsWomanCortisonici: normalizeYesNo(readLaserSheetString(scheda, 'medsWomanCortisonici')),
    medsWomanAltri: readLaserSheetString(scheda, 'medsWomanAltri'),
    medsManRicrescitaCapelli: normalizeYesNo(readLaserSheetString(scheda, 'medsManRicrescitaCapelli')),
    medsManAnabolizzanti: normalizeYesNo(readLaserSheetString(scheda, 'medsManAnabolizzanti')),
    medsManCortisonici: normalizeYesNo(readLaserSheetString(scheda, 'medsManCortisonici')),
    medsManAltri: readLaserSheetString(scheda, 'medsManAltri'),
    gravidanzaAllattamento: normalizeYesNo(readLaserSheetString(scheda, 'gravidanzaAllattamento')),
    pacemaker: normalizeYesNo(readLaserSheetString(scheda, 'pacemaker')),
    epilessia: normalizeYesNo(readLaserSheetString(scheda, 'epilessia')),
    cicloRegolare: normalizeYesNo(readLaserSheetString(scheda, 'cicloRegolare')),
    zonaInteresse: readLaserSheetString(scheda, 'zonaInteresse'),
    consensoFoto: normalizeYesNo(readLaserSheetString(scheda, 'consensoFoto')),
    fitzpatrick_q1: toFitzValue(readLaserSheetNumber(scheda, 'fitzpatrick_q1')),
    fitzpatrick_q2: toFitzValue(readLaserSheetNumber(scheda, 'fitzpatrick_q2')),
    fitzpatrick_q3: toFitzValue(readLaserSheetNumber(scheda, 'fitzpatrick_q3')),
    fitzpatrick_q4: toFitzValue(readLaserSheetNumber(scheda, 'fitzpatrick_q4')),
    fitzpatrick_q5: toFitzValue(readLaserSheetNumber(scheda, 'fitzpatrick_q5')),
    fitzpatrick_q6: toFitzValue(readLaserSheetNumber(scheda, 'fitzpatrick_q6')),
    fitzpatrick_q7: toFitzValue(readLaserSheetNumber(scheda, 'fitzpatrick_q7')),
    fitzpatrick_q8: toFitzValue(readLaserSheetNumber(scheda, 'fitzpatrick_q8')),
    fitzpatrick_q9: toFitzValue(readLaserSheetNumber(scheda, 'fitzpatrick_q9')),
    fitzpatrick_q10: toFitzValue(readLaserSheetNumber(scheda, 'fitzpatrick_q10')),
  }
  formSnapshot.value = { ...form.value }
  isHydratingForm.value = false
}

function upsertString(record: LaserSheetRecord, key: string, value: unknown) {
  const normalized = normalizeString(value)
  if (!normalized) return
  record[key] = normalized
}

function upsertNumber(record: LaserSheetRecord, key: string, value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return
  record[key] = Math.max(0, Math.round(parsed))
}

function buildRecordFromForm(values: LaserSheetForm) {
  const record: LaserSheetRecord = {}
  const normalizedGender = normalizeString(values.clientGender).toUpperCase()
  const includeWomanFields = normalizedGender !== 'M'
  const includeManFields = normalizedGender !== 'F'

  upsertString(record, 'documentDate', values.documentDate)
  upsertString(record, 'operatorName', values.operatorName)
  upsertString(record, 'clientAddress', values.clientAddress)
  upsertString(record, 'clientGender', values.clientGender)
  upsertString(record, 'epilationAlreadyDone', values.epilationAlreadyDone)
  upsertString(record, 'epilationAreasDone', values.epilationAreasDone)
  upsertString(record, 'epilationResults', values.epilationResults)
  upsertString(record, 'epilationCurrentMethods', values.epilationCurrentMethods)
  if (includeWomanFields) {
    upsertString(record, 'medsWomanAnticoncezionali', values.medsWomanAnticoncezionali)
    upsertString(record, 'medsWomanAnabolizzanti', values.medsWomanAnabolizzanti)
    upsertString(record, 'medsWomanCortisonici', values.medsWomanCortisonici)
    upsertString(record, 'medsWomanAltri', values.medsWomanAltri)
    upsertString(record, 'gravidanzaAllattamento', values.gravidanzaAllattamento)
    upsertString(record, 'cicloRegolare', values.cicloRegolare)
  }
  if (includeManFields) {
    upsertString(record, 'medsManRicrescitaCapelli', values.medsManRicrescitaCapelli)
    upsertString(record, 'medsManAnabolizzanti', values.medsManAnabolizzanti)
    upsertString(record, 'medsManCortisonici', values.medsManCortisonici)
    upsertString(record, 'medsManAltri', values.medsManAltri)
  }
  upsertString(record, 'pacemaker', values.pacemaker)
  upsertString(record, 'epilessia', values.epilessia)
  upsertString(record, 'zonaInteresse', values.zonaInteresse)
  upsertString(record, 'consensoFoto', values.consensoFoto)
  upsertNumber(record, 'clientAge', values.clientAge)

  for (const fitzKey of LASER_SHEET_FITZPATRICK_IDS) {
    const value = values[fitzKey]
    if (!value) continue
    upsertNumber(record, fitzKey, value)
  }

  return record
}

function nextLaserSheetNumber() {
  const max = clientStore.itemsActiveArray.reduce((best, client) => {
    const currentNumber = Number(client.schedaLaserNumber)
    if (!Number.isFinite(currentNumber)) return best
    return Math.max(best, Math.round(currentNumber))
  }, 0)
  return max + 1
}

async function loadItem() {
  isLoading.value = true
  try {
    current.value = await clientStore.ensureOne(routeId.value)
    if (!current.value) {
      toast.warning('Cliente non trovato')
      return
    }

    setFormFromClient(current.value)
  } catch (error) {
    console.error(error)
    toast.error('Errore caricamento scheda laser')
  } finally {
    isLoading.value = false
  }
}

async function saveLaserSheet() {
  if (!current.value || isSaving.value) return
  const documentDate = normalizeDateInput(form.value.documentDate)
  if (!documentDate) {
    toast.error('Inserisci la data della scheda laser')
    return
  }

  const timestamp = Timestamp.fromDate(new Date(`${documentDate}T12:00:00`))
  const record = buildRecordFromForm(form.value)
  if (!Object.keys(record).length) {
    toast.error('Compila almeno un campo della scheda laser')
    return
  }

  isSaving.value = true
  try {
    const changedKeys = changedFormKeys(formSnapshot.value, form.value)
    const changedSet = new Set(changedKeys)
    const currentSkipped = normalizeStringArray(current.value.laserShareSkippedKeys)
    const nextSkipped = currentSkipped.filter((key) => !changedSet.has(key))
    const payload: Record<string, unknown> = {
      schedaLaser: record,
      dataSchiedaLaser: timestamp,
      laserShareSkippedKeys: nextSkipped,
      updateBy: defaultUpdateBy(),
    }
    if (!current.value.schedaLaserNumber) {
      payload.schedaLaserNumber = nextLaserSheetNumber()
    }
    await current.value.update(payload)
    await loadItem()
    toast.success('Scheda laser salvata')
  } catch (error) {
    console.error(error)
    toast.error('Errore salvataggio scheda laser')
  } finally {
    isSaving.value = false
  }
}

function resetFormValues() {
  if (!current.value) return
  setFormFromClient(current.value)
  toast.success('Campi ripristinati')
}

function sanitizeFileName(name: string) {
  const safe = normalizeString(name)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return safe || 'file'
}

function stripFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0) return fileName
  return fileName.slice(0, dotIndex)
}

async function uploadLaserDocuments(files: File[]) {
  if (!current.value || isUploadingDocs.value) return
  if (!clientStore.storageFolder) {
    toast.error('Storage clienti non disponibile')
    return
  }
  if (!files.length) {
    toast.warning('Seleziona almeno un file')
    return
  }

  isUploadingDocs.value = true
  try {
    const batchId = Date.now()
    const uploadedUrls = await uploadFilesToUrls(files, async (file, index) => {
      const extension = getFileExtension(file)
      const baseName = sanitizeFileName(stripFileExtension(file.name))
      const path = extension
        ? `${current.value!.id}/laser/docs/${batchId}_${index}_${baseName}.${extension}`
        : `${current.value!.id}/laser/docs/${batchId}_${index}_${baseName}`
      const uploaded = await clientStore.storageFolder!.update(path, file)
      return uploaded.url
    })

    if (!uploadedUrls.length) {
      toast.warning('Nessun file caricato')
      return
    }

    await current.value.update({
      laserDocUrls: [...(current.value.laserDocUrls ?? []), ...uploadedUrls],
      updateBy: defaultUpdateBy(),
    })
    await loadItem()
    toast.success('Documenti caricati')
  } catch (error) {
    console.error(error)
    toast.error('Errore upload file')
  } finally {
    isUploadingDocs.value = false
  }
}

async function removeLaserFile(url: string) {
  if (!current.value || isDeletingFile.value) return
  const ok = window.confirm('Eliminare definitivamente questo file?')
  if (!ok) return

  isDeletingFile.value = true
  try {
    await clientStore.storageFolder?.removeFromUrl(url)
    await current.value.update({
      laserDocUrls: (current.value.laserDocUrls ?? []).filter((item) => item !== url),
      laserMediaUrls: (current.value.laserMediaUrls ?? []).filter((item) => item !== url),
      updateBy: defaultUpdateBy(),
    })
    await loadItem()
    toast.success('File eliminato')
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione file')
  } finally {
    isDeletingFile.value = false
  }
}

function openShareTokenModal() {
  selectedShareTtl.value = 3
  isShareTokenModalOpen.value = true
}

function closeShareTokenModal() {
  if (isCreatingShareToken.value) return
  isShareTokenModalOpen.value = false
}

async function createShareToken() {
  if (!current.value || isCreatingShareToken.value) return
  if (!canCreateShareToken.value) {
    toast.warning('Per creare il link pubblico serve il numero di telefono del cliente')
    return
  }

  isCreatingShareToken.value = true
  try {
    const response = await createClientLaserShareToken({
      clientId: current.value.id,
      ttlHours: selectedShareTtl.value,
    })
    const expiresAt = asDate(response.expiresAt)
    current.value.laserShareToken = normalizeString(response.token)
    current.value.laserShareTokenOperatorFirstName = normalizeString(response.operatorFirstName)
    current.value.laserShareTokenCreatedAt = Timestamp.fromDate(new Date())
    current.value.laserShareTokenExpiresAt = expiresAt ? Timestamp.fromDate(expiresAt) : undefined
    isShareTokenModalOpen.value = false
    toast.success('Link pubblico creato con successo')
  } catch (error) {
    console.error(error)
    const message = normalizeString((error as Error)?.message)
    toast.error(message || 'Errore creazione link pubblico')
  } finally {
    isCreatingShareToken.value = false
  }
}

async function revokeShareToken() {
  if (!current.value || !shareToken.value || isRevokingShareToken.value) return
  const confirmed = window.confirm('Revocare il link pubblico di compilazione cliente?')
  if (!confirmed) return

  isRevokingShareToken.value = true
  try {
    await revokeClientLaserShareToken({ clientId: current.value.id })
    current.value.laserShareToken = undefined
    current.value.laserShareTokenHash = undefined
    current.value.laserShareTokenExpiresAt = undefined
    current.value.laserShareTokenCreatedAt = undefined
    current.value.laserShareTokenOperatorFirstName = undefined
    shareQrDataUrl.value = ''
    toast.success('Link pubblico revocato')
  } catch (error) {
    console.error(error)
    const message = normalizeString((error as Error)?.message)
    toast.error(message || 'Errore revoca link pubblico')
  } finally {
    isRevokingShareToken.value = false
  }
}

function fallbackCopyText(value: string) {
  const textArea = document.createElement('textarea')
  textArea.value = value
  textArea.setAttribute('readonly', 'true')
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  textArea.style.pointerEvents = 'none'
  document.body.appendChild(textArea)
  textArea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textArea)
  if (!copied) {
    throw new Error('Copia non riuscita')
  }
}

async function copyShareLink() {
  if (!shareLink.value || isCopyingShareLink.value) return
  isCopyingShareLink.value = true
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareLink.value)
    } else {
      fallbackCopyText(shareLink.value)
    }
    toast.success('Link copiato negli appunti')
  } catch (error) {
    console.error(error)
    toast.error('Impossibile copiare il link')
  } finally {
    isCopyingShareLink.value = false
  }
}

function buildShareLinkWhatsAppMessage() {
  const clientFirstName = normalizeString(current.value?.name) || 'Ciao'
  const operatorName = normalizeString(shareOperatorFirstName.value) || 'operatore'
  return [
    `Ciao ${clientFirstName},`,
    'per preparare al meglio il trattamento laser abbiamo bisogno di alcune informazioni preliminari.',
    'Puoi compilare la scheda da questo link:',
    shareLink.value,
    '',
    `Grazie, ${operatorName}.`,
  ].join('\n')
}

function sendShareLinkOnWhatsApp() {
  if (!shareLink.value) {
    toast.warning('Crea prima un link pubblico da condividere')
    return
  }
  if (!shareWhatsAppPhone.value) {
    toast.warning('Numero WhatsApp cliente mancante o non valido')
    return
  }

  const message = buildShareLinkWhatsAppMessage()
  const sent = sendWhatsAppMessage(message, shareWhatsAppPhone.value)
  if (!sent) {
    toast.warning('Impossibile aprire WhatsApp su questo dispositivo')
    return
  }
  toast.success('Messaggio WhatsApp pronto')
}

function hasSkippedQuestion(key: string) {
  if (!key) return false
  return normalizeStringArray(current.value?.laserShareSkippedKeys).includes(key)
}

function isClearingSkippedKey(key: string) {
  return clearingSkippedKeys.value.includes(key)
}

function fieldKeyFromControl(control: Element | null) {
  if (!control) return ''
  if (
    !(control instanceof HTMLInputElement)
    && !(control instanceof HTMLTextAreaElement)
    && !(control instanceof HTMLSelectElement)
  ) {
    return ''
  }

  const dataKey = normalizeString(control.getAttribute('data-skip-key'))
  if (dataKey) return dataKey
  const name = normalizeString(control.name)
  if (name === 'client-gender') return 'clientGender'
  return name
}

function resolveInteractionFieldKey(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return ''
  const directControl = target.closest('input, textarea, select')
  const directKey = fieldKeyFromControl(directControl)
  if (directKey) return directKey

  const label = target.closest('label')
  if (!label) return ''
  const labelControl = label.querySelector('input, textarea, select')
  return fieldKeyFromControl(labelControl)
}

function onFormInteraction(event: Event) {
  const key = resolveInteractionFieldKey(event.target)
  if (!key || !hasSkippedQuestion(key)) return
  void clearSkippedQuestion(key, { silent: true })
}

async function clearSkippedQuestion(key: string, options?: { silent?: boolean }) {
  if (!current.value || !key || isClearingSkippedKey(key)) return
  const skipped = normalizeStringArray(current.value.laserShareSkippedKeys)
  if (!skipped.includes(key)) return

  const nextSkipped = skipped.filter((item) => item !== key)
  clearingSkippedKeys.value = [...clearingSkippedKeys.value, key]
  current.value.laserShareSkippedKeys = nextSkipped

  try {
    await current.value.update({
      laserShareSkippedKeys: nextSkipped,
      updateBy: defaultUpdateBy(),
    })
    if (!options?.silent) {
      toast.success('Chiarimento segnato come gestito')
    }
  } catch (error) {
    console.error(error)
    current.value.laserShareSkippedKeys = skipped
    if (!options?.silent) {
      toast.error('Errore aggiornamento chiarimenti')
    }
  } finally {
    clearingSkippedKeys.value = clearingSkippedKeys.value.filter((item) => item !== key)
  }
}

function fileNameFromUrl(url: string) {
  const normalized = String(url ?? '')
  const withoutQuery = normalized.split('?')[0] ?? ''
  const rawTail = withoutQuery.split('/').pop() ?? 'file'
  const decodedTail = safeDecodeURIComponent(rawTail)
  const decodedSegments = decodedTail.split('/').filter(Boolean)
  if (decodedSegments.length) {
    return decodedSegments[decodedSegments.length - 1] ?? 'file'
  }

  const rawSegments = rawTail.split(/%2f/i).filter(Boolean)
  const candidate = rawSegments[rawSegments.length - 1] ?? rawTail
  return safeDecodeURIComponent(candidate) || 'file'
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value)
  } catch (error) {
    return value
  }
}

function downloadFile(url: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileNameFromUrl(url)
  anchor.target = '_blank'
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}

function fitzScoreFromForm(values: LaserSheetForm) {
  const record = buildRecordFromForm(values)
  return computeFitzpatrickScore(record)
}

function fitzPhototypeFromForm(values: LaserSheetForm) {
  return resolveFitzpatrickPhototype(fitzScoreFromForm(values))
}

function formatTimestamp(value: unknown) {
  const date = asDate(value)
  if (!date) return '-'
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function fillOrFallback(value: unknown, fallback = '-') {
  const normalized = normalizeString(value)
  return normalized || fallback
}

function drawTextFromTop(
  page: PDFPage,
  text: string,
  x: number,
  top: number,
  size: number,
  font: PDFFont,
  color = rgb(0.08, 0.08, 0.08),
  maxWidth?: number,
) {
  const y = page.getHeight() - top
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color,
    maxWidth,
  })
}

function drawCenteredTextFromTop(
  page: PDFPage,
  text: string,
  top: number,
  size: number,
  font: PDFFont,
  color = rgb(0.08, 0.08, 0.08),
) {
  const normalized = normalizeString(text)
  if (!normalized) return
  const width = font.widthOfTextAtSize(normalized, size)
  const x = Math.max(24, (page.getWidth() - width) / 2)
  drawTextFromTop(page, normalized, x, top, size, font, color)
}

function wrapText(text: string, maxLength = 74) {
  const normalized = normalizeString(text)
  if (!normalized) return [] as string[]
  const words = normalized.split(/\s+/)
  const rows: string[] = []
  let currentRow = ''
  for (const word of words) {
    const candidate = currentRow ? `${currentRow} ${word}` : word
    if (candidate.length > maxLength && currentRow) {
      rows.push(currentRow)
      currentRow = word
      continue
    }
    currentRow = candidate
  }
  if (currentRow) rows.push(currentRow)
  return rows
}

function drawWrappedRows(
  page: PDFPage,
  text: string,
  x: number,
  top: number,
  size: number,
  font: PDFFont,
  maxLength = 74,
  rowHeight = 11,
) {
  const rows = wrapText(text, maxLength)
  rows.forEach((row, index) => {
    drawTextFromTop(page, row, x, top + (index * rowHeight), size, font)
  })
}

async function buildCompiledPdfBytes(client: CurrentClient, values: LaserSheetForm) {
  const response = await fetch('/NUOVA%20SCHEDA%20CLIENTI%20-%20CONSENSO%20INFORMATO_210505_new%202022.pdf')
  if (!response.ok) {
    throw new Error('Template PDF non disponibile')
  }

  const sourceBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(sourceBytes)
  const baseFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pages = pdfDoc.getPages()
  const page1 = pages[0]
  const page2 = pages[1]
  const page3 = pages[2]
  const page4 = pages[3]
  if (!page1 || !page2 || !page3 || !page4) {
    throw new Error('Template PDF incompleto')
  }

  const score = fitzScoreFromForm(values)
  const phototype = fitzPhototypeFromForm(values)
  const fullName = `${normalizeString(client.name)} ${normalizeString(client.surname)}`.trim()
  const primaryPhone = fillOrFallback(client.phone_number)
  const email = fillOrFallback(client.email)
  const address = fillOrFallback(values.clientAddress)
  const operatorName = fillOrFallback(values.operatorName)
  const documentDate = fillOrFallback(values.documentDate)
  const age = fillOrFallback(values.clientAge || ageFromBirthdate(client.birthdate))
  const gender = fillOrFallback(values.clientGender)
  const schedaNumber = client.schedaLaserNumber ? String(client.schedaLaserNumber) : '-'

  drawTextFromTop(page1, `Scheda n. ${schedaNumber}`, 40, 34, 10, boldFont)
  drawCenteredTextFromTop(page1, fullName || 'Cliente', 52, 13, boldFont)

  const page2HeaderShift = 14
  const page2MainShift = 22
  const page2FitzShift = 13

  drawTextFromTop(page2, documentDate, 72, 91 + page2HeaderShift, 10, baseFont)
  drawTextFromTop(page2, operatorName, 310, 91 + page2HeaderShift, 10, baseFont)
  drawTextFromTop(page2, fullName, 82, 129 + page2MainShift, 10, baseFont)
  drawTextFromTop(page2, age, 510, 129 + page2MainShift, 10, baseFont)
  drawTextFromTop(page2, address, 82, 150 + page2MainShift, 10, baseFont, rgb(0.08, 0.08, 0.08), 370)
  drawTextFromTop(page2, gender, 540, 150 + page2MainShift, 10, boldFont)
  drawTextFromTop(page2, email, 82, 172 + page2MainShift, 9, baseFont, rgb(0.08, 0.08, 0.08), 320)
  drawTextFromTop(page2, primaryPhone, 446, 172 + page2MainShift, 9, baseFont, rgb(0.08, 0.08, 0.08), 112)

  drawTextFromTop(page2, fillOrFallback(values.epilationAlreadyDone), 40, 217 + page2MainShift, 9, baseFont, rgb(0.08, 0.08, 0.08), 510)
  drawTextFromTop(page2, fillOrFallback(values.epilationAreasDone), 40, 237 + page2MainShift, 9, baseFont, rgb(0.08, 0.08, 0.08), 510)
  drawTextFromTop(page2, fillOrFallback(values.epilationResults), 40, 258 + page2MainShift, 9, baseFont, rgb(0.08, 0.08, 0.08), 510)
  drawTextFromTop(page2, fillOrFallback(values.epilationCurrentMethods), 40, 279 + page2MainShift, 9, baseFont, rgb(0.08, 0.08, 0.08), 510)

  drawTextFromTop(page2, fillOrFallback(values.medsWomanAnticoncezionali), 56, 375 + page2MainShift, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.medsWomanAnabolizzanti), 56, 395 + page2MainShift, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.medsWomanCortisonici), 56, 415 + page2MainShift, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.medsWomanAltri), 56, 435 + page2MainShift, 8, baseFont, rgb(0.08, 0.08, 0.08), 120)

  drawTextFromTop(page2, fillOrFallback(values.medsManRicrescitaCapelli), 194, 375 + page2MainShift, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.medsManAnabolizzanti), 194, 395 + page2MainShift, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.medsManCortisonici), 194, 415 + page2MainShift, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.medsManAltri), 194, 435 + page2MainShift, 8, baseFont, rgb(0.08, 0.08, 0.08), 120)

  drawTextFromTop(page2, fillOrFallback(values.gravidanzaAllattamento), 372, 375 + page2MainShift, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.pacemaker), 372, 395 + page2MainShift, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.epilessia), 372, 415 + page2MainShift, 8, baseFont)

  drawTextFromTop(page2, fillOrFallback(values.cicloRegolare), 232, 463 + page2MainShift, 9, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.zonaInteresse), 362, 463 + page2MainShift, 9, baseFont, rgb(0.08, 0.08, 0.08), 185)

  const fitzRowTopOffsets = [536, 557, 577, 598, 619, 640, 661, 682, 704, 725]
  for (let index = 0; index < LASER_SHEET_FITZPATRICK_IDS.length; index += 1) {
    const key = LASER_SHEET_FITZPATRICK_IDS[index]
    if (!key) continue
    const scoreValue = values[key]
    if (scoreValue === '') continue
    const top = fitzRowTopOffsets[index]
    if (!top) continue
    drawTextFromTop(page2, String(scoreValue), 559, top + page2FitzShift, 9, boldFont)
  }
  drawTextFromTop(page2, String(score), 559, 746 + page2FitzShift, 10, boldFont)

  drawTextFromTop(page3, fullName, 65, 110, 9, baseFont, rgb(0.08, 0.08, 0.08), 220)
  drawTextFromTop(page3, fillOrFallback(values.clientAddress), 65, 134, 9, baseFont, rgb(0.08, 0.08, 0.08), 220)
  drawTextFromTop(page3, fillOrFallback(values.consensoFoto).toUpperCase(), 382, 516, 9, boldFont)
  drawTextFromTop(page3, documentDate, 69, 551, 9, baseFont)
  drawTextFromTop(page3, fullName, 286, 551, 9, baseFont)
  drawTextFromTop(page3, documentDate, 69, 595, 9, baseFont)
  drawTextFromTop(page3, fullName, 286, 595, 9, baseFont)
  drawTextFromTop(page3, documentDate, 77, 696, 9, baseFont)
  drawTextFromTop(page3, fullName, 493, 696, 9, baseFont)
  drawTextFromTop(page3, documentDate, 88, 792, 9, baseFont)
  drawTextFromTop(page3, fullName, 286, 792, 9, baseFont)

  drawTextFromTop(page4, documentDate, 40, 72, 10, baseFont)
  drawTextFromTop(page4, fullName, 230, 72, 10, baseFont, rgb(0.08, 0.08, 0.08), 220)
  drawTextFromTop(page4, `Scheda n. ${schedaNumber}`, 41, 92, 9, boldFont)
  drawTextFromTop(page4, `Punteggio questionario: ${score}`, 300, 92, 9, boldFont)
  drawTextFromTop(page4, `Fototipo: ${phototype}`, 300, 106, 9, boldFont)

  drawWrappedRows(
    page4,
    `Zona interesse: ${fillOrFallback(values.zonaInteresse, 'Non indicata')}. Note epilazione: ${fillOrFallback(
      values.epilationCurrentMethods,
      'Non indicate',
    )}.`,
    41,
    118,
    7,
    baseFont,
    98,
    8,
  )

  return pdfDoc.save()
}

async function downloadCompiledPdf() {
  if (!current.value || isDownloadingPdf.value) return
  const values = { ...form.value }
  if (!normalizeDateInput(values.documentDate)) {
    toast.error('Inserisci la data della scheda per scaricare il PDF')
    return
  }

  isDownloadingPdf.value = true
  try {
    const pdfBytes = await buildCompiledPdfBytes(current.value, values)
    const safeBytes = Uint8Array.from(pdfBytes)
    const blob = new Blob([safeBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const fullName = `${normalizeString(current.value.surname)}_${normalizeString(current.value.name)}`
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    anchor.href = url
    anchor.download = `scheda-laser-${fullName || current.value.id}.pdf`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1500)
    toast.success('PDF scheda laser scaricato')
  } catch (error) {
    console.error(error)
    toast.error('Errore generazione PDF')
  } finally {
    isDownloadingPdf.value = false
  }
}

function goBackToClient() {
  if (!routeId.value) return
  router.push({ name: 'ClientEditView', params: { id: routeId.value } })
}

function setYesNo(field: keyof LaserSheetForm, value: Exclude<YesNoValue, ''>) {
  form.value[field] = value
}

function setFitzpatrickValue(questionId: string, value: string) {
  form.value[questionId] = value
}

watch(
  () => form.value.epilationAlreadyDone,
  (value) => {
    if (normalizeString(value)) return
    form.value.epilationAreasDone = ''
    form.value.epilationResults = ''
    form.value.epilationCurrentMethods = ''
  },
)

watch(
  () => form.value.clientGender,
  (value) => {
    const normalized = normalizeString(value).toUpperCase()
    if (normalized === 'M') {
      form.value.medsWomanAnticoncezionali = 'no'
      form.value.medsWomanAnabolizzanti = 'no'
      form.value.medsWomanCortisonici = 'no'
      form.value.medsWomanAltri = ''
      form.value.gravidanzaAllattamento = 'no'
      form.value.cicloRegolare = 'no'
      return
    }
    if (normalized === 'F') {
      form.value.medsManRicrescitaCapelli = 'no'
      form.value.medsManAnabolizzanti = 'no'
      form.value.medsManCortisonici = 'no'
      form.value.medsManAltri = ''
    }
  },
)

watch(
  form,
  (next, previous) => {
    if (isHydratingForm.value || !current.value) return
    const changedKeys = changedFormKeys(previous, next)
    if (!changedKeys.length) return
    for (const key of changedKeys) {
      if (!hasSkippedQuestion(key)) continue
      void clearSkippedQuestion(key, { silent: true })
    }
  },
  { deep: true },
)

watch(
  shareLink,
  async (value) => {
    if (!value) {
      shareQrDataUrl.value = ''
      return
    }
    try {
      shareQrDataUrl.value = await QRCode.toDataURL(value, {
        width: 260,
        margin: 1,
        color: {
          dark: '#4b2935',
          light: '#0000',
        },
      })
    } catch (error) {
      console.error(error)
      shareQrDataUrl.value = ''
    }
  },
  { immediate: true },
)

onMounted(loadItem)
watch(() => route.params.id, loadItem)
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Scheda Laser" :to="{ name: 'ClientEditView', params: { id: routeId } }" />

    <div class="laser-wrapper mx-auto py-3">
      <p v-if="isLoading" class="text-muted small">Caricamento...</p>
      <template v-else-if="current">
        <article class="laser-panel laser-panel--hero">
          <div class="d-flex align-items-start justify-content-between gap-2 flex-wrap">
            <div>
              <div class="laser-client-heading">
                <Btn
                  type="button"
                  color="secondary"
                  variant="outline"
                  icon="arrow_back"
                  title="Torna al cliente"
                  aria-label="Torna al cliente"
                  @click="goBackToClient"
                />
                <h2 class="h6 mb-1 laser-panel__title-main">
                  {{ current.name }} {{ current.surname }}
                </h2>
              </div>
              <p class="small text-muted mb-0 laser-panel__subtitle">
                Scheda n. {{ current.schedaLaserNumber || '-' }} | Data scheda:
                {{ formatTimestamp(current.dataSchiedaLaser) }}
              </p>
            </div>
            <div class="d-flex gap-2 flex-wrap">
              <Btn type="button" color="dark" icon="download" :loading="isDownloadingPdf" @click="downloadCompiledPdf">
                Scarica PDF compilato
              </Btn>
            </div>
          </div>
        </article>

        <article class="laser-panel laser-panel--share">
          <div class="d-flex align-items-start justify-content-between gap-2 flex-wrap">
            <div>
              <h3 class="h6 mb-1">Link pubblico compilazione cliente</h3>
              <p class="small text-muted mb-0">
                Condividi un URL temporaneo con QR per permettere al cliente di compilare i campi da remoto.
              </p>
            </div>
            <div class="d-flex gap-2 flex-wrap">
              <Btn
                v-if="!hasActiveShareToken"
                type="button"
                color="dark"
                icon="qr_code_2"
                :disabled="!canCreateShareToken"
                @click="openShareTokenModal"
              >
                {{ shareTokenExpired ? 'Rigenera link' : 'Crea link' }}
              </Btn>
              <Btn
                v-if="hasActiveShareToken"
                type="button"
                color="secondary"
                variant="outline"
                icon="content_copy"
                :loading="isCopyingShareLink"
                @click="copyShareLink"
              >
                Copia link
              </Btn>
              <Btn
                v-if="hasActiveShareToken"
                type="button"
                color="dark"
                variant="outline"
                icon="send"
                :disabled="!canSendShareLinkOnWhatsApp"
                @click="sendShareLinkOnWhatsApp"
              >
                Invia su WhatsApp
              </Btn>
              <Btn
                v-if="hasActiveShareToken"
                type="button"
                color="danger"
                variant="outline"
                icon="block"
                :loading="isRevokingShareToken"
                @click="revokeShareToken"
              >
                Revoca
              </Btn>
            </div>
          </div>

          <p v-if="!canCreateShareToken" class="small text-danger mb-0 mt-2">
            Serve il numero di telefono del cliente per creare il link.
          </p>

          <div v-if="hasActiveShareToken" class="share-token-box mt-3">
            <div class="share-token-box__qr">
              <img v-if="shareQrDataUrl" :src="shareQrDataUrl" alt="QR per compilazione scheda laser cliente">
              <p v-else class="small text-muted mb-0">Generazione QR in corso...</p>
            </div>
            <div class="share-token-box__content">
              <p class="small mb-1">
                Operatore di riferimento: <strong>{{ shareOperatorFirstName }}</strong>
              </p>
              <p class="small mb-2">
                Scadenza token: <strong>{{ shareTokenExpiresAtLabel }}</strong>
              </p>
              <label class="small mb-1">Link completo</label>
              <div class="share-link-row">
                <input :value="shareLink" type="text" class="form-control" readonly>
                <Btn type="button" color="dark" icon="content_copy" :loading="isCopyingShareLink" @click="copyShareLink">
                  Copia
                </Btn>
              </div>
            </div>
          </div>
          <p v-else-if="shareTokenExpired && shareToken" class="small text-muted mb-0 mt-2">
            Il precedente link e scaduto il {{ shareTokenExpiresAtLabel }}. Creane uno nuovo per continuare.
          </p>
          <p v-else class="small text-muted mb-0 mt-2">
            Nessun link attivo. Crea un token temporaneo per condividere la compilazione.
          </p>
        </article>

        <article class="laser-panel" @click.capture="onFormInteraction" @focusin.capture="onFormInteraction">
          <h3 class="h6 mb-3">Compilazione scheda laser</h3>

          <section class="laser-form-section">
            <h4 class="laser-form-section__title">1. Dati cliente e operatore</h4>
            <div class="row g-3">
              <div class="col-12 col-md-3">
                <label class="form-label">Data documento</label>
                <input v-model="form.documentDate" type="date" class="form-control">
              </div>
              <div class="col-12 col-md-5">
                <label class="form-label">Operatrice / Operatore</label>
                <input v-model="form.operatorName" type="text" class="form-control" placeholder="Nome operatrice" />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label laser-form-label">
                  <span>Indirizzo cliente</span>
                  <button
                    v-if="hasSkippedQuestion('clientAddress')"
                    type="button"
                    class="skip-flag-btn"
                    :disabled="isClearingSkippedKey('clientAddress')"
                    title="Campo da chiarire: clicca per segnare come gestito"
                    aria-label="Segna chiarito indirizzo cliente"
                    @click="clearSkippedQuestion('clientAddress')"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">help</span>
                  </button>
                </label>
                <input
                  v-model="form.clientAddress"
                  type="text"
                  class="form-control"
                  placeholder="Indirizzo"
                  data-skip-key="clientAddress"
                />
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Nome cliente</label>
                <input :value="clientFullName" type="text" class="form-control" disabled readonly>
              </div>
              <div class="col-12 col-md-3">
                <label class="form-label">Telefono cliente</label>
                <input :value="current.phone_number || '-'" type="text" class="form-control" disabled readonly>
              </div>
              <div class="col-12 col-md-3">
                <label class="form-label">Email cliente</label>
                <input :value="current.email || '-'" type="text" class="form-control" disabled readonly>
              </div>

              <div class="col-6 col-md-3">
                <label class="form-label laser-form-label">
                  <span>Eta</span>
                  <button
                    v-if="hasSkippedQuestion('clientAge')"
                    type="button"
                    class="skip-flag-btn"
                    :disabled="isClearingSkippedKey('clientAge')"
                    title="Campo da chiarire: clicca per segnare come gestito"
                    aria-label="Segna chiarito eta cliente"
                    @click="clearSkippedQuestion('clientAge')"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">help</span>
                  </button>
                </label>
                <input v-model="form.clientAge" type="number" min="0" step="1" class="form-control" data-skip-key="clientAge">
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label d-block laser-form-label">
                  <span>Sesso</span>
                  <button
                    v-if="hasSkippedQuestion('clientGender')"
                    type="button"
                    class="skip-flag-btn"
                    :disabled="isClearingSkippedKey('clientGender')"
                    title="Campo da chiarire: clicca per segnare come gestito"
                    aria-label="Segna chiarito sesso cliente"
                    @click="clearSkippedQuestion('clientGender')"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">help</span>
                  </button>
                </label>
                <div class="chip-radio-group" role="radiogroup" aria-label="Sesso cliente">
                  <label
                    v-for="option in binaryGenderOptions"
                    :key="`gender-${option.value}`"
                    class="chip-radio"
                    :class="{ 'is-active': form.clientGender === option.value }"
                  >
                    <input
                      class="chip-radio__input"
                      type="radio"
                      name="client-gender"
                      :value="option.value"
                      :checked="form.clientGender === option.value"
                      @change="form.clientGender = option.value"
                    >
                    <span>{{ option.label }}</span>
                  </label>
                </div>
              </div>
              <div class="col-12 col-md-3">
                <label class="form-label">Operatore loggato</label>
                <input :value="operatorNameFromLogin || '-'" type="text" class="form-control" disabled readonly>
              </div>
            </div>
          </section>

          <section class="laser-form-section">
            <h4 class="laser-form-section__title">2. Questionario epilazione</h4>
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label laser-form-label">
                  <span>Ha gia effettuato trattamenti di epilazione progressiva permanente?</span>
                  <button
                    v-if="hasSkippedQuestion('epilationAlreadyDone')"
                    type="button"
                    class="skip-flag-btn"
                    :disabled="isClearingSkippedKey('epilationAlreadyDone')"
                    title="Campo da chiarire: clicca per segnare come gestito"
                    aria-label="Segna chiarito epilazione gia effettuata"
                    @click="clearSkippedQuestion('epilationAlreadyDone')"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">help</span>
                  </button>
                </label>
                <textarea
                  v-model="form.epilationAlreadyDone"
                  rows="2"
                  class="form-control"
                  placeholder="Descrivi trattamenti precedenti oppure lascia vuoto"
                  data-skip-key="epilationAlreadyDone"
                ></textarea>
              </div>

              <template v-if="showEpilationDetails">
                <div class="col-12 col-md-6">
                  <label class="form-label laser-form-label">
                    <span>Quali aree ha trattato?</span>
                    <button
                      v-if="hasSkippedQuestion('epilationAreasDone')"
                      type="button"
                      class="skip-flag-btn"
                      :disabled="isClearingSkippedKey('epilationAreasDone')"
                      title="Campo da chiarire: clicca per segnare come gestito"
                      aria-label="Segna chiarito aree trattate"
                      @click="clearSkippedQuestion('epilationAreasDone')"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">help</span>
                    </button>
                  </label>
                  <textarea v-model="form.epilationAreasDone" rows="2" class="form-control" data-skip-key="epilationAreasDone"></textarea>
                </div>
                <div class="col-12 col-md-6">
                  <label class="form-label laser-form-label">
                    <span>Che tipo di risultati ha ottenuto?</span>
                    <button
                      v-if="hasSkippedQuestion('epilationResults')"
                      type="button"
                      class="skip-flag-btn"
                      :disabled="isClearingSkippedKey('epilationResults')"
                      title="Campo da chiarire: clicca per segnare come gestito"
                      aria-label="Segna chiarito risultati epilazione"
                      @click="clearSkippedQuestion('epilationResults')"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">help</span>
                    </button>
                  </label>
                  <textarea v-model="form.epilationResults" rows="2" class="form-control" data-skip-key="epilationResults"></textarea>
                </div>
                <div class="col-12">
                  <label class="form-label laser-form-label">
                    <span>Quali metodi usa abitualmente per depilarsi?</span>
                    <button
                      v-if="hasSkippedQuestion('epilationCurrentMethods')"
                      type="button"
                      class="skip-flag-btn"
                      :disabled="isClearingSkippedKey('epilationCurrentMethods')"
                      title="Campo da chiarire: clicca per segnare come gestito"
                      aria-label="Segna chiarito metodi depilazione"
                      @click="clearSkippedQuestion('epilationCurrentMethods')"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">help</span>
                    </button>
                  </label>
                  <textarea
                    v-model="form.epilationCurrentMethods"
                    rows="2"
                    class="form-control"
                    data-skip-key="epilationCurrentMethods"
                  ></textarea>
                </div>
              </template>
              <p v-else class="small text-muted mb-0">
                Compila la prima domanda per mostrare le domande successive del questionario epilazione.
              </p>
            </div>
          </section>

          <section class="laser-form-section">
            <h4 class="laser-form-section__title">3. Farmaci e condizioni</h4>
            <div class="row g-3">
              <div v-if="isWomanFlow" class="col-12 col-lg-6">
                <p class="laser-subsection__title">Area donna</p>
                <div class="vstack gap-2">
                  <div class="toggle-row">
                    <span class="toggle-row__label laser-inline-label">
                      <span>Anticoncezionali</span>
                      <button
                        v-if="hasSkippedQuestion('medsWomanAnticoncezionali')"
                        type="button"
                        class="skip-flag-btn"
                        :disabled="isClearingSkippedKey('medsWomanAnticoncezionali')"
                        title="Campo da chiarire: clicca per segnare come gestito"
                        aria-label="Segna chiarito anticoncezionali"
                        @click="clearSkippedQuestion('medsWomanAnticoncezionali')"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">help</span>
                      </button>
                    </span>
                    <div class="yes-no-switch">
                      <label
                        v-for="option in yesNoOptions"
                        :key="`medsWomanAnticoncezionali-${option.value}`"
                        class="yes-no-switch__option"
                        :class="{ 'is-active': form.medsWomanAnticoncezionali === option.value }"
                      >
                        <input
                          class="yes-no-switch__input"
                          type="radio"
                          name="medsWomanAnticoncezionali"
                          :value="option.value"
                          :checked="form.medsWomanAnticoncezionali === option.value"
                          @change="setYesNo('medsWomanAnticoncezionali', option.value)"
                        >
                        <span>{{ option.label }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="toggle-row">
                    <span class="toggle-row__label laser-inline-label">
                      <span>Anabolizzanti</span>
                      <button
                        v-if="hasSkippedQuestion('medsWomanAnabolizzanti')"
                        type="button"
                        class="skip-flag-btn"
                        :disabled="isClearingSkippedKey('medsWomanAnabolizzanti')"
                        title="Campo da chiarire: clicca per segnare come gestito"
                        aria-label="Segna chiarito anabolizzanti donna"
                        @click="clearSkippedQuestion('medsWomanAnabolizzanti')"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">help</span>
                      </button>
                    </span>
                    <div class="yes-no-switch">
                      <label
                        v-for="option in yesNoOptions"
                        :key="`medsWomanAnabolizzanti-${option.value}`"
                        class="yes-no-switch__option"
                        :class="{ 'is-active': form.medsWomanAnabolizzanti === option.value }"
                      >
                        <input
                          class="yes-no-switch__input"
                          type="radio"
                          name="medsWomanAnabolizzanti"
                          :value="option.value"
                          :checked="form.medsWomanAnabolizzanti === option.value"
                          @change="setYesNo('medsWomanAnabolizzanti', option.value)"
                        >
                        <span>{{ option.label }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="toggle-row">
                    <span class="toggle-row__label laser-inline-label">
                      <span>Cortisonici</span>
                      <button
                        v-if="hasSkippedQuestion('medsWomanCortisonici')"
                        type="button"
                        class="skip-flag-btn"
                        :disabled="isClearingSkippedKey('medsWomanCortisonici')"
                        title="Campo da chiarire: clicca per segnare come gestito"
                        aria-label="Segna chiarito cortisonici donna"
                        @click="clearSkippedQuestion('medsWomanCortisonici')"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">help</span>
                      </button>
                    </span>
                    <div class="yes-no-switch">
                      <label
                        v-for="option in yesNoOptions"
                        :key="`medsWomanCortisonici-${option.value}`"
                        class="yes-no-switch__option"
                        :class="{ 'is-active': form.medsWomanCortisonici === option.value }"
                      >
                        <input
                          class="yes-no-switch__input"
                          type="radio"
                          name="medsWomanCortisonici"
                          :value="option.value"
                          :checked="form.medsWomanCortisonici === option.value"
                          @change="setYesNo('medsWomanCortisonici', option.value)"
                        >
                        <span>{{ option.label }}</span>
                      </label>
                    </div>
                  </div>
                  <label class="small mb-0 laser-form-label">
                    <span>Altri farmaci</span>
                    <button
                      v-if="hasSkippedQuestion('medsWomanAltri')"
                      type="button"
                      class="skip-flag-btn"
                      :disabled="isClearingSkippedKey('medsWomanAltri')"
                      title="Campo da chiarire: clicca per segnare come gestito"
                      aria-label="Segna chiarito altri farmaci donna"
                      @click="clearSkippedQuestion('medsWomanAltri')"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">help</span>
                    </button>
                  </label>
                  <input v-model="form.medsWomanAltri" type="text" class="form-control form-control-sm" data-skip-key="medsWomanAltri" />
                  <div class="toggle-row">
                    <span class="toggle-row__label laser-inline-label">
                      <span>Gravidanza / allattamento</span>
                      <button
                        v-if="hasSkippedQuestion('gravidanzaAllattamento')"
                        type="button"
                        class="skip-flag-btn"
                        :disabled="isClearingSkippedKey('gravidanzaAllattamento')"
                        title="Campo da chiarire: clicca per segnare come gestito"
                        aria-label="Segna chiarito gravidanza o allattamento"
                        @click="clearSkippedQuestion('gravidanzaAllattamento')"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">help</span>
                      </button>
                    </span>
                    <div class="yes-no-switch">
                      <label
                        v-for="option in yesNoOptions"
                        :key="`gravidanzaAllattamento-${option.value}`"
                        class="yes-no-switch__option"
                        :class="{ 'is-active': form.gravidanzaAllattamento === option.value }"
                      >
                        <input
                          class="yes-no-switch__input"
                          type="radio"
                          name="gravidanzaAllattamento"
                          :value="option.value"
                          :checked="form.gravidanzaAllattamento === option.value"
                          @change="setYesNo('gravidanzaAllattamento', option.value)"
                        >
                        <span>{{ option.label }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="toggle-row">
                    <span class="toggle-row__label laser-inline-label">
                      <span>Ciclo mestruale regolare</span>
                      <button
                        v-if="hasSkippedQuestion('cicloRegolare')"
                        type="button"
                        class="skip-flag-btn"
                        :disabled="isClearingSkippedKey('cicloRegolare')"
                        title="Campo da chiarire: clicca per segnare come gestito"
                        aria-label="Segna chiarito ciclo regolare"
                        @click="clearSkippedQuestion('cicloRegolare')"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">help</span>
                      </button>
                    </span>
                    <div class="yes-no-switch">
                      <label
                        v-for="option in yesNoOptions"
                        :key="`cicloRegolare-${option.value}`"
                        class="yes-no-switch__option"
                        :class="{ 'is-active': form.cicloRegolare === option.value }"
                      >
                        <input
                          class="yes-no-switch__input"
                          type="radio"
                          name="cicloRegolare"
                          :value="option.value"
                          :checked="form.cicloRegolare === option.value"
                          @change="setYesNo('cicloRegolare', option.value)"
                        >
                        <span>{{ option.label }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="isManFlow" class="col-12 col-lg-6">
                <p class="laser-subsection__title">Area uomo</p>
                <div class="vstack gap-2">
                  <div class="toggle-row">
                    <span class="toggle-row__label laser-inline-label">
                      <span>Ricrescita capelli</span>
                      <button
                        v-if="hasSkippedQuestion('medsManRicrescitaCapelli')"
                        type="button"
                        class="skip-flag-btn"
                        :disabled="isClearingSkippedKey('medsManRicrescitaCapelli')"
                        title="Campo da chiarire: clicca per segnare come gestito"
                        aria-label="Segna chiarito ricrescita capelli"
                        @click="clearSkippedQuestion('medsManRicrescitaCapelli')"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">help</span>
                      </button>
                    </span>
                    <div class="yes-no-switch">
                      <label
                        v-for="option in yesNoOptions"
                        :key="`medsManRicrescitaCapelli-${option.value}`"
                        class="yes-no-switch__option"
                        :class="{ 'is-active': form.medsManRicrescitaCapelli === option.value }"
                      >
                        <input
                          class="yes-no-switch__input"
                          type="radio"
                          name="medsManRicrescitaCapelli"
                          :value="option.value"
                          :checked="form.medsManRicrescitaCapelli === option.value"
                          @change="setYesNo('medsManRicrescitaCapelli', option.value)"
                        >
                        <span>{{ option.label }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="toggle-row">
                    <span class="toggle-row__label laser-inline-label">
                      <span>Anabolizzanti</span>
                      <button
                        v-if="hasSkippedQuestion('medsManAnabolizzanti')"
                        type="button"
                        class="skip-flag-btn"
                        :disabled="isClearingSkippedKey('medsManAnabolizzanti')"
                        title="Campo da chiarire: clicca per segnare come gestito"
                        aria-label="Segna chiarito anabolizzanti uomo"
                        @click="clearSkippedQuestion('medsManAnabolizzanti')"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">help</span>
                      </button>
                    </span>
                    <div class="yes-no-switch">
                      <label
                        v-for="option in yesNoOptions"
                        :key="`medsManAnabolizzanti-${option.value}`"
                        class="yes-no-switch__option"
                        :class="{ 'is-active': form.medsManAnabolizzanti === option.value }"
                      >
                        <input
                          class="yes-no-switch__input"
                          type="radio"
                          name="medsManAnabolizzanti"
                          :value="option.value"
                          :checked="form.medsManAnabolizzanti === option.value"
                          @change="setYesNo('medsManAnabolizzanti', option.value)"
                        >
                        <span>{{ option.label }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="toggle-row">
                    <span class="toggle-row__label laser-inline-label">
                      <span>Cortisonici</span>
                      <button
                        v-if="hasSkippedQuestion('medsManCortisonici')"
                        type="button"
                        class="skip-flag-btn"
                        :disabled="isClearingSkippedKey('medsManCortisonici')"
                        title="Campo da chiarire: clicca per segnare come gestito"
                        aria-label="Segna chiarito cortisonici uomo"
                        @click="clearSkippedQuestion('medsManCortisonici')"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">help</span>
                      </button>
                    </span>
                    <div class="yes-no-switch">
                      <label
                        v-for="option in yesNoOptions"
                        :key="`medsManCortisonici-${option.value}`"
                        class="yes-no-switch__option"
                        :class="{ 'is-active': form.medsManCortisonici === option.value }"
                      >
                        <input
                          class="yes-no-switch__input"
                          type="radio"
                          name="medsManCortisonici"
                          :value="option.value"
                          :checked="form.medsManCortisonici === option.value"
                          @change="setYesNo('medsManCortisonici', option.value)"
                        >
                        <span>{{ option.label }}</span>
                      </label>
                    </div>
                  </div>
                  <label class="small mb-0 laser-form-label">
                    <span>Altri farmaci</span>
                    <button
                      v-if="hasSkippedQuestion('medsManAltri')"
                      type="button"
                      class="skip-flag-btn"
                      :disabled="isClearingSkippedKey('medsManAltri')"
                      title="Campo da chiarire: clicca per segnare come gestito"
                      aria-label="Segna chiarito altri farmaci uomo"
                      @click="clearSkippedQuestion('medsManAltri')"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">help</span>
                    </button>
                  </label>
                  <input v-model="form.medsManAltri" type="text" class="form-control form-control-sm" data-skip-key="medsManAltri" />
                </div>
              </div>

              <div class="col-12 col-lg-6">
                <p class="laser-subsection__title">Condizioni generali</p>
                <div class="vstack gap-2">
                  <div class="toggle-row">
                    <span class="toggle-row__label laser-inline-label">
                      <span>Pacemaker</span>
                      <button
                        v-if="hasSkippedQuestion('pacemaker')"
                        type="button"
                        class="skip-flag-btn"
                        :disabled="isClearingSkippedKey('pacemaker')"
                        title="Campo da chiarire: clicca per segnare come gestito"
                        aria-label="Segna chiarito pacemaker"
                        @click="clearSkippedQuestion('pacemaker')"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">help</span>
                      </button>
                    </span>
                    <div class="yes-no-switch">
                      <label
                        v-for="option in yesNoOptions"
                        :key="`pacemaker-${option.value}`"
                        class="yes-no-switch__option"
                        :class="{ 'is-active': form.pacemaker === option.value }"
                      >
                        <input
                          class="yes-no-switch__input"
                          type="radio"
                          name="pacemaker"
                          :value="option.value"
                          :checked="form.pacemaker === option.value"
                          @change="setYesNo('pacemaker', option.value)"
                        >
                        <span>{{ option.label }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="toggle-row">
                    <span class="toggle-row__label laser-inline-label">
                      <span>Epilessia</span>
                      <button
                        v-if="hasSkippedQuestion('epilessia')"
                        type="button"
                        class="skip-flag-btn"
                        :disabled="isClearingSkippedKey('epilessia')"
                        title="Campo da chiarire: clicca per segnare come gestito"
                        aria-label="Segna chiarito epilessia"
                        @click="clearSkippedQuestion('epilessia')"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">help</span>
                      </button>
                    </span>
                    <div class="yes-no-switch">
                      <label
                        v-for="option in yesNoOptions"
                        :key="`epilessia-${option.value}`"
                        class="yes-no-switch__option"
                        :class="{ 'is-active': form.epilessia === option.value }"
                      >
                        <input
                          class="yes-no-switch__input"
                          type="radio"
                          name="epilessia"
                          :value="option.value"
                          :checked="form.epilessia === option.value"
                          @change="setYesNo('epilessia', option.value)"
                        >
                        <span>{{ option.label }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="toggle-row">
                    <span class="toggle-row__label laser-inline-label">
                      <span>Consenso foto</span>
                      <button
                        v-if="hasSkippedQuestion('consensoFoto')"
                        type="button"
                        class="skip-flag-btn"
                        :disabled="isClearingSkippedKey('consensoFoto')"
                        title="Campo da chiarire: clicca per segnare come gestito"
                        aria-label="Segna chiarito consenso foto"
                        @click="clearSkippedQuestion('consensoFoto')"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">help</span>
                      </button>
                    </span>
                    <div class="yes-no-switch">
                      <label
                        v-for="option in yesNoOptions"
                        :key="`consensoFoto-${option.value}`"
                        class="yes-no-switch__option"
                        :class="{ 'is-active': form.consensoFoto === option.value }"
                      >
                        <input
                          class="yes-no-switch__input"
                          type="radio"
                          name="consensoFoto"
                          :value="option.value"
                          :checked="form.consensoFoto === option.value"
                          @change="setYesNo('consensoFoto', option.value)"
                        >
                        <span>{{ option.label }}</span>
                      </label>
                    </div>
                  </div>
                  <label class="small mb-0 laser-form-label">
                    <span>Zona da trattare</span>
                    <button
                      v-if="hasSkippedQuestion('zonaInteresse')"
                      type="button"
                      class="skip-flag-btn"
                      :disabled="isClearingSkippedKey('zonaInteresse')"
                      title="Campo da chiarire: clicca per segnare come gestito"
                      aria-label="Segna chiarito zona da trattare"
                      @click="clearSkippedQuestion('zonaInteresse')"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">help</span>
                    </button>
                  </label>
                  <input
                    v-model="form.zonaInteresse"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Es. inguine, gambe, ascelle..."
                    data-skip-key="zonaInteresse"
                  />
                </div>
              </div>
            </div>
          </section>

          <section class="laser-form-section">
            <h4 class="laser-form-section__title">4. Questionario Fitzpatrick</h4>
            <div class="vstack gap-2">
              <div v-for="question in FITZPATRICK_QUESTIONS" :key="question.id" class="fitz-row">
                <label class="small fw-semibold mb-1 laser-form-label">
                  <span>{{ question.label }}</span>
                  <button
                    v-if="hasSkippedQuestion(question.id)"
                    type="button"
                    class="skip-flag-btn"
                    :disabled="isClearingSkippedKey(question.id)"
                    title="Campo da chiarire: clicca per segnare come gestito"
                    :aria-label="`Segna chiarita domanda ${question.label}`"
                    @click="clearSkippedQuestion(question.id)"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">help</span>
                  </button>
                </label>
                <div class="fitz-options">
                  <label
                    v-for="option in question.options"
                    :key="`${question.id}-${option.value}`"
                    class="fitz-option"
                    :class="{ 'is-active': form[question.id] === String(option.value) }"
                    :title="option.label"
                  >
                    <input
                      class="fitz-option__input"
                      type="radio"
                      :name="question.id"
                      :value="String(option.value)"
                      :checked="form[question.id] === String(option.value)"
                      @change="setFitzpatrickValue(question.id, String(option.value))"
                    >
                    <span class="fitz-option__text">{{ option.value }} : {{ option.label }}</span>
                  </label>
                </div>
              </div>
            </div>
            <p class="small text-muted mt-2 mb-0">
              Totale attuale: {{ fitzScoreFromForm(form) }} / 40 - Fototipo: {{ fitzPhototypeFromForm(form) }}
            </p>
          </section>

          <div class="d-flex gap-2 mt-3 flex-wrap">
            <Btn type="button" color="dark" icon="save" :loading="isSaving" @click="saveLaserSheet">
              Salva scheda laser
            </Btn>
            <Btn type="button" color="secondary" variant="outline" icon="restart_alt" :disabled="isSaving" @click="resetFormValues">
              Ripristina campi
            </Btn>
          </div>
        </article>

        <article class="laser-panel">
          <ClientFilesGallery
            section-title="Documenti scheda laser"
            field-name="laser-documents"
            :urls="laserDocumentUrls"
            empty-text="Nessun documento scheda laser."
            :is-uploading="isUploadingDocs"
            :is-deleting="isDeletingFile"
            :upload-files="uploadLaserDocuments"
            :download-file="downloadFile"
            :delete-file="removeLaserFile"
          />
        </article>

        <div
          v-if="isShareTokenModalOpen"
          class="share-token-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Crea link pubblico scheda laser"
        >
          <div class="share-token-modal__backdrop" @click="closeShareTokenModal"></div>

          <div class="share-token-modal__content card border-0 shadow-lg p-3 p-md-4">
            <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
              <div>
                <h3 class="h6 mb-1">Nuovo link pubblico cliente</h3>
                <p class="small text-muted mb-0">
                  Seleziona la durata del token. Al termine mostreremo subito QR e link completo.
                </p>
              </div>
              <button type="button" class="btn-close" aria-label="Chiudi modal link pubblico" @click="closeShareTokenModal"></button>
            </div>

            <div class="share-ttl-grid mt-3">
              <label
                v-for="option in shareTtlOptions"
                :key="`share-ttl-${option.value}`"
                class="share-ttl-option"
                :class="{ 'is-active': selectedShareTtl === option.value }"
              >
                <input
                  class="share-ttl-option__input"
                  type="radio"
                  name="share-ttl"
                  :value="option.value"
                  :checked="selectedShareTtl === option.value"
                  @change="selectedShareTtl = option.value"
                >
                <span class="share-ttl-option__label">{{ option.label }}</span>
                <small class="share-ttl-option__description">{{ option.description }}</small>
              </label>
            </div>

            <div class="d-flex gap-2 mt-3 flex-wrap">
              <Btn
                type="button"
                color="dark"
                icon="qr_code_2"
                :loading="isCreatingShareToken"
                :disabled="!canCreateShareToken"
                @click="createShareToken"
              >
                Crea link e QR
              </Btn>
              <Btn
                type="button"
                color="secondary"
                variant="outline"
                :disabled="isCreatingShareToken"
                @click="closeShareTokenModal"
              >
                Annulla
              </Btn>
            </div>
          </div>
        </div>
      </template>
      <p v-else class="text-muted small">Cliente non trovato.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.laser-wrapper {
  max-width: 980px;
  display: grid;
  gap: 0.9rem;
}

.laser-panel {
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 0.95rem;
  background:
    radial-gradient(circle at 93% 0%, rgba(232, 179, 190, 0.3) 0%, transparent 52%),
    linear-gradient(168deg, rgba(255, 255, 255, 0.95), rgba(247, 241, 242, 0.93));
  box-shadow: 0 10px 24px rgba(41, 23, 32, 0.1);
  padding: 0.95rem 1rem;
}

.laser-panel--hero {
  background:
    radial-gradient(circle at 0% 0%, rgba(31, 138, 112, 0.2) 0%, transparent 40%),
    radial-gradient(circle at 100% 100%, rgba(232, 179, 190, 0.3) 0%, transparent 45%),
    linear-gradient(165deg, rgba(255, 255, 255, 0.95), rgba(247, 241, 242, 0.9));
}

.laser-panel--share {
  border-color: rgba(14, 119, 108, 0.26);
  background:
    radial-gradient(circle at 0% 100%, rgba(31, 138, 112, 0.24) 0%, transparent 50%),
    radial-gradient(circle at 100% 0%, rgba(117, 224, 202, 0.28) 0%, transparent 50%),
    linear-gradient(167deg, rgba(243, 255, 252, 0.96), rgba(236, 251, 247, 0.92));
}

.laser-panel__title-main {
  color: #4b2935;
}

.laser-panel__subtitle {
  color: #6f4f5c !important;
}

.laser-client-heading {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.laser-client-heading :deep(button) {
  flex-shrink: 0;
}

.share-token-box {
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.86);
  padding: 0.65rem;
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 0.72rem;
}

.share-token-box__qr {
  min-height: 200px;
  border: 1px dashed rgba(84, 44, 58, 0.26);
  border-radius: 0.68rem;
  background: rgba(255, 255, 255, 0.93);
  display: grid;
  place-items: center;
  padding: 0.45rem;
}

.share-token-box__qr img {
  width: 100%;
  max-width: 190px;
  height: auto;
}

.share-token-box__content {
  min-width: 0;
}

.share-link-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.share-link-row .form-control {
  flex: 1 1 280px;
}

.laser-form-label {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
}

.laser-inline-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.skip-flag-btn {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  border: 1px solid rgba(171, 128, 26, 0.52);
  background: rgba(255, 246, 219, 0.95);
  color: #8e6917;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.skip-flag-btn .material-symbols-outlined {
  font-size: 1rem;
}

.skip-flag-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(142, 105, 23, 0.8);
}

.skip-flag-btn:disabled {
  opacity: 0.55;
}

.laser-form-section {
  border: 1px dashed rgba(84, 44, 58, 0.25);
  border-radius: 0.7rem;
  background: rgba(255, 255, 255, 0.78);
  padding: 0.75rem;
}

.laser-form-section + .laser-form-section {
  margin-top: 0.75rem;
}

.laser-form-section__title {
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #5c3543;
  margin: 0 0 0.72rem;
}

.laser-subsection__title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #6a3f4e;
  margin-bottom: 0.5rem;
}

.chip-radio-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chip-radio {
  position: relative;
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 999px;
  min-height: 2rem;
  padding: 0.36rem 0.85rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: #5c3543;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease;
}

.chip-radio.is-active {
  border-color: #5c3543;
  background: #5c3543;
  color: #fff;
}

.chip-radio__input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.toggle-row__label {
  font-size: 0.74rem;
  font-weight: 600;
  color: #5c3543;
}

.yes-no-switch {
  display: inline-flex;
  border: 1px solid rgba(84, 44, 58, 0.22);
  border-radius: 999px;
  padding: 0.12rem;
  background: rgba(255, 255, 255, 0.85);
}

.yes-no-switch__option {
  position: relative;
  min-width: 3rem;
  text-align: center;
  border-radius: 999px;
  padding: 0.22rem 0.6rem;
  font-size: 0.72rem;
  color: #6f4f5c;
  cursor: pointer;
  transition: all 0.18s ease;
}

.yes-no-switch__option.is-active {
  background: #5c3543;
  color: #fff;
}

.yes-no-switch__input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.fitz-row {
  border: 1px dashed rgba(84, 44, 58, 0.25);
  border-radius: 0.65rem;
  padding: 0.6rem;
  background: rgba(255, 255, 255, 0.86);
  display: grid;
  gap: 0.45rem;
}

.fitz-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.35rem;
}

.fitz-option {
  position: relative;
  border: 1px solid rgba(84, 44, 58, 0.26);
  border-radius: 0.52rem;
  min-height: 2.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #5c3543;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: all 0.18s ease;
}

.fitz-option.is-active {
  border-color: #5c3543;
  background: #5c3543;
  color: #fff;
}

.fitz-option__input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.fitz-option__text {
  font-size: 0.72rem;
  line-height: 1.1;
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.share-token-modal {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.share-token-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
}

.share-token-modal__content {
  position: relative;
  width: min(calc(100vw - 2rem), 760px);
  max-height: calc(100vh - 2rem);
  overflow: auto;
}

.share-ttl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.45rem;
}

.share-ttl-option {
  position: relative;
  border: 1px solid rgba(84, 44, 58, 0.24);
  border-radius: 0.7rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.54rem 0.58rem;
  display: grid;
  gap: 0.16rem;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.share-ttl-option.is-active {
  border-color: #5c3543;
  background: rgba(92, 53, 67, 0.12);
  transform: translateY(-1px);
}

.share-ttl-option__input {
  position: absolute;
  inset: 0;
  opacity: 0;
}

.share-ttl-option__label {
  font-size: 0.84rem;
  font-weight: 700;
  color: #5c3543;
}

.share-ttl-option__description {
  font-size: 0.72rem;
  color: #7a4958;
}

@media (max-width: 767.98px) {
  .laser-panel {
    padding: 0.78rem;
  }

  .laser-form-section {
    padding: 0.62rem;
  }

  .toggle-row {
    align-items: flex-start;
  }

  .share-token-box {
    grid-template-columns: 1fr;
  }

  .share-token-box__qr {
    min-height: 170px;
  }
}
</style>
