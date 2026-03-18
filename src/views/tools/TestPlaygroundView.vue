<script setup lang="ts">
import { Btn, cicKitStore, defaultUserPermission, toast, useChangeHeader, useStoreWatch } from 'cic-kit'
import { Timestamp } from 'firebase/firestore'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AiPromptLauncherCard from '../../components/ai/AiPromptLauncherCard.vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { Auth } from '../../main'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { couponStore } from '../../stores/couponStore'
import { publicUserStore } from '../../stores/publicUser'
import { treatmentStore } from '../../stores/treatmentStore'

useChangeHeader('Test Playground', { name: 'home' })

const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const runningAction = ref('')
const actionLog = ref<string[]>([])

const femaleNames = ['Giulia', 'Martina', 'Elisa', 'Francesca', 'Sara', 'Alessia', 'Marta']
const maleNames = ['Luca', 'Marco', 'Andrea', 'Davide', 'Matteo', 'Simone', 'Gabriele']
const surnames = ['Rossi', 'Bianchi', 'Romano', 'Colombo', 'Greco', 'Ferrari', 'Gallo', 'Ricci', 'Costa']
const notePool = ['predilige trattamenti viso', 'ama i pacchetti corpo', 'arriva puntuale', 'preferisce orari serali']
const depositReasonPool = [
  'Pacchetto viso stagionale',
  'Percorso corpo rimodellante',
  'Gift card trattamenti',
  'Percorso epilazione progressiva',
]
const settlementNotePool = [
  'Acconto iniziale',
  'Secondo versamento',
  'Saldo parziale in cassa',
  'Versamento POS',
]
const appointmentSlots: Array<[number, number]> = [
  [9, 0],
  [10, 30],
  [12, 0],
  [14, 30],
  [16, 0],
  [17, 30],
  [18, 15],
]
const monthOptions = [
  { key: '01', label: 'Gen' },
  { key: '02', label: 'Feb' },
  { key: '03', label: 'Mar' },
  { key: '04', label: 'Apr' },
  { key: '05', label: 'Mag' },
  { key: '06', label: 'Giu' },
  { key: '07', label: 'Lug' },
  { key: '08', label: 'Ago' },
  { key: '09', label: 'Set' },
  { key: '10', label: 'Ott' },
  { key: '11', label: 'Nov' },
  { key: '12', label: 'Dic' },
] as const

type ClientVariant = 'base' | 'premium' | 'no-phone' | 'male' | 'with-deposits'
type CouponVariant = 'standard' | 'premium' | 'dedicated' | 'flash'
type AppointmentVariant = 'personal' | 'center-basic' | 'center-complete-no-coupon' | 'center-coupon'
type AppointmentPriceMode = 'none' | 'down' | 'up' | 'mixed'
type AppointmentOverrides = {
  priceMode?: AppointmentPriceMode
  applyCoupon?: boolean
}
type MixedBatchOptions = AppointmentOverrides & {
  includeCouponVariant?: boolean
}

useStoreWatch([
  { store: appointmentStore, getOpts: { orderBy: { fieldPath: 'date_time', directionStr: 'desc' } } },
])

const hasBetaFeatures = computed(() => Auth?.user?.hasPermission(defaultUserPermission.BETA_FEATURES) ?? false)
const operatorIds = computed(() => {
  const operators = publicUserStore.itemsActiveArray
    .filter((item) => Boolean(item.operatore))
    .map((item) => normalizeString(item.id))
    .filter(Boolean)
  if (operators.length) return operators

  const genericUsers = publicUserStore.itemsActiveArray
    .map((item) => normalizeString(item.id))
    .filter(Boolean)
  if (genericUsers.length) return genericUsers

  const authId = normalizeString(Auth.uid)
  return authId ? [authId] : []
})
const treatmentIds = computed(() =>
  treatmentStore.itemsActiveArray
    .map((item) => normalizeString(item.id))
    .filter(Boolean),
)
const hasRunningAction = computed(() => Boolean(runningAction.value))
const canUseDestructiveCleanup = computed(() => {
  if (typeof window === 'undefined') return false
  return window.location.protocol === 'http:' && window.location.hostname === 'localhost'
})
const appointmentsTodayCount = ref(12)
const appointmentsMonthValue = ref(toMonthInputValue())
const appointmentsMonthCount = ref(40)
const appointmentsMonthAdvancedValue = ref(toMonthInputValue())
const appointmentsMonthAdvancedCount = ref(40)
const appointmentsMonthAdvancedPriceMode = ref<AppointmentPriceMode>('mixed')
const appointmentsMonthAdvancedCoupon = ref(false)
const appointmentsByMonthsYear = ref(new Date().getFullYear())
const appointmentsByMonthsCount = ref(20)
const appointmentsByMonthsSelection = ref(defaultMonthSelection())
let operatorRoundRobinCursor = 0

watch(
  hasBetaFeatures,
  (isAllowed) => {
    if (isAllowed) return
    void router.replace({ name: 'home' })
  },
  { immediate: true },
)

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function randomFrom<T>(items: readonly T[]): T | undefined {
  if (!items.length) return undefined
  return items[Math.floor(Math.random() * items.length)]
}

function randomInt(min: number, max: number) {
  const minValue = Math.ceil(min)
  const maxValue = Math.floor(max)
  if (maxValue <= minValue) return minValue
  return Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue
}

function shuffle<T>(values: T[]) {
  const copy = [...values]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = copy[index] as T
    copy[index] = copy[swapIndex] as T
    copy[swapIndex] = current
  }
  return copy
}

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function toMonthInputValue(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`
}

function defaultMonthSelection() {
  return Object.fromEntries(monthOptions.map((item) => [item.key, false])) as Record<string, boolean>
}

function randomToken(size = 4) {
  return Math.random().toString(36).slice(2, 2 + size).toUpperCase()
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function randomBirthdate() {
  const year = randomInt(1962, 2003)
  const month = randomInt(1, 12)
  const day = randomInt(1, 28)
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function toIsoDate(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`
}

function randomPastDate(maxDaysBack = 220) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - randomInt(1, maxDaysBack))
  return date
}

