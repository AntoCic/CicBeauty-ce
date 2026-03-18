<script setup lang="ts">
import {
  Btn,
  cicKitStore,
  defaultUserPermission,
  toast,
  useChangeHeader,
  useStoreWatch,
  type FirestoreModel,
  type FirestoreStoreReactive,
} from 'cic-kit'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Auth } from '../../main'
import { agentPromptStore } from '../../stores/agentPromptStore'
import { announcementStore } from '../../stores/announcementStore'
import { appConfigStore } from '../../stores/appConfigStore'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { couponStore } from '../../stores/couponStore'
import { expenseStore } from '../../stores/expenseStore'
import { productCategoryStore } from '../../stores/productCategoryStore'
import { productStore } from '../../stores/productStore'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { treatmentStore } from '../../stores/treatmentStore'
import { typeCouponStore } from '../../stores/typeCouponStore'
import { typeExpenseStore } from '../../stores/typeExpenseStore'
import { downloadJsonFromSource } from '../../utils/downloadJsonFromSource'

useChangeHeader('Catalog Backup JSON', { name: 'home' })

type CatalogCollectionSource =
  | 'treatments'
  | 'products'
  | 'treatment-categories'
  | 'product-categories'
  | 'clients'
  | 'appointments'
  | 'expenses'
  | 'type-expenses'
  | 'coupons'
  | 'type-coupons'
  | 'announcements'
  | 'app-config'
  | 'agent-prompts'
type CatalogSource = CatalogCollectionSource | 'catalog-full' | 'models-full'
type CatalogFullPayload = Record<CatalogCollectionSource, Record<string, unknown>[]>
type ImportStats = {
  added: number
  updated: number
  skipped: number
}

type CatalogCollectionConfig = {
  source: CatalogCollectionSource
  label: string
  icon: string
  description: string
  count: () => number
  getRows: () => Record<string, unknown>[]
  importRows: (rows: unknown[]) => Promise<ImportStats>
}

const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const canManage = computed(() => Auth?.user?.hasPermission(defaultUserPermission.SUPERADMIN) ?? false)
const importInputRef = ref<HTMLInputElement | null>(null)
const isImporting = ref(false)
const alreadyRedirected = ref(false)

const currentHost = computed(() => {
  if (typeof window === 'undefined') return ''
  return window.location.hostname
})

const isLocalhost = computed(() => {
  const host = currentHost.value
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
})

const LOCALHOST_CLIENT_IMPORT_PHONE = '+393295436315'

function sanitizeClientRowForLocalImport(row: Record<string, unknown>, index: number): Record<string, unknown> {
  const next = { ...row }
  const progressive = String(index + 1).padStart(4, '0')
  next.name = `Cliente ${progressive}`
  next.surname = 'Import'
  next.phone_number = LOCALHOST_CLIENT_IMPORT_PHONE

  const currentEmail = String(row.email ?? '').trim()
  if (currentEmail) {
    next.email = `cliente.${progressive}@example.local`
  }

  return next
}

const defaultUpdateBy = computed(() => {
  const email = String(Auth.user?.email ?? '').trim()
  if (email) return email
  const uid = String(Auth.uid ?? '').trim()
  if (uid) return uid
  return 'super-admin'
})

watch(
  [() => Auth.isLoggedIn, canManage],
  ([isLoggedIn, isAllowed]) => {
    if (!isLoggedIn || isAllowed || alreadyRedirected.value) return
    alreadyRedirected.value = true
    toast.error('Sezione riservata ai super admin.')
    void router.replace({ name: 'home' })
  },
  { immediate: true },
)

useStoreWatch([
  {
    store: appointmentStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
    checkLogin: false,
  },
  {
    store: expenseStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
    checkLogin: false,
  },
  {
    store: typeCouponStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
    checkLogin: false,
  },
  {
    store: announcementStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
    checkLogin: false,
  },
  {
    store: agentPromptStore,
    getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } },
    checkLogin: false,
  },
])

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function sanitizePayloadForUpsert(row: Record<string, unknown>) {
  return { ...row }
}

function normalizeDateField(value: unknown) {
  if (value instanceof Date) return value
  const raw = String(value ?? '').trim()
  if (!raw) return value
  const next = new Date(raw)
  if (Number.isNaN(next.getTime())) return value
  return next
}

type UpsertOptions = {
  dateFields?: string[]
  ensureUpdateBy?: boolean
  transformRow?: (row: Record<string, unknown>, context: { index: number; id: string }) => Record<string, unknown>
}

