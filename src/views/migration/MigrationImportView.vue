<script setup lang="ts">
import { Btn, cicKitStore, normalizeGender, toast, useStoreWatch } from 'cic-kit'
import { Timestamp } from 'firebase/firestore'
import { computed, ref } from 'vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { parseAiError } from '../../call/_utilityApi'
import {
  callLegacyTreatmentMapper,
  type LegacyTreatmentMapperCandidate,
  type LegacyTreatmentMapperInput,
} from '../../call/callLegacyTreatmentMapper'
import { Auth } from '../../main'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { publicUserStore } from '../../stores/publicUser'
import { treatmentStore } from '../../stores/treatmentStore'
import { typeExpenseStore } from '../../stores/typeExpenseStore'
import { asDate } from '../../utils/date'

type ImportSummary = {
  created: number
  updated: number
  skipped: number
}

type LegacyRecord = Record<string, unknown>

type LegacyExportData = {
  appointments: LegacyRecord[]
  clients: LegacyRecord[]
  treatments: LegacyRecord[]
}

type DepositSettlementPayload = {
  note: string
  paidAmount: number
  date: string
}

type DepositPayload = {
  totalAmount: number
  reason: string
  settlements: DepositSettlementPayload[]
}

type MappingSource = 'pending' | 'local' | 'ai' | 'manual'

type LegacyTreatmentMapRow = {
  oldId: string
  name: string
  typeExpenseId: string
  typeExpenseName: string
  duration: number
  price: number
  usedInAppointments: boolean
  newId?: string
  source: MappingSource
  attempts: number
  reason: string
  candidates: LegacyTreatmentMapperCandidate[]
}

type AppointmentMonthBucket = {
  key: string
  label: string
  count: number
}

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const importInputRef = ref<HTMLInputElement | null>(null)
const importFileName = ref('')
const parsedExport = ref<LegacyExportData | undefined>()
const mappingRows = ref<LegacyTreatmentMapRow[]>([])
const logs = ref<string[]>([])

const isAutoMapping = ref(false)
const mappingProgressCurrent = ref(0)
const mappingProgressTotal = ref(0)
const isImportingClients = ref(false)
const isImportingAppointments = ref(false)
const clientsSummary = ref<ImportSummary | null>(null)
const appointmentsSummary = ref<ImportSummary | null>(null)
const importedAppointmentMonths = ref<Record<string, ImportSummary>>({})
const activeMonthImportKey = ref('')

useStoreWatch([
  { store: treatmentStore, getOpts: { } },
  { store: typeExpenseStore, getOpts: { } },
  { store: clientStore, getOpts: { } },
  { store: appointmentStore, getOpts: { } },
  { store: publicUserStore, getOpts: { } },
])

const parsedCounts = computed(() => {
  const data = parsedExport.value
  if (!data) {
    return { treatments: 0, clients: 0, appointments: 0 }
  }
  return {
    treatments: data.treatments.length,
    clients: data.clients.length,
    appointments: data.appointments.length,
  }
})

const typeExpenseNameById = computed(
  () =>
    new Map(
      typeExpenseStore.itemsActiveArray.map((item) => [normalizeString(item.id), normalizeString(item.name)]),
    ),
)

const treatmentOptions = computed(() =>
  treatmentStore.itemsActiveArray
    .map((item) => {
      const typeName = typeExpenseNameById.value.get(normalizeString(item.type_expense_id)) || 'Tipo sconosciuto'
      const duration = Number(item.duration ?? 0)
      const price = Number(item.price ?? 0)
      const durationLabel = Number.isFinite(duration) && duration > 0 ? `${Math.round(duration)}m` : '-'
      const priceLabel = Number.isFinite(price) ? `€${roundCurrency(price).toFixed(2)}` : '€0.00'
      return {
        id: normalizeString(item.id),
        label: `${item.title} | ${typeName} | ${durationLabel} | ${priceLabel}`,
      }
    })
    .filter((item) => item.id)
    .sort((a, b) => a.label.localeCompare(b.label, 'it')),
)

