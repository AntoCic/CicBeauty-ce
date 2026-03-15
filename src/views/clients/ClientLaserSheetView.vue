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
} from 'cic-kit'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { Timestamp } from 'firebase/firestore'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import type { Client } from '../../models/Client'
import {
  FITZPATRICK_QUESTIONS,
  LASER_SHEET_FITZPATRICK_IDS,
  computeFitzpatrickAnswered,
  computeFitzpatrickScore,
  readLaserSheetNumber,
  readLaserSheetString,
  resolveFitzpatrickPhototype,
  type LaserSheetRecord,
} from '../../models/laserSheet'
import { Auth } from '../../main'
import { clientStore } from '../../stores/clientStore'
import { asDate } from '../../utils/date'

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
const form = ref<LaserSheetForm>(emptyForm())
const isLoading = ref(false)
const isEditMode = ref(false)
const isSaving = ref(false)
const isDownloadingPdf = ref(false)
const docsFileValue = ref<FieldFileValue>([])
const mediaFileValue = ref<FieldFileValue>([])
const isUploadingDocs = ref(false)
const isUploadingMedia = ref(false)
const isDeletingFile = ref(false)
type CurrentClient = NonNullable<typeof current.value>

const routeId = computed(() => String(route.params.id ?? '').trim())
const yesNoOptions: Array<{ value: YesNoValue; label: string }> = [
  { value: '', label: '-' },
  { value: 'si', label: 'Si' },
  { value: 'no', label: 'No' },
]

const hasLaserSheet = computed(() => {
  const scheda = current.value?.schedaLaser
  return Boolean(scheda && Object.keys(scheda).length)
})

const currentLaserScore = computed(() => computeFitzpatrickScore(current.value?.schedaLaser))
const currentLaserAnswered = computed(() => computeFitzpatrickAnswered(current.value?.schedaLaser))
const currentLaserPhototype = computed(() => resolveFitzpatrickPhototype(currentLaserScore.value))

const summaryImportantInfo = computed(() => {
  const scheda = current.value?.schedaLaser
  if (!scheda) return []

  return [
    {
      label: 'Ha gia effettuato epilazione progressiva',
      value: readLaserSheetString(scheda, 'epilationAlreadyDone', '-'),
    },
    {
      label: 'Aree gia trattate',
      value: readLaserSheetString(scheda, 'epilationAreasDone', '-'),
    },
    {
      label: 'Tipo di risultato ottenuto',
      value: readLaserSheetString(scheda, 'epilationResults', '-'),
    },
    {
      label: 'Metodi depilazione abituali',
      value: readLaserSheetString(scheda, 'epilationCurrentMethods', '-'),
    },
    {
      label: 'Zona da trattare',
      value: readLaserSheetString(scheda, 'zonaInteresse', '-'),
    },
  ]
})

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
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