function preparePayloadForUpsert(row: Record<string, unknown>, options: UpsertOptions = {}) {
  const payload = sanitizePayloadForUpsert(row)
  delete payload.id
  delete payload.createdAt
  delete payload.updatedAt
  delete payload.deleteAt

  if (Array.isArray(options.dateFields)) {
    for (const field of options.dateFields) {
      if (!Object.prototype.hasOwnProperty.call(payload, field)) continue
      payload[field] = normalizeDateField(payload[field])
    }
  }

  if (options.ensureUpdateBy || Object.prototype.hasOwnProperty.call(payload, 'updateBy')) {
    const nextUpdateBy = String(payload.updateBy ?? '').trim()
    payload.updateBy = nextUpdateBy || defaultUpdateBy.value
  }

  return payload
}

async function upsertRows<D extends { id: string }, M extends FirestoreModel<D>>(
  store: FirestoreStoreReactive<M, D>,
  rows: unknown[],
  options: UpsertOptions = {},
): Promise<ImportStats> {
  let added = 0
  let updated = 0
  let skipped = 0

  for (const [index, row] of rows.entries()) {
    const normalized = toRecord(row)
    if (!normalized) {
      skipped += 1
      continue
    }

    const id = String(normalized.id ?? '').trim()
    if (!id) {
      skipped += 1
      continue
    }

    const transformed = options.transformRow ? options.transformRow(normalized, { index, id }) : normalized
    const payload = preparePayloadForUpsert(transformed, options)

    try {
      const existing = store.findItemsById(id)
      if (existing) {
        await existing.update(payload as Partial<Omit<D, 'id'>>)
        updated += 1
      } else {
        await store.add({ id, ...(payload as Partial<Omit<D, 'id'>>) } as D)
        added += 1
      }
    } catch (error) {
      console.error(`Errore import per documento "${id}"`, error)
      skipped += 1
    }
  }

  return { added, updated, skipped }
}

const collectionConfigs: CatalogCollectionConfig[] = [
  {
    source: 'treatments',
    label: 'Trattamenti',
    icon: 'bolt',
    description: 'Tutti i dettagli dei trattamenti',
    count: () => treatmentStore.itemsActiveArray.length,
    getRows: () => treatmentStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    importRows: (rows) => upsertRows(treatmentStore, rows, { ensureUpdateBy: true }),
  },
  {
    source: 'products',
    label: 'Prodotti',
    icon: 'shopping_bag',
    description: 'Tutti i dettagli dei prodotti',
    count: () => productStore.itemsActiveArray.length,
    getRows: () => productStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    importRows: (rows) => upsertRows(productStore, rows, { ensureUpdateBy: true }),
  },
  {
    source: 'treatment-categories',
    label: 'Categorie Trattamenti',
    icon: 'edit_note',
    description: 'Categorie dei trattamenti',
    count: () => treatmentCategoryStore.itemsActiveArray.length,
    getRows: () => treatmentCategoryStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    importRows: (rows) => upsertRows(treatmentCategoryStore, rows, { ensureUpdateBy: true }),
  },
  {
    source: 'product-categories',
    label: 'Categorie Prodotti',
    icon: 'edit_note',
    description: 'Categorie dei prodotti',
    count: () => productCategoryStore.itemsActiveArray.length,
    getRows: () => productCategoryStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    importRows: (rows) => upsertRows(productCategoryStore, rows, { ensureUpdateBy: true }),
  },
  {
    source: 'clients',
    label: 'Clienti',
    icon: 'groups',
    description: 'Rubrica clienti completa',
    count: () => clientStore.itemsActiveArray.length,
    getRows: () => clientStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    importRows: (rows) =>
      upsertRows(clientStore, rows, {
        ensureUpdateBy: true,
        transformRow: (row, context) => (isLocalhost.value ? sanitizeClientRowForLocalImport(row, context.index) : row),
      }),
  },
  {
    source: 'appointments',
    label: 'Appuntamenti',
    icon: 'calendar_month',
    description: 'Calendario appuntamenti',
    count: () => appointmentStore.itemsActiveArray.length,
    getRows: () => appointmentStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    importRows: (rows) =>
      upsertRows(appointmentStore, rows, {
        dateFields: ['date_time', 'googleCalendarSyncedAt'],
        ensureUpdateBy: true,
      }),
  },
  {
    source: 'expenses',
    label: 'Spese',
    icon: 'account_balance_wallet',
    description: 'Storico delle spese',
    count: () => expenseStore.itemsActiveArray.length,
    getRows: () => expenseStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    importRows: (rows) => upsertRows(expenseStore, rows, { dateFields: ['paidAt', 'dueAt'], ensureUpdateBy: true }),
  },
  {
    source: 'type-expenses',
    label: 'Tipi di spesa',
    icon: 'payments',
    description: 'Anagrafica tipi di spesa',
    count: () => typeExpenseStore.itemsActiveArray.length,
    getRows: () => typeExpenseStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    importRows: (rows) => upsertRows(typeExpenseStore, rows, { ensureUpdateBy: true }),
  },
  {
    source: 'coupons',
    label: 'Coupon',
    icon: 'local_offer',
    description: 'Coupon e regole di validita',
    count: () => couponStore.itemsActiveArray.length,
    getRows: () => couponStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    importRows: (rows) => upsertRows(couponStore, rows, { dateFields: ['valid_from', 'valid_to'], ensureUpdateBy: true }),
  },
  {
    source: 'type-coupons',
    label: 'Tipi Coupon',
    icon: 'sell',
    description: 'Anagrafica tipi coupon',
    count: () => typeCouponStore.itemsActiveArray.length,
    getRows: () => typeCouponStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    importRows: (rows) => upsertRows(typeCouponStore, rows, { ensureUpdateBy: true }),
  },
  {
    source: 'announcements',
    label: 'Avvisi',
    icon: 'campaign',
    description: 'Messaggi e annunci',
    count: () => announcementStore.itemsActiveArray.length,
    getRows: () => announcementStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    importRows: (rows) => upsertRows(announcementStore, rows, { ensureUpdateBy: true }),
  },
  {
    source: 'app-config',
    label: 'App Config',
    icon: 'settings',
    description: 'Configurazione globale applicazione',
    count: () => appConfigStore.itemsActiveArray.length,
    getRows: () => appConfigStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    importRows: (rows) => upsertRows(appConfigStore, rows),
  },
  {
    source: 'agent-prompts',
    label: 'Prompt Agenti AI',
    icon: 'psychology',
    description: 'Configurazione prompt AI',
    count: () => agentPromptStore.itemsActiveArray.length,
    getRows: () => agentPromptStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    importRows: (rows) => upsertRows(agentPromptStore, rows, { ensureUpdateBy: true }),
  },
]