const unresolvedRows = computed(() => mappingRows.value.filter((row) => !normalizeString(row.newId)))
const resolvedRows = computed(() => mappingRows.value.filter((row) => normalizeString(row.newId)))
const unresolvedUsedRows = computed(() => unresolvedRows.value.filter((row) => row.usedInAppointments))
const canRunAutoMapping = computed(
  () => !isAutoMapping.value && !!parsedExport.value && unresolvedRows.value.length > 0,
)
const canImportClients = computed(
  () => !isImportingClients.value && !!parsedExport.value && parsedExport.value.clients.length > 0,
)
const appointmentMonthBuckets = computed<AppointmentMonthBucket[]>(() => {
  if (!parsedExport.value) return []
  const monthCounters = new Map<string, number>()

  for (const row of parsedExport.value.appointments) {
    const start = resolveAppointmentDate(row)
    if (!start) continue
    const monthKey = toMonthKey(start)
    monthCounters.set(monthKey, (monthCounters.get(monthKey) ?? 0) + 1)
  }

  return [...monthCounters.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => ({
      key,
      label: monthLabelFromKey(key),
      count,
    }))
})
const remainingAppointmentMonths = computed(() =>
  appointmentMonthBuckets.value.filter((bucket) => !importedAppointmentMonths.value[bucket.key]),
)
const canImportAppointments = computed(
  () =>
    !isImportingAppointments.value &&
    !!parsedExport.value &&
    remainingAppointmentMonths.value.length > 0 &&
    unresolvedUsedRows.value.length === 0,
)
const canImportAll = computed(
  () =>
    !isImportingClients.value &&
    !isImportingAppointments.value &&
    !!parsedExport.value &&
    unresolvedUsedRows.value.length === 0 &&
    (
      parsedExport.value.clients.length > 0 ||
      remainingAppointmentMonths.value.length > 0
    ),
)
const mappingProgressLabel = computed(() => {
  if (!isAutoMapping.value || mappingProgressTotal.value <= 0) return ''
  return `${mappingProgressCurrent.value}/${mappingProgressTotal.value}`
})
const importedMonthsCount = computed(() => Object.keys(importedAppointmentMonths.value).length)

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function toIsoDate(value: unknown) {
  const date = asDate(value)
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function resolveAppointmentDate(row: LegacyRecord) {
  return asDate(row.date_time ?? row.date ?? row.start)
}

function toMonthKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function monthLabelFromKey(monthKey: string) {
  const [yearPart, monthPart] = monthKey.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return monthKey
  }

  const label = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
}

function normalizeText(value: unknown) {
  return normalizeString(value)
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function pushLog(message: string) {
  const stamp = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  logs.value = [`${stamp} - ${message}`, ...logs.value].slice(0, 40)
}

function updateBy() {
  return normalizeString(Auth.user?.email ?? Auth.uid ?? 'admin')
}

function resolveImportOperatorId() {
  const authId = normalizeString(Auth.uid)
  if (authId) return authId

  const firstOperatorId = publicUserStore.itemsActiveArray
    .filter((item) => Boolean(item.operatore))
    .map((item) => normalizeString(item.id))
    .find(Boolean)
  if (firstOperatorId) return firstOperatorId

  return publicUserStore.itemsActiveArray
    .map((item) => normalizeString(item.id))
    .find(Boolean) || ''
}

function toObjectArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is LegacyRecord => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
}

function asLegacyExportData(raw: unknown): LegacyExportData {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? ((raw as Record<string, unknown>).data && typeof (raw as Record<string, unknown>).data === 'object'
      ? (raw as Record<string, unknown>).data
      : raw)
    : undefined
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Formato JSON non valido: atteso oggetto con appointments/clients/treatments.')
  }

  const root = source as Record<string, unknown>
  return {
    appointments: toObjectArray(root.appointments),
    clients: toObjectArray(root.clients),
    treatments: toObjectArray(root.treatments),
  }
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => normalizeString(item)).filter(Boolean)
}

function findLocalTreatmentId(oldId: string, name: string) {
  const normalizedOldId = normalizeString(oldId)
  if (normalizedOldId) {
    const byOldId = treatmentStore.itemsActiveArray.find(
      (item) => normalizeString(item.old_id) === normalizedOldId,
    )
    if (byOldId) return normalizeString(byOldId.id)
  }

  const normalizedName = normalizeText(name)
  if (!normalizedName) return ''
  const byName = treatmentStore.itemsActiveArray.find(
    (item) => normalizeText(item.title) === normalizedName,
  )
  return normalizeString(byName?.id)
}