function randomClientDeposits() {
  const depositsCount = randomFrom([1, 1, 2]) ?? 1
  const deposits: Array<{
    totalAmount: number
    reason: string
    settlements: Array<{ note: string; paidAmount: number; date: string }>
  }> = []

  for (let index = 0; index < depositsCount; index += 1) {
    const totalAmount = roundCurrency(randomInt(55, 240))
    const reason = randomFrom(depositReasonPool) ?? 'Pacchetto trattamenti'
    const firstSettlementDate = randomPastDate(220)
    const firstPaidAmount = roundCurrency(
      Math.max(
        10,
        Math.min(totalAmount, randomInt(15, Math.max(20, Math.round(totalAmount * 0.55)))),
      ),
    )
    const settlements: Array<{ note: string; paidAmount: number; date: string }> = [
      {
        note: randomFrom(settlementNotePool) ?? 'Acconto iniziale',
        paidAmount: firstPaidAmount,
        date: toIsoDate(firstSettlementDate),
      },
    ]

    let paidTotal = firstPaidAmount
    if (paidTotal < totalAmount) {
      const shouldAddSecondSettlement = randomFrom([true, false, true]) ?? true
      if (shouldAddSecondSettlement) {
        const remainingBeforeSecond = roundCurrency(Math.max(0, totalAmount - paidTotal))
        const shouldCloseDeposit = index === 0 ? (randomFrom([true, false]) ?? false) : false
        const secondPaidAmount = shouldCloseDeposit
          ? remainingBeforeSecond
          : roundCurrency(
            Math.max(
              5,
              Math.min(
                remainingBeforeSecond,
                randomInt(5, Math.max(8, Math.round(remainingBeforeSecond * 0.7))),
              ),
            ),
          )
        const secondSettlementDate = new Date(firstSettlementDate)
        secondSettlementDate.setDate(secondSettlementDate.getDate() + randomInt(3, 45))
        settlements.push({
          note: randomFrom(settlementNotePool) ?? 'Secondo versamento',
          paidAmount: secondPaidAmount,
          date: toIsoDate(secondSettlementDate),
        })
        paidTotal = roundCurrency(paidTotal + secondPaidAmount)
      }
    }

    deposits.push({
      totalAmount,
      reason,
      settlements,
    })
  }

  return deposits
}

function randomPhone() {
  return `+39 3${randomInt(10, 99)} ${randomInt(1000000, 9999999)}`
}

function defaultUpdateBy() {
  return normalizeString(Auth.user?.email ?? Auth.uid ?? 'admin')
}

function todayAt(hour: number, minute = 0) {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return date
}

function randomTodaySlot() {
  const fallback = todayAt(10, 0)
  const [hour, minute] = randomFrom(appointmentSlots) ?? [fallback.getHours(), fallback.getMinutes()]
  return todayAt(hour, minute)
}

function formatHour(date: Date) {
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function normalizePositiveInt(value: unknown, fallback: number, min = 1, max = 5000) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  const rounded = Math.round(parsed)
  return Math.max(min, Math.min(max, rounded))
}

function monthRangeFromInput(value: string) {
  const normalized = normalizeString(value)
  const match = /^(\d{4})-(\d{2})$/.exec(normalized)
  if (!match) {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end, label: start.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) }
  }

  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end, label: start.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) }
  }

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, month, 0, 23, 59, 59, 999)
  return { start, end, label: start.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) }
}

function randomDateInRange(start: Date, end: Date) {
  const startMs = start.getTime()
  const endMs = end.getTime()
  const safeEnd = endMs > startMs ? endMs : startMs + 60000
  const randomMs = startMs + Math.random() * (safeEnd - startMs)
  const date = new Date(randomMs)
  const [hour, minute] = randomFrom(appointmentSlots) ?? [10, 0]
  date.setHours(hour, minute, 0, 0)
  if (date.getTime() < startMs) return new Date(startMs)
  if (date.getTime() > safeEnd) return new Date(safeEnd)
  return date
}

function pushLog(message: string) {
  const stamp = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  actionLog.value = [`${stamp} - ${message}`, ...actionLog.value].slice(0, 16)
}

function actionErrorMessage(error: unknown) {
  if (error instanceof Error && normalizeString(error.message)) return error.message
  return 'Errore inatteso'
}

async function runAction(actionId: string, label: string, callback: () => Promise<void>) {
  if (runningAction.value) return
  runningAction.value = actionId
  try {
    await callback()
  } catch (error) {
    console.error(error)
    const message = actionErrorMessage(error)
    toast.error(`${label}: ${message}`)
    pushLog(`Errore ${label}: ${message}`)
  } finally {
    runningAction.value = ''
  }
}

function isActionBusy(actionId: string) {
  return runningAction.value === actionId
}

function isActionDisabled(actionId: string) {
  return hasRunningAction.value && runningAction.value !== actionId
}

function ensureLocalDestructiveCleanup() {
  if (canUseDestructiveCleanup.value) return true
  toast.warning('Azione consentita solo in locale su http://localhost/')
  return false
}

function pickUniqueIds(ids: string[], count: number) {
  return shuffle(ids).slice(0, Math.min(count, ids.length))
}

function pickTreatments(minCount: number, maxCount: number) {
  const available = treatmentIds.value
  if (available.length < minCount) {
    throw new Error(`Servono almeno ${minCount} trattamenti disponibili`)
  }
  const count = randomInt(minCount, Math.min(maxCount, available.length))
  return pickUniqueIds(available, count)
}

function pickOperators(minCount: number, maxCount: number) {
  const available = operatorIds.value
  if (available.length < minCount) {
    throw new Error(`Servono almeno ${minCount} operatori disponibili`)
  }
  const count = randomInt(minCount, Math.min(maxCount, available.length))
  const firstIndex = operatorRoundRobinCursor % available.length
  operatorRoundRobinCursor = (operatorRoundRobinCursor + 1) % available.length

  const firstOperatorId = available[firstIndex]
  if (!firstOperatorId) {
    return pickUniqueIds(available, count)
  }

  const remaining = available.filter((id) => id !== firstOperatorId)
  return [firstOperatorId, ...shuffle(remaining)].slice(0, Math.min(count, available.length))
}