function isCatalogSource(value: string): value is CatalogSource {
  return value === 'catalog-full' || value === 'models-full' || collectionConfigs.some((config) => config.source === value)
}

function findCollectionConfig(source: CatalogCollectionSource) {
  return collectionConfigs.find((config) => config.source === source)
}

function parseImportEnvelope(raw: unknown): { source: CatalogSource; data: unknown } | null {
  const record = toRecord(raw)
  if (!record) return null
  const source = String(record.source ?? '').trim()
  if (!source || !isCatalogSource(source)) return null
  return { source, data: record.data }
}

function mergeImportStats(acc: ImportStats, next: ImportStats): ImportStats {
  return {
    added: acc.added + next.added,
    updated: acc.updated + next.updated,
    skipped: acc.skipped + next.skipped,
  }
}

async function importCollection(config: CatalogCollectionConfig, rows: unknown): Promise<ImportStats> {
  if (!Array.isArray(rows)) {
    throw new Error(`Il campo "data" per ${config.source} deve essere un array.`)
  }
  return config.importRows(rows)
}

async function importFullCatalog(data: unknown): Promise<ImportStats> {
  const record = toRecord(data)
  if (!record) {
    throw new Error('Il campo "data" del backup completo deve essere un oggetto.')
  }

  let totals: ImportStats = { added: 0, updated: 0, skipped: 0 }
  for (const config of collectionConfigs) {
    const rows = record[config.source]
    const stats = await importCollection(config, Array.isArray(rows) ? rows : [])
    totals = mergeImportStats(totals, stats)
  }

  return totals
}

function buildFullPayload(): CatalogFullPayload {
  return {
    treatments: treatmentStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    products: productStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    'treatment-categories': treatmentCategoryStore.itemsActiveArray.map(
      (item) => item.toData() as unknown as Record<string, unknown>,
    ),
    'product-categories': productCategoryStore.itemsActiveArray.map(
      (item) => item.toData() as unknown as Record<string, unknown>,
    ),
    clients: clientStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    appointments: appointmentStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    expenses: expenseStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    'type-expenses': typeExpenseStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    coupons: couponStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    'type-coupons': typeCouponStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    announcements: announcementStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    'app-config': appConfigStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
    'agent-prompts': agentPromptStore.itemsActiveArray.map((item) => item.toData() as unknown as Record<string, unknown>),
  }
}