function toCandidateFromCurrentTreatment(treatmentId: string): LegacyTreatmentMapperCandidate | undefined {
  const treatment = treatmentStore.findItemsById(treatmentId)
  if (!treatment) return undefined
  return {
    id: treatment.id,
    title: normalizeString(treatment.title) || treatment.id,
    typeExpenseName: typeExpenseNameById.value.get(normalizeString(treatment.type_expense_id)) || '',
    duration: Math.round(normalizeNumber(treatment.duration, 0)),
    price: roundCurrency(normalizeNumber(treatment.price, 0)),
  }
}

function buildMappingRows(data: LegacyExportData) {
  const byOldId = new Map<string, LegacyRecord>()
  const usedInAppointments = new Set<string>()

  for (const treatment of data.treatments) {
    const oldId = normalizeString(treatment._id ?? treatment.id ?? treatment.old_id)
    if (!oldId) continue
    byOldId.set(oldId, treatment)
  }

  for (const appointment of data.appointments) {
    const treatmentIds = toStringArray(appointment.treatment_ids)
    for (const oldId of treatmentIds) {
      if (!oldId) continue
      usedInAppointments.add(oldId)
      if (!byOldId.has(oldId)) {
        byOldId.set(oldId, { _id: oldId })
      }
    }
  }

  const rows: LegacyTreatmentMapRow[] = []
  for (const [oldId, source] of byOldId.entries()) {
    const name = normalizeString(source.name ?? source.title) || oldId
    const typeExpenseId = normalizeString(source.type_expense_id ?? source.typeExpenseId)
    const typeExpenseName = normalizeString(source.type_expense_name ?? source.typeExpenseName)
    const duration = Math.round(normalizeNumber(source.duration, 0))
    const price = roundCurrency(normalizeNumber(source.price, 0))
    const localTreatmentId = findLocalTreatmentId(oldId, name)
    const localCandidate = localTreatmentId ? toCandidateFromCurrentTreatment(localTreatmentId) : undefined

    rows.push({
      oldId,
      name,
      typeExpenseId,
      typeExpenseName,
      duration,
      price,
      usedInAppointments: usedInAppointments.has(oldId),
      newId: localTreatmentId || undefined,
      source: localTreatmentId ? 'local' : 'pending',
      attempts: 0,
      reason: localTreatmentId ? 'Match locale (old_id/nome).' : '',
      candidates: localCandidate ? [localCandidate] : [],
    })
  }

  return rows.sort((a, b) => {
    if (a.usedInAppointments !== b.usedInAppointments) {
      return a.usedInAppointments ? -1 : 1
    }
    return a.name.localeCompare(b.name, 'it')
  })
}

function resetImportState() {
  clientsSummary.value = null
  appointmentsSummary.value = null
  importedAppointmentMonths.value = {}
  activeMonthImportKey.value = ''
  logs.value = []
  mappingProgressCurrent.value = 0
  mappingProgressTotal.value = 0
}

function openImportPicker() {
  importInputRef.value?.click()
}

async function onImportFileChange(event: Event) {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    const data = asLegacyExportData(parsed)

    parsedExport.value = data
    importFileName.value = file.name
    mappingRows.value = buildMappingRows(data)
    resetImportState()
    pushLog(
      `File caricato: ${file.name} (trattamenti: ${data.treatments.length}, clienti: ${data.clients.length}, appuntamenti: ${data.appointments.length})`,
    )
    toast.success('File JSON caricato correttamente')
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Errore lettura file JSON'
    toast.error(message)
    pushLog(`Errore caricamento file: ${message}`)
  } finally {
    if (target) target.value = ''
  }
}

function applyManualMapping(row: LegacyTreatmentMapRow, treatmentId: string) {
  const normalized = normalizeString(treatmentId)
  row.newId = normalized || undefined
  row.source = normalized ? 'manual' : 'pending'
  row.reason = normalized ? 'Selezione manuale operatore.' : ''
}

function onManualTreatmentSelect(event: Event, row: LegacyTreatmentMapRow) {
  if (!(event.target instanceof HTMLSelectElement)) return
  applyManualMapping(row, event.target.value)
}