function estimateTreatmentsTotal(ids: string[]) {
  const total = ids.reduce((sum, id) => {
    return sum + Number(treatmentStore.findItemsById(id)?.price ?? 0)
  }, 0)
  return roundCurrency(Math.max(0, total))
}

function randomPriceAdjustment(treatmentsTotal: number, mode: AppointmentPriceMode) {
  const base = roundCurrency(Math.max(0, treatmentsTotal))
  if (base <= 0 || mode === 'none') return 0
  const percent = randomFrom([0.05, 0.1, 0.15, 0.2]) ?? 0.1
  const amount = roundCurrency(base * percent)
  if (mode === 'up') return amount
  if (mode === 'down') return -amount
  const direction = randomFrom([-1, 1] as const) ?? 1
  return amount * direction
}

function appointmentTotalFromTreatments(treatmentsTotal: number, mode: AppointmentPriceMode) {
  const base = roundCurrency(Math.max(0, treatmentsTotal))
  const adjustment = randomPriceAdjustment(base, mode)
  return roundCurrency(Math.max(0, base + adjustment))
}

async function ensureClientId() {
  const existingId = normalizeString(randomFrom(clientStore.itemsActiveArray)?.id)
  if (existingId) return existingId
  const created = await createRandomClient('base')
  return created.id
}

async function ensureClientWithDepositsId() {
  const existingId = normalizeString(
    randomFrom(clientStore.itemsActiveArray.filter((item) => (item.deposits ?? []).length > 0))?.id,
  )
  if (existingId) return existingId
  const created = await createRandomClient('with-deposits')
  return created.id
}

async function ensureActiveCouponId() {
  const active = couponStore.itemsActiveArray.filter((item) => item.active)
  const existingId = normalizeString(randomFrom(active)?.id)
  if (existingId) return existingId
  const created = await createRandomCoupon('standard')
  return created.id
}

async function createRandomClient(variant: ClientVariant) {
  const baseGender = variant === 'male' ? 'm' : (randomFrom(['f', 'f', 'o'] as const) ?? 'f')
  const name = variant === 'male'
    ? randomFrom(maleNames) ?? 'Luca'
    : randomFrom(femaleNames) ?? 'Giulia'
  const surname = randomFrom(surnames) ?? 'Rossi'
  const preferredOperatorIds = variant === 'premium' || variant === 'with-deposits' ? pickOperators(1, 2) : []
  const code = `${Date.now().toString().slice(-5)}${randomToken(3)}`.toLocaleLowerCase()
  const deposits = variant === 'with-deposits' ? randomClientDeposits() : []

  return clientStore.add({
    name,
    surname,
    phone_number: variant === 'no-phone' ? '' : randomPhone(),
    gender: baseGender,
    email: `${name}.${surname}.${code}@test.cicbeauty.local`.replace(/\s+/g, '').toLocaleLowerCase(),
    birthdate: randomBirthdate(),
    consenso_promozioni_whatsapp: false,
    data_consenso_promozioni: null,
    preferredOperatorIds,
    preferred: [],
    note:
      variant === 'premium'
        ? `Cliente premium, ${randomFrom(notePool) ?? 'preferenze elevate'}`
        : variant === 'with-deposits'
          ? `Cliente con acquisti a deposito, ${randomFrom(notePool) ?? 'pagamenti pianificati'}`
        : variant === 'no-phone'
          ? 'Contatto senza numero di telefono'
          : randomFrom(notePool) ?? '',
    acconti: deposits,
    deposits,
    updateBy: defaultUpdateBy(),
  })
}

async function createRandomCoupon(variant: CouponVariant) {
  const today = new Date()
  const validFrom = new Date(today)
  validFrom.setHours(0, 0, 0, 0)
  const validTo = new Date(validFrom)
  validTo.setDate(validTo.getDate() + randomInt(10, 45))
  validTo.setHours(23, 59, 59, 0)

  let from = 'Playground test'
  let note = 'Coupon generato da playground'
  let clientId: string | undefined

  if (variant === 'premium') {
    from = 'Cliente premium'
    note = 'Valido su appuntamenti premium test'
  }

  if (variant === 'dedicated') {
    clientId = await ensureClientId()
    from = 'Cliente dedicato'
    note = 'Uso singolo su cliente specifico'
  }

  if (variant === 'flash') {
    from = 'Flash coupon giornata'
    note = 'Scade rapidamente'
    validTo.setDate(validFrom.getDate() + randomInt(1, 4))
  }

  const codePrefix = variant === 'premium' ? 'P' : variant === 'dedicated' ? 'D' : variant === 'flash' ? 'F' : 'X'
  const code = `${codePrefix}${Date.now().toString().slice(-5)}${randomToken(3)}`
  const treatmentIds = pickTreatments(1, 2)

  return couponStore.add({
    code,
    from,
    note,
    active: true,
    valid_from: Timestamp.fromDate(validFrom),
    valid_to: Timestamp.fromDate(validTo),
    max_usage: 1,
    client_id: clientId,
    trattamenti: treatmentIds,
    updateBy: defaultUpdateBy(),
  })
}