function downloadSingleCollection(config: CatalogCollectionConfig) {
  downloadJsonFromSource(config.source, config.getRows, { filePrefix: 'catalog-backup' })
  toast.success(`Download completato: ${config.label}`)
}

function downloadFullCatalog() {
  downloadJsonFromSource('models-full', buildFullPayload, { filePrefix: 'catalog-backup' })
  toast.success('Download backup completo completato')
}

function openImportPicker() {
  if (!canManage.value) {
    toast.error('Solo i super admin possono importare il catalogo.')
    return
  }
  if (!isLocalhost.value) {
    toast.error('Import disponibile solo in localhost.')
    return
  }
  importInputRef.value?.click()
}

async function onImportFileChange(event: Event) {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0]
  if (!file) return

  if (!canManage.value) {
    toast.error('Solo i super admin possono importare il catalogo.')
    target.value = ''
    return
  }

  if (!isLocalhost.value) {
    toast.error('Import disponibile solo in localhost.')
    target.value = ''
    return
  }

  isImporting.value = true
  try {
    const text = await file.text()
    const parsed = parseImportEnvelope(JSON.parse(text))
    if (!parsed) {
      throw new Error('JSON non valido: atteso oggetto con campi "source" e "data".')
    }

    let stats: ImportStats
    if (parsed.source === 'catalog-full' || parsed.source === 'models-full') {
      stats = await importFullCatalog(parsed.data)
    } else {
      const config = findCollectionConfig(parsed.source)
      if (!config) throw new Error(`Source non supportato: ${parsed.source}`)
      stats = await importCollection(config, parsed.data)
    }

    toast.success(`Import completato: +${stats.added} nuovi, ${stats.updated} aggiornati, ${stats.skipped} scartati.`)
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Errore import JSON'
    toast.error(message)
  } finally {
    isImporting.value = false
    target.value = ''
  }
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <p v-if="!canManage" class="text-muted small mt-3">
      Sezione riservata ai super admin.
    </p>

    <template v-else>
      <section class="card border-0 shadow-sm p-3 my-3">
        <h2 class="h6 mb-2">Download JSON</h2>
        <p class="text-muted small mb-3">
          Ogni pulsante scarica un JSON completo del model selezionato.
        </p>

        <div class="vstack gap-2">
          <article v-for="config in collectionConfigs" :key="config.source" class="export-row">
            <div class="export-row__main">
              <p class="export-row__title mb-0">{{ config.label }}</p>
              <p class="export-row__meta mb-0">{{ config.description }} ({{ config.count() }} record)</p>
            </div>
            <Btn
              type="button"
              color="dark"
              variant="outline"
              :icon="config.icon"
              @click="downloadSingleCollection(config)"
            >
              Scarica
            </Btn>
          </article>
        </div>

        <div class="full-row">
          <Btn type="button" color="dark" icon="download" @click="downloadFullCatalog">
            Scarica backup completo (tutti i model)
          </Btn>
        </div>
      </section>

      <section class="card border-0 shadow-sm p-3 my-3">
        <h2 class="h6 mb-2">Upload JSON</h2>
        <p class="text-muted small mb-2">
          Import disponibile solo in localhost. Host attuale: <strong>{{ currentHost || '-' }}</strong>
        </p>
        <p class="text-muted small mb-3">
          Supporta sia file singoli (source del model) sia backup completi (`models-full`, compatibile anche con
          `catalog-full`).
        </p>
        <p v-if="isLocalhost" class="text-warning small mb-3">
          In localhost, durante import clienti, nome/cognome/email vengono anonimizzati e il telefono diventa sempre
          <strong>{{ LOCALHOST_CLIENT_IMPORT_PHONE }}</strong>.
        </p>

        <Btn
          type="button"
          color="warning"
          icon="upload"
          :loading="isImporting"
          :disabled="isImporting || !isLocalhost"
          @click="openImportPicker"
        >
          Carica JSON
        </Btn>
        <input
          ref="importInputRef"
          type="file"
          class="d-none"
          accept="application/json,.json"
          @change="onImportFileChange"
        >
      </section>
    </template>
  </div>
</template>

<style scoped>
.export-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid #ececec;
  border-radius: 2px;
  padding: 0.7rem;
  background: #fff;
}

.export-row__main {
  min-width: 0;
}

.export-row__title {
  font-size: 0.92rem;
  font-weight: 600;
  color: #3d232c;
}

.export-row__meta {
  font-size: 0.76rem;
  color: rgba(61, 35, 44, 0.72);
}

.full-row {
  margin-top: 0.95rem;
  padding-top: 0.95rem;
  border-top: 1px solid #ececec;
}
</style>