async function mapSingleRowWithAi(row: LegacyTreatmentMapRow) {
  const payload: LegacyTreatmentMapperInput = {
    oldId: row.oldId,
    name: row.name,
    typeExpenseId: row.typeExpenseId,
    typeExpenseName: row.typeExpenseName,
    duration: row.duration,
    price: row.price,
  }

  const response = await callLegacyTreatmentMapper({
    legacyTreatment: payload,
    maxAttempts: 3,
  })

  row.attempts = response.attempts
  row.reason = response.reason
  row.candidates = response.candidates.filter((candidate) => Boolean(treatmentStore.findItemsById(candidate.id)))

  const matchedTreatmentId = normalizeString(response.matchedTreatmentId)
  if (matchedTreatmentId && treatmentStore.findItemsById(matchedTreatmentId)) {
    row.newId = matchedTreatmentId
    row.source = 'ai'
    return
  }

  row.newId = undefined
  row.source = 'pending'
}

async function onRunAutoMapping() {
  if (!canRunAutoMapping.value) return
  const rowsToMap = mappingRows.value.filter((row) => !normalizeString(row.newId))
  if (!rowsToMap.length) return

  isAutoMapping.value = true
  mappingProgressCurrent.value = 0
  mappingProgressTotal.value = rowsToMap.length

  try {
    for (let index = 0; index < rowsToMap.length; index += 1) {
      const row = rowsToMap[index]
      mappingProgressCurrent.value = index + 1
      if (!row) continue
      try {
        await mapSingleRowWithAi(row)
      } catch (error) {
        row.reason = parseAiError(error)
        row.source = 'pending'
      }
    }

    const unresolved = unresolvedRows.value.length
    if (!unresolved) {
      toast.success('Mapping completato: tutti i trattamenti legacy hanno un newId')
      pushLog('Mapping automatico completato senza elementi irrisolti')
      return
    }

    toast.warning(`Mapping completato con ${unresolved} trattamenti da associare manualmente`)
    pushLog(`Mapping automatico completato: ${unresolved} trattamenti da risolvere manualmente`)
  } finally {
    isAutoMapping.value = false
  }
}

function normalizeLegacyDeposits(row: LegacyRecord) {
  const source = Array.isArray(row.deposits)
    ? row.deposits
    : (Array.isArray(row.acconti) ? row.acconti : [])
  if (!Array.isArray(source)) return [] as DepositPayload[]

  return source
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return undefined
      const raw = item as LegacyRecord
      const settlementsRaw = Array.isArray(raw.settlements)
        ? raw.settlements
        : (Array.isArray(raw.saldi) ? raw.saldi : [])
      const settlements: DepositSettlementPayload[] = Array.isArray(settlementsRaw)
        ? settlementsRaw
          .map((settlement) => {
            if (!settlement || typeof settlement !== 'object' || Array.isArray(settlement)) return undefined
            const settlementRaw = settlement as LegacyRecord
            return {
              note: normalizeString(settlementRaw.note ?? settlementRaw.nota),
              paidAmount: roundCurrency(normalizeNumber(settlementRaw.paidAmount ?? settlementRaw.amount ?? settlementRaw.saldato, 0)),
              date: toIsoDate(settlementRaw.date),
            }
          })
          .filter((settlement): settlement is DepositSettlementPayload => Boolean(settlement))
        : []

      return {
        totalAmount: roundCurrency(normalizeNumber(raw.totalAmount ?? raw.total ?? raw.totale, 0)),
        reason: normalizeString(raw.reason ?? raw.motivo),
        settlements,
      }
    })
    .filter((deposit): deposit is DepositPayload => Boolean(deposit))
}

async function onImportClients() {
  if (!canImportClients.value || !parsedExport.value) return

  isImportingClients.value = true
  const summary: ImportSummary = { created: 0, updated: 0, skipped: 0 }
  try {
    const byOldId = new Map(
      clientStore.itemsActiveArray
        .filter((item) => normalizeString(item.old_id))
        .map((item) => [normalizeString(item.old_id), item]),
    )

    for (const row of parsedExport.value.clients) {
      const name = normalizeString(row.name ?? row.nome)
      const surname = normalizeString(row.surname ?? row.cognome)
      if (!name || !surname) {
        summary.skipped += 1
        continue
      }

      const oldId = normalizeString(row.old_id ?? row._id ?? row.id)
      const deposits = normalizeLegacyDeposits(row)
      const payload = {
        name,
        surname,
        phone_number: normalizeString(row.phone_number ?? row.telefono),
        gender: normalizeGender(row.gender) || 'f',
        email: normalizeString(row.email),
        birthdate: toIsoDate(row.birthdate),
        note: normalizeString(row.note ?? row.notes),
        old_id: oldId || undefined,
        acconti: deposits,
        deposits,
        updateBy: updateBy(),
      }

      const existing = oldId ? byOldId.get(oldId) : undefined
      if (existing) {
        await existing.update(payload)
        summary.updated += 1
        continue
      }

      await clientStore.add(payload)
      summary.created += 1
    }

    clientsSummary.value = summary
    toast.success(`Clienti importati: +${summary.created} nuovi, ${summary.updated} aggiornati, ${summary.skipped} saltati`)
    pushLog(`Import clienti completato: creati ${summary.created}, aggiornati ${summary.updated}, saltati ${summary.skipped}`)
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Errore import clienti'
    toast.error(message)
    pushLog(`Errore import clienti: ${message}`)
  } finally {
    isImportingClients.value = false
  }
}