async function createRandomAppointment(variant: AppointmentVariant, startAt?: Date, overrides: AppointmentOverrides = {}) {
  const startDate = startAt ?? randomTodaySlot()
  const selectedOperators = variant === 'center-complete-no-coupon' ? pickOperators(1, 2) : pickOperators(1, 1)

  if (variant === 'personal') {
    const ownerId = normalizeString(selectedOperators[0] ?? Auth.uid)
    return appointmentStore.add({
      date_time: Timestamp.fromDate(startDate),
      user_id: undefined,
      client_id: undefined,
      treatment_ids: [],
      product_ids: [],
      operator_ids: selectedOperators,
      personalOwnerId: ownerId || undefined,
      isPublic: randomFrom([false, false, true]) ?? false,
      total: 0,
      fix_duration: randomFrom([-10, -5, 0, 5, 10]) ?? 0,
      coupon_id: undefined,
      notes: randomFrom(['personale', 'pausa personale', 'riunione personale']) ?? 'personale',
      reminded: false,
      updateBy: defaultUpdateBy(),
    })
  }

  const shouldPreferClientWithDeposits = variant !== 'center-basic' || Boolean(randomFrom([false, true, false]))
  const clientId = shouldPreferClientWithDeposits ? await ensureClientWithDepositsId() : await ensureClientId()
  const isComplete = variant === 'center-complete-no-coupon'
  const treatmentSelection = isComplete ? pickTreatments(2, 3) : pickTreatments(1, 2)
  const priceMode = overrides.priceMode ?? (isComplete ? 'down' : 'mixed')
  const applyCoupon = overrides.applyCoupon ?? (variant === 'center-coupon')
  const couponId = applyCoupon ? await ensureActiveCouponId() : undefined
  const treatmentTotal = estimateTreatmentsTotal(treatmentSelection)
  const total = appointmentTotalFromTreatments(treatmentTotal, priceMode)

  return appointmentStore.add({
    date_time: Timestamp.fromDate(startDate),
    user_id: clientId,
    client_id: clientId,
    treatment_ids: treatmentSelection,
    product_ids: [],
    operator_ids: selectedOperators,
    personalOwnerId: undefined,
    isPublic: true,
    total,
    fix_duration: randomFrom([0, 5, 10, 15]) ?? 0,
    coupon_id: couponId,
    notes:
      applyCoupon
        ? 'Appuntamento test con coupon'
        : isComplete
          ? 'Appuntamento completo test (2+ trattamenti, prezzo personalizzato, no coupon)'
          : 'Appuntamento centro estetico test',
    reminded: false,
    updateBy: defaultUpdateBy(),
  })
}

async function createMixedAppointments(countValue: unknown, dateFactory: () => Date, options: MixedBatchOptions = {}) {
  const count = normalizePositiveInt(countValue, 1, 1, 5000)
  const baseVariants: AppointmentVariant[] = options.includeCouponVariant === false
    ? ['personal', 'center-basic', 'center-complete-no-coupon']
    : ['personal', 'center-basic', 'center-complete-no-coupon', 'center-coupon']

  for (let index = 0; index < count; index += 1) {
    const variant = randomFrom(baseVariants) ?? 'center-basic'
    await createRandomAppointment(variant, dateFactory(), {
      priceMode: options.priceMode,
      applyCoupon: options.applyCoupon,
    })
  }

  return count
}

async function onCreateClientBase() {
  await runAction('client-base', 'Creazione cliente base', async () => {
    const created = await createRandomClient('base')
    toast.success(`Cliente base creato: ${created.name} ${created.surname}`)
    pushLog(`Cliente base creato (${created.id})`)
  })
}

async function onCreateClientPremium() {
  await runAction('client-premium', 'Creazione cliente premium', async () => {
    const created = await createRandomClient('premium')
    toast.success(`Cliente premium creato: ${created.name} ${created.surname}`)
    pushLog(`Cliente premium creato (${created.id})`)
  })
}

async function onCreateClientNoPhone() {
  await runAction('client-no-phone', 'Creazione cliente no-phone', async () => {
    const created = await createRandomClient('no-phone')
    toast.success(`Cliente no-phone creato: ${created.name} ${created.surname}`)
    pushLog(`Cliente no-phone creato (${created.id})`)
  })
}

async function onCreateClientMale() {
  await runAction('client-male', 'Creazione cliente maschile', async () => {
    const created = await createRandomClient('male')
    toast.success(`Cliente maschile creato: ${created.name} ${created.surname}`)
    pushLog(`Cliente maschile creato (${created.id})`)
  })
}

async function onCreateClientWithDeposits() {
  await runAction('client-with-deposits', 'Creazione cliente con acconti', async () => {
    const created = await createRandomClient('with-deposits')
    toast.success(`Cliente con acconti creato: ${created.name} ${created.surname}`)
    pushLog(`Cliente con acconti creato (${created.id})`)
  })
}

async function onCreateClientBatch() {
  await runAction('client-batch', 'Creazione batch clienti', async () => {
    const variants: ClientVariant[] = ['base', 'premium', 'no-phone', 'male', 'with-deposits']
    const createdIds: string[] = []
    const withDeposits = await createRandomClient('with-deposits')
    createdIds.push(withDeposits.id)
    for (let index = 1; index < 5; index += 1) {
      const created = await createRandomClient(randomFrom(variants) ?? 'base')
      createdIds.push(created.id)
    }
    toast.success('Creati 5 clienti misti (almeno 1 con acconti)')
    pushLog(`Batch clienti creato (${createdIds.length}, con acconti incluso)`)
  })
}

async function onCreateClientBatch100() {
  await runAction('client-batch-100', 'Creazione 100 clienti misti', async () => {
    const variants: ClientVariant[] = ['base', 'premium', 'no-phone', 'male', 'with-deposits']
    await createRandomClient('with-deposits')
    for (let index = 1; index < 100; index += 1) {
      await createRandomClient(randomFrom(variants) ?? 'base')
    }
    toast.success('Creati 100 clienti misti (almeno 1 con acconti)')
    pushLog('Batch clienti creato (100, con acconti incluso)')
  })
}

async function onCreateCouponFixed() {
  await runAction('coupon-fixed', 'Creazione coupon standard', async () => {
    const created = await createRandomCoupon('standard')
    toast.success(`Coupon standard creato: ${created.code}`)
    pushLog(`Coupon standard creato (${created.id})`)
  })
}

async function onCreateCouponPercent() {
  await runAction('coupon-percent', 'Creazione coupon premium', async () => {
    const created = await createRandomCoupon('premium')
    toast.success(`Coupon premium creato: ${created.code}`)
    pushLog(`Coupon premium creato (${created.id})`)
  })
}

async function onCreateCouponDedicated() {
  await runAction('coupon-dedicated', 'Creazione coupon dedicato', async () => {
    const created = await createRandomCoupon('dedicated')
    toast.success(`Coupon dedicato creato: ${created.code}`)
    pushLog(`Coupon dedicato creato (${created.id})`)
  })
}

async function onCreateCouponBatch() {
  await runAction('coupon-batch', 'Creazione batch coupon', async () => {
    const variants: CouponVariant[] = ['standard', 'premium', 'flash']
    for (const variant of variants) {
      await createRandomCoupon(variant)
    }
    toast.success('Creati 3 coupon misti')
    pushLog('Batch coupon creato (3)')
  })
}