function emptyForm(): LaserSheetForm {
  return {
    documentDate: todayIsoDate(),
    operatorName: '',
    clientAddress: '',
    clientAge: '',
    clientGender: '',
    epilationAlreadyDone: '',
    epilationAreasDone: '',
    epilationResults: '',
    epilationCurrentMethods: '',
    medsWomanAnticoncezionali: '',
    medsWomanAnabolizzanti: '',
    medsWomanCortisonici: '',
    medsWomanAltri: '',
    medsManRicrescitaCapelli: '',
    medsManAnabolizzanti: '',
    medsManCortisonici: '',
    medsManAltri: '',
    gravidanzaAllattamento: '',
    pacemaker: '',
    epilessia: '',
    cicloRegolare: '',
    zonaInteresse: '',
    consensoFoto: '',
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

function setFormFromClient(client: CurrentClient) {
  const scheda = client.schedaLaser
  const dataDoc = normalizeDateInput(client.dataSchiedaLaser)

  form.value = {
    ...emptyForm(),
    documentDate: dataDoc || readLaserSheetString(scheda, 'documentDate', todayIsoDate()),
    operatorName: readLaserSheetString(scheda, 'operatorName'),
    clientAddress: readLaserSheetString(scheda, 'clientAddress'),
    clientAge: readLaserSheetString(scheda, 'clientAge', ageFromBirthdate(client.birthdate)),
    clientGender: readLaserSheetString(scheda, 'clientGender', normalizeGenderForLaser(client.gender)),
    epilationAlreadyDone: readLaserSheetString(scheda, 'epilationAlreadyDone'),
    epilationAreasDone: readLaserSheetString(scheda, 'epilationAreasDone'),
    epilationResults: readLaserSheetString(scheda, 'epilationResults'),
    epilationCurrentMethods: readLaserSheetString(scheda, 'epilationCurrentMethods'),
    medsWomanAnticoncezionali: readLaserSheetString(scheda, 'medsWomanAnticoncezionali') as YesNoValue,
    medsWomanAnabolizzanti: readLaserSheetString(scheda, 'medsWomanAnabolizzanti') as YesNoValue,
    medsWomanCortisonici: readLaserSheetString(scheda, 'medsWomanCortisonici') as YesNoValue,
    medsWomanAltri: readLaserSheetString(scheda, 'medsWomanAltri'),
    medsManRicrescitaCapelli: readLaserSheetString(scheda, 'medsManRicrescitaCapelli') as YesNoValue,
    medsManAnabolizzanti: readLaserSheetString(scheda, 'medsManAnabolizzanti') as YesNoValue,
    medsManCortisonici: readLaserSheetString(scheda, 'medsManCortisonici') as YesNoValue,
    medsManAltri: readLaserSheetString(scheda, 'medsManAltri'),
    gravidanzaAllattamento: readLaserSheetString(scheda, 'gravidanzaAllattamento') as YesNoValue,
    pacemaker: readLaserSheetString(scheda, 'pacemaker') as YesNoValue,
    epilessia: readLaserSheetString(scheda, 'epilessia') as YesNoValue,
    cicloRegolare: readLaserSheetString(scheda, 'cicloRegolare') as YesNoValue,
    zonaInteresse: readLaserSheetString(scheda, 'zonaInteresse'),
    consensoFoto: readLaserSheetString(scheda, 'consensoFoto') as YesNoValue,
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

  upsertString(record, 'documentDate', values.documentDate)
  upsertString(record, 'operatorName', values.operatorName)
  upsertString(record, 'clientAddress', values.clientAddress)
  upsertString(record, 'clientGender', values.clientGender)
  upsertString(record, 'epilationAlreadyDone', values.epilationAlreadyDone)
  upsertString(record, 'epilationAreasDone', values.epilationAreasDone)
  upsertString(record, 'epilationResults', values.epilationResults)
  upsertString(record, 'epilationCurrentMethods', values.epilationCurrentMethods)
  upsertString(record, 'medsWomanAnticoncezionali', values.medsWomanAnticoncezionali)
  upsertString(record, 'medsWomanAnabolizzanti', values.medsWomanAnabolizzanti)
  upsertString(record, 'medsWomanCortisonici', values.medsWomanCortisonici)
  upsertString(record, 'medsWomanAltri', values.medsWomanAltri)
  upsertString(record, 'medsManRicrescitaCapelli', values.medsManRicrescitaCapelli)
  upsertString(record, 'medsManAnabolizzanti', values.medsManAnabolizzanti)
  upsertString(record, 'medsManCortisonici', values.medsManCortisonici)
  upsertString(record, 'medsManAltri', values.medsManAltri)
  upsertString(record, 'gravidanzaAllattamento', values.gravidanzaAllattamento)
  upsertString(record, 'pacemaker', values.pacemaker)
  upsertString(record, 'epilessia', values.epilessia)
  upsertString(record, 'cicloRegolare', values.cicloRegolare)
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

function resetFileInputs() {
  docsFileValue.value = []
  mediaFileValue.value = []
}

async function loadItem() {
  isLoading.value = true
  resetFileInputs()
  try {
    current.value = await clientStore.ensureOne(routeId.value)
    if (!current.value) {
      toast.warning('Cliente non trovato')
      return
    }

    setFormFromClient(current.value)
    isEditMode.value = !hasLaserSheet.value
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
    const payload: Record<string, unknown> = {
      schedaLaser: record,
      dataSchiedaLaser: timestamp,
      updateBy: defaultUpdateBy(),
    }
    if (!current.value.schedaLaserNumber) {
      payload.schedaLaserNumber = nextLaserSheetNumber()
    }
    await current.value.update(payload)
    await loadItem()
    isEditMode.value = false
    toast.success('Scheda laser salvata')
  } catch (error) {
    console.error(error)
    toast.error('Errore salvataggio scheda laser')
  } finally {
    isSaving.value = false
  }
}

function beginEditMode() {
  if (!current.value) return
  setFormFromClient(current.value)
  isEditMode.value = true
}

function cancelEditMode() {
  if (!current.value) return
  setFormFromClient(current.value)
  isEditMode.value = false
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

async function uploadFiles(kind: 'docs' | 'media') {
  if (!current.value) return
  if (!clientStore.storageFolder) {
    toast.error('Storage clienti non disponibile')
    return
  }

  const source = kind === 'docs' ? docsFileValue.value : mediaFileValue.value
  const selectedFiles = toFileArray(source)
  if (!selectedFiles.length) {
    toast.warning('Seleziona almeno un file')
    return
  }

  if (kind === 'docs') {
    isUploadingDocs.value = true
  } else {
    isUploadingMedia.value = true
  }

  try {
    const batchId = Date.now()
    const uploadedUrls = await uploadFilesToUrls(selectedFiles, async (file, index) => {
      const extension = getFileExtension(file)
      const baseName = sanitizeFileName(stripFileExtension(file.name))
      const folder = kind === 'docs' ? 'laser/docs' : 'laser/media'
      const path = extension
        ? `${current.value!.id}/${folder}/${batchId}_${index}_${baseName}.${extension}`
        : `${current.value!.id}/${folder}/${batchId}_${index}_${baseName}`
      const uploaded = await clientStore.storageFolder!.update(path, file)
      return uploaded.url
    })

    if (!uploadedUrls.length) {
      toast.warning('Nessun file caricato')
      return
    }

    const nextDocUrls = kind === 'docs'
      ? [...(current.value.laserDocUrls ?? []), ...uploadedUrls]
      : [...(current.value.laserDocUrls ?? [])]
    const nextMediaUrls = kind === 'media'
      ? [...(current.value.laserMediaUrls ?? []), ...uploadedUrls]
      : [...(current.value.laserMediaUrls ?? [])]

    await current.value.update({
      laserDocUrls: nextDocUrls,
      laserMediaUrls: nextMediaUrls,
      updateBy: defaultUpdateBy(),
    })
    await loadItem()
    toast.success(kind === 'docs' ? 'Documenti caricati' : 'Foto/file caricati')
  } catch (error) {
    console.error(error)
    toast.error('Errore upload file')
  } finally {
    if (kind === 'docs') {
      isUploadingDocs.value = false
      docsFileValue.value = []
    } else {
      isUploadingMedia.value = false
      mediaFileValue.value = []
    }
  }
}

async function removeLaserFile(kind: 'docs' | 'media', url: string) {
  if (!current.value || isDeletingFile.value) return
  const ok = window.confirm('Eliminare definitivamente questo file?')
  if (!ok) return

  isDeletingFile.value = true
  try {
    await clientStore.storageFolder?.removeFromUrl(url)
    const nextDocUrls = kind === 'docs'
      ? (current.value.laserDocUrls ?? []).filter((item) => item !== url)
      : [...(current.value.laserDocUrls ?? [])]
    const nextMediaUrls = kind === 'media'
      ? (current.value.laserMediaUrls ?? []).filter((item) => item !== url)
      : [...(current.value.laserMediaUrls ?? [])]

    await current.value.update({
      laserDocUrls: nextDocUrls,
      laserMediaUrls: nextMediaUrls,
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

function openUrl(url: string) {
  window.open(url, '_blank', 'noopener')
}

function fileNameFromUrl(url: string) {
  const withoutQuery = url.split('?')[0] ?? ''
  const rawName = withoutQuery.split('/').pop() ?? 'file'
  try {
    return decodeURIComponent(rawName)
  } catch (error) {
    return rawName
  }
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
  const page2 = pages[1]
  const page3 = pages[2]
  const page4 = pages[3]
  if (!page2 || !page3 || !page4) {
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

  drawTextFromTop(page2, documentDate, 40, 91, 10, baseFont)
  drawTextFromTop(page2, operatorName, 310, 91, 10, baseFont)
  drawTextFromTop(page2, fullName, 48, 129, 10, baseFont)
  drawTextFromTop(page2, age, 510, 129, 10, baseFont)
  drawTextFromTop(page2, address, 70, 150, 10, baseFont, rgb(0.08, 0.08, 0.08), 370)
  drawTextFromTop(page2, gender, 540, 150, 10, boldFont)
  drawTextFromTop(page2, email, 48, 172, 9, baseFont, rgb(0.08, 0.08, 0.08), 350)
  drawTextFromTop(page2, primaryPhone, 392, 172, 9, baseFont, rgb(0.08, 0.08, 0.08), 160)

  drawTextFromTop(page2, fillOrFallback(values.epilationAlreadyDone), 40, 217, 9, baseFont, rgb(0.08, 0.08, 0.08), 510)
  drawTextFromTop(page2, fillOrFallback(values.epilationAreasDone), 40, 237, 9, baseFont, rgb(0.08, 0.08, 0.08), 510)
  drawTextFromTop(page2, fillOrFallback(values.epilationResults), 40, 258, 9, baseFont, rgb(0.08, 0.08, 0.08), 510)
  drawTextFromTop(page2, fillOrFallback(values.epilationCurrentMethods), 40, 279, 9, baseFont, rgb(0.08, 0.08, 0.08), 510)

  drawTextFromTop(page2, fillOrFallback(values.medsWomanAnticoncezionali), 56, 375, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.medsWomanAnabolizzanti), 56, 395, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.medsWomanCortisonici), 56, 415, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.medsWomanAltri), 56, 435, 8, baseFont, rgb(0.08, 0.08, 0.08), 120)

  drawTextFromTop(page2, fillOrFallback(values.medsManRicrescitaCapelli), 194, 375, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.medsManAnabolizzanti), 194, 395, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.medsManCortisonici), 194, 415, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.medsManAltri), 194, 435, 8, baseFont, rgb(0.08, 0.08, 0.08), 120)

  drawTextFromTop(page2, fillOrFallback(values.gravidanzaAllattamento), 372, 375, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.pacemaker), 372, 395, 8, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.epilessia), 372, 415, 8, baseFont)

  drawTextFromTop(page2, fillOrFallback(values.cicloRegolare), 232, 463, 9, baseFont)
  drawTextFromTop(page2, fillOrFallback(values.zonaInteresse), 362, 463, 9, baseFont, rgb(0.08, 0.08, 0.08), 185)

  const fitzRowTopOffsets = [536, 557, 577, 598, 619, 640, 661, 682, 704, 725]
  for (let index = 0; index < LASER_SHEET_FITZPATRICK_IDS.length; index += 1) {
    const key = LASER_SHEET_FITZPATRICK_IDS[index]
    if (!key) continue
    const scoreValue = values[key]
    if (scoreValue === '') continue
    const top = fitzRowTopOffsets[index]
    if (!top) continue
    drawTextFromTop(page2, String(scoreValue), 559, top, 9, boldFont)
  }
  drawTextFromTop(page2, String(score), 559, 746, 10, boldFont)

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

  drawTextFromTop(page4, documentDate, 40, 91, 10, baseFont)
  drawTextFromTop(page4, fullName, 230, 91, 10, baseFont, rgb(0.08, 0.08, 0.08), 220)
  drawTextFromTop(page4, `Scheda n. ${schedaNumber}`, 41, 117, 9, boldFont)
  drawTextFromTop(page4, `Punteggio questionario: ${score}`, 300, 117, 9, boldFont)
  drawTextFromTop(page4, `Fototipo: ${phototype}`, 300, 133, 9, boldFont)

  drawWrappedRows(
    page4,
    `Zona interesse: ${fillOrFallback(values.zonaInteresse, 'Non indicata')}. Note epilazione: ${fillOrFallback(
      values.epilationCurrentMethods,
      'Non indicate',
    )}.`,
    41,
    754,
    8,
    baseFont,
    86,
    10,
  )

  return pdfDoc.save()
}

function setFormFromClientAndReturn(client: CurrentClient) {
  setFormFromClient(client)
  return { ...form.value }
}

async function downloadCompiledPdf() {
  if (!current.value || isDownloadingPdf.value) return
  const values = isEditMode.value ? form.value : setFormFromClientAndReturn(current.value)
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

onMounted(loadItem)
watch(() => route.params.id, loadItem)
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Scheda Laser" :to="{ name: 'ClientEditView', params: { id: routeId } }" />

    <div class="laser-wrapper mx-auto py-3">
      <p v-if="isLoading" class="text-muted small">Caricamento...</p>
      <template v-else-if="current">
        <article class="card border-0 shadow-sm p-3 p-md-4 mb-3">
          <div class="d-flex align-items-start justify-content-between gap-2 flex-wrap">
            <div>
              <h2 class="h6 mb-1">
                {{ current.name }} {{ current.surname }}
              </h2>
              <p class="small text-muted mb-0">
                Scheda n. {{ current.schedaLaserNumber || '-' }} | Data scheda:
                {{ formatTimestamp(current.dataSchiedaLaser) }}
              </p>
            </div>
            <div class="d-flex gap-2 flex-wrap">
              <Btn type="button" color="secondary" variant="outline" icon="arrow_back" @click="goBackToClient">
                Cliente
              </Btn>
              <Btn type="button" color="dark" icon="download" :loading="isDownloadingPdf" @click="downloadCompiledPdf">
                Scarica PDF compilato
              </Btn>
              <Btn
                v-if="!isEditMode"
                type="button"
                color="dark"
                variant="outline"
                icon="edit"
                @click="beginEditMode"
              >
                Modifica scheda
              </Btn>
            </div>
          </div>
        </article>

        <article v-if="!isEditMode" class="card border-0 shadow-sm p-3 p-md-4 mb-3">
          <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
            <h3 class="h6 mb-0">Riepilogo scheda laser</h3>
            <span class="badge text-bg-light border">
              Fitzpatrick: {{ currentLaserScore }} / 40 - Fototipo {{ currentLaserPhototype }}
            </span>
          </div>

          <p class="small text-muted mb-2">
            Domande Fitzpatrick compilate: {{ currentLaserAnswered }}/{{ LASER_SHEET_FITZPATRICK_IDS.length }}
          </p>

          <div v-if="hasLaserSheet" class="vstack gap-2">
            <div v-for="item in summaryImportantInfo" :key="item.label" class="summary-item">
              <strong>{{ item.label }}:</strong> {{ item.value }}
            </div>
          </div>
          <p v-else class="small text-muted mb-0">Scheda laser non ancora compilata.</p>
        </article>

        <article v-if="isEditMode" class="card border-0 shadow-sm p-3 p-md-4 mb-3">
          <h3 class="h6 mb-3">Compilazione scheda laser</h3>

          <div class="row g-3">
            <div class="col-12 col-md-3">
              <label class="form-label">Data documento</label>
              <input v-model="form.documentDate" type="date" class="form-control">
            </div>
            <div class="col-12 col-md-5">
              <label class="form-label">Operatrice / Operatore</label>
              <input v-model="form.operatorName" type="text" class="form-control" placeholder="Nome operatrice">
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label">Indirizzo cliente</label>
              <input v-model="form.clientAddress" type="text" class="form-control" placeholder="Indirizzo">
            </div>

            <div class="col-6 col-md-3">
              <label class="form-label">Eta</label>
              <input v-model="form.clientAge" type="number" min="0" step="1" class="form-control">
            </div>
            <div class="col-6 col-md-3">
              <label class="form-label">Sesso</label>
              <select v-model="form.clientGender" class="form-select">
                <option value="">-</option>
                <option value="F">F</option>
                <option value="M">M</option>
              </select>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Zona da trattare</label>
              <input v-model="form.zonaInteresse" type="text" class="form-control" placeholder="Es. inguine, gambe, ascelle...">
            </div>

            <div class="col-12">
              <label class="form-label">Ha gia effettuato trattamenti di epilazione progressiva permanente?</label>
              <textarea v-model="form.epilationAlreadyDone" rows="2" class="form-control"></textarea>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Quali aree ha trattato?</label>
              <textarea v-model="form.epilationAreasDone" rows="2" class="form-control"></textarea>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Che tipo di risultati ha ottenuto?</label>
              <textarea v-model="form.epilationResults" rows="2" class="form-control"></textarea>
            </div>
            <div class="col-12">
              <label class="form-label">Quali metodi usa abitualmente per depilarsi?</label>
              <textarea v-model="form.epilationCurrentMethods" rows="2" class="form-control"></textarea>
            </div>

            <div class="col-12">
              <h4 class="h6 mb-2">Farmaci / condizioni</h4>
            </div>

            <div class="col-12 col-md-4">
              <p class="small fw-semibold mb-1">Donna</p>
              <div class="vstack gap-2">
                <label class="small mb-0">Anticoncezionali</label>
                <select v-model="form.medsWomanAnticoncezionali" class="form-select form-select-sm">
                  <option v-for="option in yesNoOptions" :key="`medsWomanAnticoncezionali-${option.value}`" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <label class="small mb-0">Anabolizzanti</label>
                <select v-model="form.medsWomanAnabolizzanti" class="form-select form-select-sm">
                  <option v-for="option in yesNoOptions" :key="`medsWomanAnabolizzanti-${option.value}`" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <label class="small mb-0">Cortisonici</label>
                <select v-model="form.medsWomanCortisonici" class="form-select form-select-sm">
                  <option v-for="option in yesNoOptions" :key="`medsWomanCortisonici-${option.value}`" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <label class="small mb-0">Altri</label>
                <input v-model="form.medsWomanAltri" type="text" class="form-control form-control-sm">
              </div>
            </div>

            <div class="col-12 col-md-4">
              <p class="small fw-semibold mb-1">Uomo</p>
              <div class="vstack gap-2">
                <label class="small mb-0">Ricrescita capelli</label>
                <select v-model="form.medsManRicrescitaCapelli" class="form-select form-select-sm">
                  <option v-for="option in yesNoOptions" :key="`medsManRicrescitaCapelli-${option.value}`" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <label class="small mb-0">Anabolizzanti</label>
                <select v-model="form.medsManAnabolizzanti" class="form-select form-select-sm">
                  <option v-for="option in yesNoOptions" :key="`medsManAnabolizzanti-${option.value}`" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <label class="small mb-0">Cortisonici</label>
                <select v-model="form.medsManCortisonici" class="form-select form-select-sm">
                  <option v-for="option in yesNoOptions" :key="`medsManCortisonici-${option.value}`" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <label class="small mb-0">Altri</label>
                <input v-model="form.medsManAltri" type="text" class="form-control form-control-sm">
              </div>
            </div>

            <div class="col-12 col-md-4">
              <p class="small fw-semibold mb-1">Altro</p>
              <div class="vstack gap-2">
                <label class="small mb-0">Gravidanza / allattamento</label>
                <select v-model="form.gravidanzaAllattamento" class="form-select form-select-sm">
                  <option v-for="option in yesNoOptions" :key="`gravidanzaAllattamento-${option.value}`" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <label class="small mb-0">Pacemaker</label>
                <select v-model="form.pacemaker" class="form-select form-select-sm">
                  <option v-for="option in yesNoOptions" :key="`pacemaker-${option.value}`" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <label class="small mb-0">Epilessia</label>
                <select v-model="form.epilessia" class="form-select form-select-sm">
                  <option v-for="option in yesNoOptions" :key="`epilessia-${option.value}`" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <label class="small mb-0">Ciclo mestruale regolare</label>
                <select v-model="form.cicloRegolare" class="form-select form-select-sm">
                  <option v-for="option in yesNoOptions" :key="`cicloRegolare-${option.value}`" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <label class="small mb-0">Consenso foto</label>
                <select v-model="form.consensoFoto" class="form-select form-select-sm">
                  <option v-for="option in yesNoOptions" :key="`consensoFoto-${option.value}`" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
            </div>

            <div class="col-12">
              <h4 class="h6 mb-2">Questionario Fitzpatrick</h4>
              <div class="vstack gap-2">
                <div v-for="question in FITZPATRICK_QUESTIONS" :key="question.id" class="fitz-row">
                  <label class="small fw-semibold">{{ question.label }}</label>
                  <select
                    v-model="form[question.id]"
                    class="form-select form-select-sm"
                  >
                    <option value="">Seleziona punteggio</option>
                    <option v-for="option in question.options" :key="`${question.id}-${option.value}`" :value="String(option.value)">
                      {{ option.value }} - {{ option.label }}
                    </option>
                  </select>
                </div>
              </div>
              <p class="small text-muted mt-2 mb-0">
                Totale attuale: {{ fitzScoreFromForm(form) }} / 40 - Fototipo: {{ fitzPhototypeFromForm(form) }}
              </p>
            </div>
          </div>

          <div class="d-flex gap-2 mt-3 flex-wrap">
            <Btn type="button" color="dark" icon="save" :loading="isSaving" @click="saveLaserSheet">
              Salva scheda laser
            </Btn>
            <Btn type="button" color="secondary" variant="outline" icon="close" :disabled="isSaving" @click="cancelEditMode">
              Annulla
            </Btn>
          </div>
        </article>

        <article class="card border-0 shadow-sm p-3 p-md-4 mb-3">
          <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
            <h3 class="h6 mb-0">Documenti scheda laser</h3>
            <Btn type="button" color="dark" icon="upload_file" :loading="isUploadingDocs" @click="uploadFiles('docs')">
              Carica documenti
            </Btn>
          </div>

          <FieldFile
            name="laser-documents"
            v-model="docsFileValue"
            multiple
            :show-errors="false"
            :disabled="isUploadingDocs || isDeletingFile"
            @clear="docsFileValue = []"
          >
            <template #dropzone="{ open, clear, files, disabled }">
              <div class="dropzone-wrap" :class="{ disabled }">
                <div class="d-flex gap-2 flex-wrap">
                  <Btn type="button" icon="upload_file" color="dark" :disabled="disabled" @click="open">
                    Scegli file doc
                  </Btn>
                  <Btn type="button" icon="delete" variant="outline" color="secondary" :disabled="disabled || !files.length" @click="clear">
                    Svuota selezione
                  </Btn>
                </div>
                <small class="text-muted d-block mt-1">File selezionati: {{ files.length }}</small>
              </div>
            </template>
          </FieldFile>

          <div v-if="current.laserDocUrls?.length" class="vstack gap-2 mt-3">
            <article v-for="url in current.laserDocUrls" :key="url" class="file-row">
              <div class="min-w-0">
                <p class="mb-0 text-truncate">{{ fileNameFromUrl(url) }}</p>
              </div>
              <div class="d-flex gap-2">
                <Btn type="button" color="secondary" variant="outline" icon="download" @click="openUrl(url)">
                  Scarica
                </Btn>
                <Btn type="button" color="danger" variant="outline" icon="delete" :disabled="isDeletingFile" @click="removeLaserFile('docs', url)">
                  Elimina
                </Btn>
              </div>
            </article>
          </div>
          <p v-else class="small text-muted mt-2 mb-0">Nessun documento scheda laser.</p>
        </article>

        <article class="card border-0 shadow-sm p-3 p-md-4">
          <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
            <h3 class="h6 mb-0">Foto / altri file scheda laser</h3>
            <Btn type="button" color="dark" icon="upload_file" :loading="isUploadingMedia" @click="uploadFiles('media')">
              Carica foto/altri file
            </Btn>
          </div>

          <FieldFile
            name="laser-media"
            v-model="mediaFileValue"
            multiple
            :show-errors="false"
            :disabled="isUploadingMedia || isDeletingFile"
            @clear="mediaFileValue = []"
          >
            <template #dropzone="{ open, clear, files, disabled }">
              <div class="dropzone-wrap" :class="{ disabled }">
                <div class="d-flex gap-2 flex-wrap">
                  <Btn type="button" icon="upload_file" color="dark" :disabled="disabled" @click="open">
                    Scegli foto / file
                  </Btn>
                  <Btn type="button" icon="delete" variant="outline" color="secondary" :disabled="disabled || !files.length" @click="clear">
                    Svuota selezione
                  </Btn>
                </div>
                <small class="text-muted d-block mt-1">File selezionati: {{ files.length }}</small>
              </div>
            </template>
          </FieldFile>

          <div v-if="current.laserMediaUrls?.length" class="vstack gap-2 mt-3">
            <article v-for="url in current.laserMediaUrls" :key="url" class="file-row">
              <div class="min-w-0">
                <p class="mb-0 text-truncate">{{ fileNameFromUrl(url) }}</p>
              </div>
              <div class="d-flex gap-2">
                <Btn type="button" color="secondary" variant="outline" icon="download" @click="openUrl(url)">
                  Scarica
                </Btn>
                <Btn type="button" color="danger" variant="outline" icon="delete" :disabled="isDeletingFile" @click="removeLaserFile('media', url)">
                  Elimina
                </Btn>
              </div>
            </article>
          </div>
          <p v-else class="small text-muted mt-2 mb-0">Nessuna foto/allegato scheda laser.</p>
        </article>
      </template>
      <p v-else class="text-muted small">Cliente non trovato.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.laser-wrapper {
  max-width: 980px;
}

.summary-item {
  border: 1px solid rgba(84, 44, 58, 0.12);
  border-radius: 0.5rem;
  padding: 0.45rem 0.55rem;
  background: rgba(255, 255, 255, 0.76);
  font-size: 0.85rem;
}

.fitz-row {
  border: 1px dashed rgba(84, 44, 58, 0.2);
  border-radius: 0.5rem;
  padding: 0.45rem 0.55rem;
  background: rgba(255, 255, 255, 0.75);
  display: grid;
  gap: 0.35rem;
}

.dropzone-wrap {
  border: 1px dashed rgba(84, 44, 58, 0.25);
  border-radius: 0.5rem;
  padding: 0.7rem;
  background: rgba(255, 255, 255, 0.55);
}

.dropzone-wrap.disabled {
  opacity: 0.65;
}

.file-row {
  border: 1px solid rgba(84, 44, 58, 0.16);
  border-radius: 0.5rem;
  padding: 0.45rem 0.55rem;
  background: rgba(255, 255, 255, 0.82);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
}

.min-w-0 {
  min-width: 0;
}
</style>