async function onImportAppointments() {
  if (!canImportAppointments.value) return
  const monthKeys = remainingAppointmentMonths.value.map((bucket) => bucket.key)
  for (const monthKey of monthKeys) {
    await onImportAppointmentsByMonth(monthKey)
  }
}

function mergeImportSummary(
  current: ImportSummary | null,
  next: ImportSummary,
) {
  if (!current) return { ...next }
  return {
    created: current.created + next.created,
    updated: current.updated + next.updated,
    skipped: current.skipped + next.skipped,
  }
}

async function importAppointmentsRows(rows: LegacyRecord[], label: string) {
  isImportingAppointments.value = true
  const summary: ImportSummary = { created: 0, updated: 0, skipped: 0 }
  let durationAlignedCount = 0

  try {
    const importOperatorId = resolveImportOperatorId()
    if (!importOperatorId) {
      throw new Error('Impossibile determinare l\'ID operatore per l\'import appuntamenti.')
    }

    const treatmentIdByOldId = new Map(
      mappingRows.value.map((row) => [row.oldId, normalizeString(row.newId)]),
    )
    const legacyTreatmentDurationByOldId = new Map(
      mappingRows.value.map((row) => [row.oldId, Math.round(normalizeNumber(row.duration, 0))]),
    )
    const treatmentDurationById = new Map(
      treatmentStore.itemsActiveArray.map((item) => [normalizeString(item.id), Math.round(normalizeNumber(item.duration, 0))]),
    )
    const treatmentPriceById = new Map(
      treatmentStore.itemsActiveArray.map((item) => [normalizeString(item.id), roundCurrency(normalizeNumber(item.price, 0))]),
    )
    const clientIdByOldId = new Map(
      clientStore.itemsActiveArray
        .filter((item) => normalizeString(item.old_id))
        .map((item) => [normalizeString(item.old_id), normalizeString(item.id)]),
    )
    const appointmentByOldId = new Map(
      appointmentStore.itemsActiveArray
        .filter((item) => normalizeString(item.old_id))
        .map((item) => [normalizeString(item.old_id), item]),
    )

    for (const row of rows) {
      const start = resolveAppointmentDate(row)
      if (!start) {
        summary.skipped += 1
        continue
      }

      const oldId = normalizeString(row.old_id ?? row._id ?? row.id)
      const oldClientId = normalizeString(row.user_id ?? row.client_id)
      const resolvedClientId = oldClientId ? normalizeString(clientIdByOldId.get(oldClientId)) : ''
      const oldTreatmentIds = toStringArray(row.treatment_ids)
      const uniqueOldTreatmentIds = [...new Set(oldTreatmentIds)]
      const mappedTreatmentIds = [...new Set(
        uniqueOldTreatmentIds
          .map((legacyId) => normalizeString(treatmentIdByOldId.get(legacyId)))
          .filter(Boolean),
      )]

      if (oldTreatmentIds.length && !mappedTreatmentIds.length) {
        summary.skipped += 1
        continue
      }

      const treatmentsTotal = mappedTreatmentIds.reduce((sum, treatmentId) => {
        return sum + normalizeNumber(treatmentPriceById.get(treatmentId), 0)
      }, 0)
      const extra = normalizeNumber(row.extra, 0)
      const discount = normalizeNumber(row.discount, 0)
      const total = roundCurrency(Math.max(0, treatmentsTotal + extra - discount))

      const operatorIds = [importOperatorId]
      const isPersonal = Boolean(row.isPersonal ?? row.personalOwnerId)
      const personalOwnerId = isPersonal ? importOperatorId : ''
      const isPublic = isPersonal ? Boolean(row.isPublic) : true
      const googleCalendarSyncedAt = asDate(row.googleCalendarSyncedAt)
      const legacyBaseDuration = uniqueOldTreatmentIds.reduce((sum, legacyId) => {
        return sum + normalizeNumber(legacyTreatmentDurationByOldId.get(legacyId), 0)
      }, 0)
      const mappedBaseDuration = mappedTreatmentIds.reduce((sum, treatmentId) => {
        return sum + normalizeNumber(treatmentDurationById.get(treatmentId), 0)
      }, 0)
      const legacyFixDuration = Math.round(normalizeNumber(row.fix_duration, 0))
      const fixDuration = legacyBaseDuration > 0
        ? Math.round((legacyBaseDuration + legacyFixDuration) - mappedBaseDuration)
        : legacyFixDuration
      if (fixDuration !== legacyFixDuration) {
        durationAlignedCount += 1
      }

      const payload = {
        date_time: Timestamp.fromDate(start),
        user_id: resolvedClientId || undefined,
        client_id: resolvedClientId || undefined,
        treatment_ids: mappedTreatmentIds,
        product_ids: toStringArray(row.product_ids),
        operator_ids: operatorIds,
        personalOwnerId: personalOwnerId || undefined,
        isPublic,
        isPersonal,
        total,
        fix_duration: fixDuration,
        coupon_id: normalizeString(row.coupon_id) || undefined,
        old_id: oldId || undefined,
        notes: normalizeString(row.notes ?? row.note),
        reminded: Boolean(row.reminded),
        googleCalendarEventId: normalizeString(row.googleCalendarEventId) || undefined,
        googleCalendarSyncedAt: googleCalendarSyncedAt ? Timestamp.fromDate(googleCalendarSyncedAt) : undefined,
        updateBy: updateBy(),
      }

      const existing = oldId ? appointmentByOldId.get(oldId) : undefined
      if (existing) {
        await existing.update(payload)
        summary.updated += 1
        continue
      }

      await appointmentStore.add(payload)
      summary.created += 1
    }

    appointmentsSummary.value = mergeImportSummary(appointmentsSummary.value, summary)
    toast.success(`${label}: +${summary.created} nuovi, ${summary.updated} aggiornati, ${summary.skipped} saltati`)
    pushLog(`${label}: creati ${summary.created}, aggiornati ${summary.updated}, saltati ${summary.skipped}, durata allineata ${durationAlignedCount}`)
    return summary
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Errore import appuntamenti'
    toast.error(message)
    pushLog(`Errore import appuntamenti: ${message}`)
    return undefined
  } finally {
    isImportingAppointments.value = false
    activeMonthImportKey.value = ''
  }
}