async function onCreateCouponBatch10() {
  await runAction('coupon-batch-10', 'Creazione 10 coupon misti', async () => {
    const variants: CouponVariant[] = ['standard', 'premium', 'dedicated', 'flash']
    for (let index = 0; index < 10; index += 1) {
      await createRandomCoupon(randomFrom(variants) ?? 'standard')
    }
    toast.success('Creati 10 coupon misti')
    pushLog('Batch coupon creato (10)')
  })
}

async function onCreateAppointmentPersonalToday() {
  await runAction('appointment-personal', 'Creazione appuntamento personale', async () => {
    const start = todayAt(randomFrom([8, 9, 18]) ?? 9, randomFrom([0, 30]) ?? 0)
    const created = await createRandomAppointment('personal', start)
    toast.success(`Appuntamento personale creato alle ${formatHour(start)}`)
    pushLog(`Appuntamento personale creato (${created.id})`)
  })
}

async function onCreateAppointmentCenterBasicToday() {
  await runAction('appointment-basic', 'Creazione appuntamento base', async () => {
    const start = todayAt(randomFrom([10, 11, 12]) ?? 10, randomFrom([0, 15, 30, 45]) ?? 0)
    const created = await createRandomAppointment('center-basic', start)
    toast.success(`Appuntamento centro base creato alle ${formatHour(start)}`)
    pushLog(`Appuntamento base creato (${created.id})`)
  })
}

async function onCreateAppointmentCompleteTodayNoCoupon() {
  await runAction('appointment-complete', 'Creazione appuntamento completo', async () => {
    const start = todayAt(randomFrom([13, 14, 15, 16]) ?? 14, randomFrom([0, 15, 30]) ?? 30)
    const created = await createRandomAppointment('center-complete-no-coupon', start)
    toast.success(`Appuntamento completo (2+ trattamenti, prezzo personalizzato, no coupon) alle ${formatHour(start)}`)
    pushLog(`Appuntamento completo no-coupon creato (${created.id})`)
  })
}

async function onCreateAppointmentCouponToday() {
  await runAction('appointment-coupon', 'Creazione appuntamento con coupon', async () => {
    const start = todayAt(randomFrom([16, 17, 18]) ?? 17, randomFrom([0, 15, 30]) ?? 0)
    const created = await createRandomAppointment('center-coupon', start)
    toast.success(`Appuntamento con coupon creato alle ${formatHour(start)}`)
    pushLog(`Appuntamento con coupon creato (${created.id})`)
  })
}

async function onCreateAppointmentBatchToday() {
  await runAction('appointment-batch', 'Creazione batch appuntamenti', async () => {
    const batch: Array<{ variant: AppointmentVariant; date: Date }> = [
      { variant: 'personal', date: todayAt(9, 0) },
      { variant: 'center-basic', date: todayAt(11, 30) },
      { variant: 'center-complete-no-coupon', date: todayAt(14, 45) },
      { variant: 'center-coupon', date: todayAt(17, 15) },
    ]

    for (const item of batch) {
      await createRandomAppointment(item.variant, item.date)
    }

    toast.success('Creati 4 appuntamenti random nella giornata attuale')
    pushLog('Batch appuntamenti giornata creato (4)')
  })
}

async function onCreateAppointmentRange1000SixMonths() {
  await runAction('appointment-1000-range', 'Creazione 1000 appuntamenti (3 mesi prima + 3 mesi dopo)', async () => {
    const now = new Date()
    const rangeStart = new Date(now)
    rangeStart.setMonth(rangeStart.getMonth() - 3)
    rangeStart.setHours(0, 0, 0, 0)

    const rangeEnd = new Date(now)
    rangeEnd.setMonth(rangeEnd.getMonth() + 3)
    rangeEnd.setHours(23, 59, 59, 999)

    const created = await createMixedAppointments(1000, () => randomDateInRange(rangeStart, rangeEnd), {
      includeCouponVariant: true,
    })

    toast.success(`Creati ${created} appuntamenti nel range 6 mesi`)
    pushLog(`Batch appuntamenti range 6 mesi creato (${created})`)
  })
}

async function onCreateAppointmentCurrentMonth100() {
  await runAction('appointment-100-current-month', 'Creazione 100 appuntamenti mese corrente', async () => {
    const currentMonth = toMonthInputValue(new Date())
    const { start, end, label } = monthRangeFromInput(currentMonth)
    const created = await createMixedAppointments(100, () => randomDateInRange(start, end), {
      includeCouponVariant: true,
    })
    toast.success(`Creati ${created} appuntamenti misti su ${label}`)
    pushLog(`Batch appuntamenti mese corrente creato (${created})`)
  })
}

function activeIds(items: Array<{ id: string }>) {
  return items
    .map((item) => normalizeString(item.id))
    .filter(Boolean)
}

async function onDeleteAllAppointments() {
  if (!ensureLocalDestructiveCleanup()) return

  const total = appointmentStore.itemsActiveArray.length
  if (!total) {
    toast.warning('Nessun appuntamento da eliminare')
    return
  }

  const ok = window.confirm(`Sei sicuro di eliminare tutti gli appuntamenti (${total})?`)
  if (!ok) return

  await runAction('delete-all-appointments', 'Eliminazione tutti gli appuntamenti', async () => {
    const ids = activeIds(appointmentStore.itemsActiveArray)
    for (const id of ids) {
      await appointmentStore.delete(id)
    }
    toast.success(`Eliminati ${ids.length} appuntamenti`)
    pushLog(`Eliminati ${ids.length} appuntamenti`)
  })
}

async function onDeleteAllClients() {
  if (!ensureLocalDestructiveCleanup()) return

  const total = clientStore.itemsActiveArray.length
  if (!total) {
    toast.warning('Nessun cliente da eliminare')
    return
  }

  const ok = window.confirm(`Sei sicuro di eliminare tutti i clienti (${total})?`)
  if (!ok) return

  await runAction('delete-all-clients', 'Eliminazione tutti i clienti', async () => {
    const ids = activeIds(clientStore.itemsActiveArray)
    for (const id of ids) {
      await clientStore.delete(id)
    }
    toast.success(`Eliminati ${ids.length} clienti`)
    pushLog(`Eliminati ${ids.length} clienti`)
  })
}