async function onImportAppointmentsByMonth(monthKey: string) {
  if (
    !parsedExport.value ||
    isImportingClients.value ||
    isImportingAppointments.value ||
    unresolvedUsedRows.value.length > 0 ||
    importedAppointmentMonths.value[monthKey]
  ) {
    return
  }

  const bucket = appointmentMonthBuckets.value.find((item) => item.key === monthKey)
  if (!bucket) return

  const rows = parsedExport.value.appointments.filter((row) => {
    const start = resolveAppointmentDate(row)
    if (!start) return false
    return toMonthKey(start) === monthKey
  })

  activeMonthImportKey.value = monthKey
  const summary = await importAppointmentsRows(rows, `Import appuntamenti ${bucket.label}`)
  if (!summary) return

  importedAppointmentMonths.value = {
    ...importedAppointmentMonths.value,
    [monthKey]: summary,
  }
}

async function onImportAll() {
  if (!canImportAll.value) return
  if (canImportClients.value) {
    await onImportClients()
  }

  if (!canImportAppointments.value) return
  const monthKeys = remainingAppointmentMonths.value.map((bucket) => bucket.key)
  for (const monthKey of monthKeys) {
    await onImportAppointmentsByMonth(monthKey)
  }
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Import Migrazione Legacy" :to="{ name: 'home' }" />

    <div class="migration-wrapper px-2 pb-4">
      <section class="card border-0 shadow-sm p-3 mb-2">
        <h2 class="h6 mb-2">Step 1 - Carica file JSON legacy</h2>
        <p class="small text-muted mb-2">
          Supporta file con struttura simile a `appointments/clients/treatments`. `typeExpenses` del file viene ignorato.
        </p>
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <Btn type="button" color="dark" icon="upload_file" @click="openImportPicker">
            Carica file
          </Btn>
          <span v-if="importFileName" class="badge text-bg-light border">{{ importFileName }}</span>
        </div>
        <input
          ref="importInputRef"
          type="file"
          accept="application/json,.json"
          class="d-none"
          @change="onImportFileChange"
        >
        <div class="small mt-2">
          Trattamenti: <strong>{{ parsedCounts.treatments }}</strong> |
          Clienti: <strong>{{ parsedCounts.clients }}</strong> |
          Appuntamenti: <strong>{{ parsedCounts.appointments }}</strong>
        </div>
      </section>

      <section class="card border-0 shadow-sm p-3 mb-2">
        <h2 class="h6 mb-2">Step 2 - Mapping trattamenti legacy -&gt; newId</h2>
        <p class="small text-muted mb-2">
          Auto-mapping con Gemini (retry interno fino a 3 tentativi). Se resta irrisolto, seleziona manualmente il trattamento esistente.
        </p>

        <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
          <Btn
            type="button"
            color="dark"
            icon="psychology"
            :loading="isAutoMapping"
            :disabled="!canRunAutoMapping"
            @click="onRunAutoMapping"
          >
            Auto-mappa con Gemini
          </Btn>
          <span class="badge text-bg-light border">
            Risolti: {{ resolvedRows.length }} / {{ mappingRows.length }}
          </span>
          <span class="badge text-bg-light border">
            Da risolvere: {{ unresolvedRows.length }}
          </span>
          <span v-if="mappingProgressLabel" class="badge text-bg-warning">
            Progress: {{ mappingProgressLabel }}
          </span>
        </div>

        <p v-if="!mappingRows.length" class="small text-muted mb-0">
          Nessun trattamento legacy rilevato.
        </p>

        <div v-else class="mapping-list">
          <article
            v-for="row in unresolvedRows"
            :key="`map-${row.oldId}`"
            class="mapping-row"
            :class="{ 'mapping-row--used': row.usedInAppointments }"
          >
            <p class="fw-semibold mb-1">
              {{ row.name }} <span class="text-muted">(legacy: {{ row.oldId }})</span>
            </p>
            <p class="small text-muted mb-1">
              Tipo spesa: {{ row.typeExpenseName || row.typeExpenseId || '-' }} |
              Durata: {{ row.duration || 0 }}m |
              Prezzo: €{{ row.price.toFixed(2) }} |
              Usato in appuntamenti: {{ row.usedInAppointments ? 'si' : 'no' }}
            </p>
            <p v-if="row.reason" class="small mb-1">
              Esito auto-mapping: {{ row.reason }} <span v-if="row.attempts">({{ row.attempts }} tentativi)</span>
            </p>

            <div class="d-flex flex-wrap gap-1 mb-1">
              <button
                v-for="candidate in row.candidates"
                :key="`candidate-${row.oldId}-${candidate.id}`"
                type="button"
                class="btn btn-sm btn-outline-secondary"
                @click="applyManualMapping(row, candidate.id)"
              >
                {{ candidate.title }} ({{ candidate.typeExpenseName || '-' }}, {{ candidate.duration }}m, €{{ candidate.price.toFixed(2) }})
              </button>
            </div>

            <label class="form-label small mb-1">Selezione manuale</label>
            <select
              class="form-select form-select-sm"
              :value="row.newId ?? ''"
              @change="onManualTreatmentSelect($event, row)"
            >
              <option value="">-- scegli trattamento esistente --</option>
              <option
                v-for="option in treatmentOptions"
                :key="`option-${row.oldId}-${option.id}`"
                :value="option.id"
              >
                {{ option.label }}
              </option>
            </select>
          </article>
        </div>
      </section>

      <section class="card border-0 shadow-sm p-3 mb-2">
        <h2 class="h6 mb-2">Step 3 - Import dati</h2>
        <p class="small text-muted mb-2">
          Ordine consigliato: clienti, poi appuntamenti. Il prezzo appuntamento viene ricalcolato da trattamenti + extra - sconto.
        </p>

        <div class="d-flex flex-wrap gap-2 mb-2">
          <Btn
            type="button"
            color="dark"
            icon="people"
            :loading="isImportingClients"
            :disabled="!canImportClients || isImportingAppointments"
            @click="onImportClients"
          >
            Importa clienti
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="event_available"
            :loading="isImportingAppointments && !activeMonthImportKey"
            :disabled="!canImportAppointments || isImportingClients"
            @click="onImportAppointments"
          >
            Importa mesi rimanenti
          </Btn>
          <Btn
            type="button"
            color="warning"
            icon="play_circle"
            :disabled="!canImportAll"
            :loading="isImportingClients || isImportingAppointments"
            @click="onImportAll"
          >
            Import completo
          </Btn>
        </div>

        <div v-if="appointmentMonthBuckets.length" class="mb-2">
          <p class="small text-muted mb-1">
            Mesi importati: <strong>{{ importedMonthsCount }}</strong> / <strong>{{ appointmentMonthBuckets.length }}</strong>
          </p>
          <div class="month-import-grid">
            <button
              v-for="month in appointmentMonthBuckets"
              :key="`month-${month.key}`"
              type="button"
              class="btn btn-sm month-import-btn"
              :class="importedAppointmentMonths[month.key] ? 'btn-outline-success' : 'btn-outline-dark'"
              :disabled="Boolean(importedAppointmentMonths[month.key]) || unresolvedUsedRows.length > 0 || isImportingClients || isImportingAppointments"
              @click="onImportAppointmentsByMonth(month.key)"
            >
              <span>{{ month.label }} ({{ month.count }})</span>
              <span v-if="importedAppointmentMonths[month.key]" class="month-import-status">
                importato
              </span>
              <span v-else-if="activeMonthImportKey === month.key" class="month-import-status">
                import in corso...
              </span>
            </button>
          </div>
        </div>
        <p v-else class="small text-muted mb-2">Nessun appuntamento con data valida nel file importato.</p>

        <p v-if="unresolvedUsedRows.length" class="small text-danger mb-2">
          Prima di importare gli appuntamenti devi risolvere {{ unresolvedUsedRows.length }} trattamenti legacy usati negli appuntamenti.
        </p>

        <div class="row g-2">
          <div class="col-12 col-md-6">
            <div class="summary-box">
              <p class="fw-semibold mb-1">Esito clienti</p>
              <p v-if="clientsSummary" class="small mb-0">
                Creati: {{ clientsSummary.created }} |
                Aggiornati: {{ clientsSummary.updated }} |
                Saltati: {{ clientsSummary.skipped }}
              </p>
              <p v-else class="small text-muted mb-0">Nessun import clienti eseguito.</p>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <div class="summary-box">
              <p class="fw-semibold mb-1">Esito appuntamenti</p>
              <p v-if="appointmentsSummary" class="small mb-0">
                Creati: {{ appointmentsSummary.created }} |
                Aggiornati: {{ appointmentsSummary.updated }} |
                Saltati: {{ appointmentsSummary.skipped }}
              </p>
              <p v-else class="small text-muted mb-0">Nessun import appuntamenti eseguito.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="card border-0 shadow-sm p-3">
        <h2 class="h6 mb-2">Log operazioni</h2>
        <p v-if="!logs.length" class="small text-muted mb-0">Nessuna operazione eseguita.</p>
        <div v-else class="log-list">
          <div v-for="line in logs" :key="line" class="log-line">
            {{ line }}
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.migration-wrapper {
  max-width: 1080px;
  margin-inline: auto;
}

.mapping-list {
  display: grid;
  gap: 0.6rem;
}

.mapping-row {
  border: 1px solid rgba(84, 44, 58, 0.15);
  border-radius: 0.55rem;
  padding: 0.62rem;
  background: rgba(255, 255, 255, 0.82);
}

.mapping-row--used {
  border-color: rgba(25, 135, 84, 0.42);
  box-shadow: inset 0 0 0 1px rgba(25, 135, 84, 0.16);
}

.summary-box {
  border: 1px solid rgba(84, 44, 58, 0.12);
  border-radius: 0.5rem;
  padding: 0.55rem;
  background: rgba(255, 255, 255, 0.85);
  height: 100%;
}

.month-import-grid {
  display: grid;
  gap: 0.45rem;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
}

.month-import-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.month-import-status {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.log-list {
  max-height: 260px;
  overflow: auto;
  display: grid;
  gap: 0.35rem;
}

.log-line {
  border: 1px solid rgba(84, 44, 58, 0.14);
  border-radius: 0.35rem;
  padding: 0.26rem 0.42rem;
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.82);
}
</style>