async function onDeleteAllCoupons() {
  if (!ensureLocalDestructiveCleanup()) return

  const total = couponStore.itemsActiveArray.length
  if (!total) {
    toast.warning('Nessun coupon da eliminare')
    return
  }

  const ok = window.confirm(`Sei sicuro di eliminare tutti i coupon (${total})?`)
  if (!ok) return

  await runAction('delete-all-coupons', 'Eliminazione tutti i coupon', async () => {
    const ids = activeIds(couponStore.itemsActiveArray)
    for (const id of ids) {
      await couponStore.delete(id)
    }
    toast.success(`Eliminati ${ids.length} coupon`)
    pushLog(`Eliminati ${ids.length} coupon`)
  })
}

async function onGenerateAppointmentsTodayFromForm() {
  await runAction('appointment-form-today', 'Form appuntamenti oggi', async () => {
    const count = normalizePositiveInt(appointmentsTodayCount.value, 12, 1, 1000)
    appointmentsTodayCount.value = count
    const start = todayAt(0, 0)
    const end = todayAt(23, 59)
    const created = await createMixedAppointments(count, () => randomDateInRange(start, end), {
      includeCouponVariant: true,
    })
    toast.success(`Creati ${created} appuntamenti misti per oggi`)
    pushLog(`Form oggi: creati ${created} appuntamenti`)
  })
}

async function onGenerateAppointmentsMonthFromForm() {
  await runAction('appointment-form-month', 'Form appuntamenti per mese', async () => {
    const count = normalizePositiveInt(appointmentsMonthCount.value, 40, 1, 2000)
    appointmentsMonthCount.value = count
    const { start, end, label } = monthRangeFromInput(appointmentsMonthValue.value)
    const created = await createMixedAppointments(count, () => randomDateInRange(start, end), {
      includeCouponVariant: true,
    })
    toast.success(`Creati ${created} appuntamenti misti su ${label}`)
    pushLog(`Form mese (${label}): creati ${created} appuntamenti`)
  })
}

async function onGenerateAppointmentsMonthAdvancedFromForm() {
  await runAction('appointment-form-month-advanced', 'Form appuntamenti mese avanzato', async () => {
    const count = normalizePositiveInt(appointmentsMonthAdvancedCount.value, 40, 1, 2000)
    appointmentsMonthAdvancedCount.value = count
    const { start, end, label } = monthRangeFromInput(appointmentsMonthAdvancedValue.value)
    const includeCoupon = Boolean(appointmentsMonthAdvancedCoupon.value)
    const created = await createMixedAppointments(count, () => randomDateInRange(start, end), {
      includeCouponVariant: includeCoupon,
      priceMode: appointmentsMonthAdvancedPriceMode.value,
      applyCoupon: includeCoupon,
    })
    toast.success(`Creati ${created} appuntamenti su ${label} (form avanzato)`)
    pushLog(`Form mese avanzato (${label}): creati ${created} appuntamenti`)
  })
}

async function onGenerateAppointmentsByCheckedMonthsFromForm() {
  await runAction('appointment-form-months-checkbox', 'Form appuntamenti per mesi selezionati', async () => {
    const selectedMonths = monthOptions.filter((month) => appointmentsByMonthsSelection.value[month.key])
    if (!selectedMonths.length) {
      toast.warning('Seleziona almeno un mese')
      return
    }

    const year = normalizePositiveInt(appointmentsByMonthsYear.value, new Date().getFullYear(), 2000, 2100)
    const countPerMonth = normalizePositiveInt(appointmentsByMonthsCount.value, 20, 1, 1000)
    appointmentsByMonthsYear.value = year
    appointmentsByMonthsCount.value = countPerMonth

    let totalCreated = 0
    for (const month of selectedMonths) {
      const { start, end } = monthRangeFromInput(`${year}-${month.key}`)
      const created = await createMixedAppointments(countPerMonth, () => randomDateInRange(start, end), {
        includeCouponVariant: true,
      })
      totalCreated += created
    }

    toast.success(`Creati ${totalCreated} appuntamenti su ${selectedMonths.length} mesi`)
    pushLog(`Form mesi check: creati ${totalCreated} appuntamenti`)
  })
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Test Playground" :to="{ name: 'home' }" />

    <div class="test-wrapper mx-auto py-3 py-md-4">
      <section class="card border-0 shadow-sm p-3 p-md-4">
        <h2 class="h6 text-uppercase mb-1">Generatori Dati Test</h2>
        <p class="small text-muted mb-4">
          Bottoni one-click per creare clienti, coupon e appuntamenti random con caratteristiche diverse.
        </p>
        <p class="small mb-0">
          Clienti: {{ clientStore.itemsActiveArray.length }} | Coupon: {{ couponStore.itemsActiveArray.length }} |
          Appuntamenti: {{ appointmentStore.itemsActiveArray.length }} |
          Trattamenti: {{ treatmentStore.itemsActiveArray.length }} | Operatori: {{ operatorIds.length }}
        </p>
        <p v-if="runningAction" class="small text-muted mb-0 mt-2">
          Azione in corso: <strong>{{ runningAction }}</strong>
        </p>
      </section>

      <section class="card border-0 shadow-sm p-3 p-md-4 mt-3">
        <h2 class="h6 text-uppercase mb-1">Pulizia Dati</h2>
        <p class="small text-muted mb-3">
          Azioni distruttive: eliminano definitivamente tutti i record della categoria scelta dopo conferma.
        </p>
        <p v-if="!canUseDestructiveCleanup" class="small text-warning mb-3">
          Disponibile solo in ambiente locale su <code>http://localhost/</code>.
        </p>
        <div class="playground-actions">
          <Btn
            type="button"
            color="dark"
            icon="delete_sweep"
            :loading="isActionBusy('delete-all-appointments')"
            :disabled="isActionDisabled('delete-all-appointments') || !canUseDestructiveCleanup"
            @click="onDeleteAllAppointments"
          >
            Elimina tutti gli appuntamenti
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="person_remove"
            :loading="isActionBusy('delete-all-clients')"
            :disabled="isActionDisabled('delete-all-clients') || !canUseDestructiveCleanup"
            @click="onDeleteAllClients"
          >
            Elimina tutti i clienti
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="local_offer"
            :loading="isActionBusy('delete-all-coupons')"
            :disabled="isActionDisabled('delete-all-coupons') || !canUseDestructiveCleanup"
            @click="onDeleteAllCoupons"
          >
            Elimina tutti i coupon
          </Btn>
        </div>
      </section>

      <section class="card border-0 shadow-sm p-3 p-md-4 mt-3">
        <h2 class="h6 text-uppercase mb-1">Clienti Random</h2>
        <p class="small text-muted mb-3">
          Ogni bottone crea clienti con profili diversi (base, premium, no-phone, maschile, con acconti, batch).
        </p>
        <div class="playground-actions">
          <Btn
            type="button"
            color="dark"
            icon="person_add"
            :loading="isActionBusy('client-base')"
            :disabled="isActionDisabled('client-base')"
            @click="onCreateClientBase"
          >
            Cliente base
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="stars"
            :loading="isActionBusy('client-premium')"
            :disabled="isActionDisabled('client-premium')"
            @click="onCreateClientPremium"
          >
            Cliente premium
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="alternate_email"
            :loading="isActionBusy('client-no-phone')"
            :disabled="isActionDisabled('client-no-phone')"
            @click="onCreateClientNoPhone"
          >
            Cliente no-phone
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="face"
            :loading="isActionBusy('client-male')"
            :disabled="isActionDisabled('client-male')"
            @click="onCreateClientMale"
          >
            Cliente maschile
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="payments"
            :loading="isActionBusy('client-with-deposits')"
            :disabled="isActionDisabled('client-with-deposits')"
            @click="onCreateClientWithDeposits"
          >
            Cliente con acconti
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="groups"
            :loading="isActionBusy('client-batch')"
            :disabled="isActionDisabled('client-batch')"
            @click="onCreateClientBatch"
          >
            5 clienti misti
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="rocket_launch"
            :loading="isActionBusy('client-batch-100')"
            :disabled="isActionDisabled('client-batch-100')"
            @click="onCreateClientBatch100"
          >
            100 clienti misti
          </Btn>
        </div>
      </section>

      <section class="card border-0 shadow-sm p-3 p-md-4 mt-3">
        <h2 class="h6 text-uppercase mb-1">Coupon Random</h2>
        <p class="small text-muted mb-3">
          Crea coupon con regole diverse: standard, premium, dedicato a cliente e batch misto.
        </p>
        <div class="playground-actions">
          <Btn
            type="button"
            color="dark"
            icon="sell"
            :loading="isActionBusy('coupon-fixed')"
            :disabled="isActionDisabled('coupon-fixed')"
            @click="onCreateCouponFixed"
          >
            Coupon standard
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="percent"
            :loading="isActionBusy('coupon-percent')"
            :disabled="isActionDisabled('coupon-percent')"
            @click="onCreateCouponPercent"
          >
            Coupon premium
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="person_pin"
            :loading="isActionBusy('coupon-dedicated')"
            :disabled="isActionDisabled('coupon-dedicated')"
            @click="onCreateCouponDedicated"
          >
            Coupon dedicato cliente
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="playlist_add"
            :loading="isActionBusy('coupon-batch')"
            :disabled="isActionDisabled('coupon-batch')"
            @click="onCreateCouponBatch"
          >
            3 coupon misti
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="inventory_2"
            :loading="isActionBusy('coupon-batch-10')"
            :disabled="isActionDisabled('coupon-batch-10')"
            @click="onCreateCouponBatch10"
          >
            10 coupon misti
          </Btn>
        </div>
      </section>

      <section class="card border-0 shadow-sm p-3 p-md-4 mt-3">
        <h2 class="h6 text-uppercase mb-1">Appuntamenti Random</h2>
        <p class="small text-muted mb-3">
          Bottoni validati: personale, base centro, completo (2+ trattamenti, prezzo personalizzato, no coupon), con coupon, batch giornata.
        </p>
        <div class="playground-actions">
          <Btn
            type="button"
            color="dark"
            icon="event_available"
            :loading="isActionBusy('appointment-personal')"
            :disabled="isActionDisabled('appointment-personal')"
            @click="onCreateAppointmentPersonalToday"
          >
            Appuntamento personale oggi
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="event"
            :loading="isActionBusy('appointment-basic')"
            :disabled="isActionDisabled('appointment-basic')"
            @click="onCreateAppointmentCenterBasicToday"
          >
            Appuntamento centro oggi (base)
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="auto_awesome"
            :loading="isActionBusy('appointment-complete')"
            :disabled="isActionDisabled('appointment-complete')"
            @click="onCreateAppointmentCompleteTodayNoCoupon"
          >
            Completo oggi (2+ trattamenti, prezzo personalizzato, no coupon)
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="local_offer"
            :loading="isActionBusy('appointment-coupon')"
            :disabled="isActionDisabled('appointment-coupon')"
            @click="onCreateAppointmentCouponToday"
          >
            Appuntamento con coupon oggi
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="playlist_add_check"
            :loading="isActionBusy('appointment-batch')"
            :disabled="isActionDisabled('appointment-batch')"
            @click="onCreateAppointmentBatchToday"
          >
            Pacchetto giornata (4 appuntamenti)
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="date_range"
            :loading="isActionBusy('appointment-100-current-month')"
            :disabled="isActionDisabled('appointment-100-current-month')"
            @click="onCreateAppointmentCurrentMonth100"
          >
            100 appuntamenti (mese corrente)
          </Btn>
          <Btn
            type="button"
            color="dark"
            icon="date_range"
            :loading="isActionBusy('appointment-1000-range')"
            :disabled="isActionDisabled('appointment-1000-range')"
            @click="onCreateAppointmentRange1000SixMonths"
          >
            1000 appuntamenti (3 mesi prima + 3 mesi dopo)
          </Btn>
        </div>
      </section>

      <section class="card border-0 shadow-sm p-3 p-md-4 mt-3">
        <h2 class="h6 text-uppercase mb-1">Form Appuntamenti</h2>
        <p class="small text-muted mb-3">
          Mini form per generare appuntamenti misti con quantità, mese e opzioni (prezzo/coupon).
        </p>

        <div class="appointment-forms-grid">
          <form class="mini-form" @submit.prevent="onGenerateAppointmentsTodayFromForm">
            <h3 class="h6 mb-2">Oggi + quantita</h3>
            <div class="mini-form__fields">
              <div>
                <label class="form-label small mb-1">Quanti appuntamenti</label>
                <input v-model.number="appointmentsTodayCount" type="number" min="1" max="1000" class="form-control form-control-sm" />
              </div>
              <Btn
                type="submit"
                color="dark"
                icon="play_arrow"
                :loading="isActionBusy('appointment-form-today')"
                :disabled="isActionDisabled('appointment-form-today')"
              >
                Genera oggi
              </Btn>
            </div>
          </form>

          <form class="mini-form" @submit.prevent="onGenerateAppointmentsMonthFromForm">
            <h3 class="h6 mb-2">Mese + quantita</h3>
            <div class="mini-form__fields">
              <div>
                <label class="form-label small mb-1">Mese</label>
                <input v-model="appointmentsMonthValue" type="month" class="form-control form-control-sm" />
              </div>
              <div>
                <label class="form-label small mb-1">Quanti appuntamenti</label>
                <input v-model.number="appointmentsMonthCount" type="number" min="1" max="2000" class="form-control form-control-sm" />
              </div>
              <Btn
                type="submit"
                color="dark"
                icon="calendar_month"
                :loading="isActionBusy('appointment-form-month')"
                :disabled="isActionDisabled('appointment-form-month')"
              >
                Genera mese
              </Btn>
            </div>
          </form>

          <form class="mini-form" @submit.prevent="onGenerateAppointmentsMonthAdvancedFromForm">
            <h3 class="h6 mb-2">Mese + quantità + opzioni</h3>
            <div class="mini-form__fields">
              <div>
                <label class="form-label small mb-1">Mese</label>
                <input v-model="appointmentsMonthAdvancedValue" type="month" class="form-control form-control-sm" />
              </div>
              <div>
                <label class="form-label small mb-1">Quanti appuntamenti</label>
                <input v-model.number="appointmentsMonthAdvancedCount" type="number" min="1" max="2000" class="form-control form-control-sm" />
              </div>
              <div>
                <label class="form-label small mb-1">Prezzo finale</label>
                <select v-model="appointmentsMonthAdvancedPriceMode" class="form-select form-select-sm">
                  <option value="none">Totale trattamenti</option>
                  <option value="down">Prezzo ridotto</option>
                  <option value="up">Prezzo maggiorato</option>
                  <option value="mixed">Variazione mista</option>
                </select>
              </div>
              <div class="mini-form__checks">
                <label class="mini-check">
                  <input v-model="appointmentsMonthAdvancedCoupon" type="checkbox" />
                  <span>Coupon</span>
                </label>
              </div>
              <Btn
                type="submit"
                color="dark"
                icon="tune"
                :loading="isActionBusy('appointment-form-month-advanced')"
                :disabled="isActionDisabled('appointment-form-month-advanced')"
              >
                Genera avanzato
              </Btn>
            </div>
          </form>

          <form class="mini-form mini-form--full" @submit.prevent="onGenerateAppointmentsByCheckedMonthsFromForm">
            <h3 class="h6 mb-2">Check mesi + quantita</h3>
            <div class="mini-form__fields mini-form__fields--months">
              <div>
                <label class="form-label small mb-1">Anno</label>
                <input v-model.number="appointmentsByMonthsYear" type="number" min="2000" max="2100" class="form-control form-control-sm" />
              </div>
              <div>
                <label class="form-label small mb-1">Quanti appuntamenti per mese selezionato</label>
                <input v-model.number="appointmentsByMonthsCount" type="number" min="1" max="1000" class="form-control form-control-sm" />
              </div>
              <div class="months-grid">
                <label v-for="month in monthOptions" :key="month.key" class="month-check">
                  <input v-model="appointmentsByMonthsSelection[month.key]" type="checkbox" />
                  <span>{{ month.label }}</span>
                </label>
              </div>
              <Btn
                type="submit"
                color="dark"
                icon="calendar_view_month"
                :loading="isActionBusy('appointment-form-months-checkbox')"
                :disabled="isActionDisabled('appointment-form-months-checkbox')"
              >
                Genera mesi selezionati
              </Btn>
            </div>
          </form>
        </div>
      </section>

      <section class="card border-0 shadow-sm p-3 p-md-4 mt-3">
        <h2 class="h6 text-uppercase mb-1">Log Azioni</h2>
        <p v-if="!actionLog.length" class="small text-muted mb-0">
          Nessuna azione eseguita ancora.
        </p>
        <div v-else class="playground-log">
          <div v-for="line in actionLog" :key="line" class="playground-log__row">
            {{ line }}
          </div>
        </div>
      </section>

      <AiPromptLauncherCard class="mt-3" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.test-wrapper {
  max-width: 980px;
}

.playground-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.6rem;
}

.appointment-forms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.8rem;
}

.mini-form {
  border: 1px solid rgba(84, 44, 58, 0.14);
  border-radius: 0.6rem;
  padding: 0.6rem;
  background: rgba(255, 255, 255, 0.72);
}

.mini-form--full {
  grid-column: 1 / -1;
}

.mini-form__fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

.mini-form__fields--months {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.mini-form__checks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  padding-top: 0.1rem;
}

.mini-check {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.82rem;
}

.months-grid {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
  gap: 0.35rem;
}

.month-check {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(84, 44, 58, 0.16);
  border-radius: 0.45rem;
  padding: 0.3rem 0.4rem;
  font-size: 0.8rem;
}

.playground-log {
  max-height: 220px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.playground-log__row {
  border: 1px solid rgba(84, 44, 58, 0.14);
  border-radius: 0.4rem;
  padding: 0.24rem 0.45rem;
  font-size: 0.82rem;
  background: rgba(255, 255, 255, 0.78);
}
</style>

