// src/models/Client.ts
import { FirestoreModel, normalizeGender, type Gender, type Timestampble } from 'cic-kit'
import { Timestamp } from 'firebase/firestore'
import { asDate } from '../utils/date'
import { normalizeLaserSheetRecord, type LaserSheetRecord } from './laserSheet'

export type ClientDepositSettlement = {
  note: string
  paidAmount: number
  date: string
}

export type ClientDeposit = {
  totalAmount: number
  reason: string
  settlements: ClientDepositSettlement[]
}

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeMoney(value: unknown) {
  const next = Number(value)
  if (!Number.isFinite(next)) return 0
  return Math.max(0, Math.round(next * 100) / 100)
}

function normalizeOptionalTimestamp(value: unknown) {
  if (!value) return undefined
  if (value instanceof Timestamp) return value
  const nextDate = asDate(value)
  if (!nextDate) return undefined
  return Timestamp.fromDate(nextDate)
}

function normalizeDate(value: unknown) {
  const raw = normalizeString(value)
  if (!raw) return ''
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeUrlList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => normalizeString(item)).filter(Boolean))]
}

function normalizePositiveInteger(value: unknown) {
  const next = Number(value)
  if (!Number.isFinite(next)) return undefined
  const integer = Math.round(next)
  if (integer <= 0) return undefined
  return integer
}

function normalizeSettlements(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return undefined
      const row = item as Record<string, unknown>
      const date = normalizeDate(row.date)
      return {
        note: normalizeString(row.note),
        paidAmount: normalizeMoney(row.paidAmount ?? row.amount ?? row.saldato),
        date,
      }
    })
    .filter((item): item is ClientDepositSettlement => Boolean(item))
}

function normalizeDeposits(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return undefined
      const row = item as Record<string, unknown>
      const totalAmount = normalizeMoney(row.totalAmount ?? row.total ?? row.totale)
      const reason = normalizeString(row.reason ?? row.motivo)
      const settlements = normalizeSettlements(row.settlements ?? row.balances ?? row.saldi)
      return {
        totalAmount,
        reason,
        settlements,
      }
    })
    .filter((item): item is ClientDeposit => Boolean(item))
}

export interface ClientData extends Partial<Timestampble> {
  id: string
  name: string
  surname: string
  phone_number?: string
  consenso_promozioni_whatsapp: boolean
  data_consenso_promozioni?: Timestamp | null
  birthdate?: string
  gender: Gender
  email?: string
  preferredOperatorIds?: string[]
  preferred?: string[]
  user_id?: string
  old_id?: string
  note?: string
  acconti?: ClientDeposit[]
  deposits?: ClientDeposit[]
  fileUrls?: string[]
  schedaLaser?: LaserSheetRecord
  dataSchiedaLaser?: Timestamp | null
  schedaLaserNumber?: number
  laserDocUrls?: string[]
  laserMediaUrls?: string[]
  laserShareToken?: string
  laserShareTokenHash?: string
  laserShareTokenExpiresAt?: Timestamp | null
  laserShareTokenCreatedAt?: Timestamp | null
  laserShareTokenOperatorFirstName?: string
  laserShareSkippedKeys?: string[]
  updateBy: string
}

export class Client extends FirestoreModel<ClientData> {
  static collectionName = 'clients'
  // protected localStorageKey() { return 'clients' }

  name: string
  surname: string
  phone_number?: string
  consenso_promozioni_whatsapp: boolean
  data_consenso_promozioni?: Timestamp
  birthdate?: string
  gender: Gender
  email?: string
  preferredOperatorIds?: string[]
  preferred?: string[]
  user_id?: string
  old_id?: string
  note?: string
  deposits: ClientDeposit[]
  fileUrls: string[]
  schedaLaser?: LaserSheetRecord
  dataSchiedaLaser?: Timestamp
  schedaLaserNumber?: number
  laserDocUrls: string[]
  laserMediaUrls: string[]
  laserShareToken?: string
  laserShareTokenHash?: string
  laserShareTokenExpiresAt?: Timestamp
  laserShareTokenCreatedAt?: Timestamp
  laserShareTokenOperatorFirstName?: string
  laserShareSkippedKeys: string[]
  updateBy: string

  constructor(data: ClientData) {
    super(data)
    this.name = data.name
    this.surname = data.surname
    this.phone_number = data.phone_number
    this.consenso_promozioni_whatsapp = Boolean(data.consenso_promozioni_whatsapp)
    this.data_consenso_promozioni = normalizeOptionalTimestamp(data.data_consenso_promozioni)
    this.birthdate = data.birthdate
    const normalizedGender = normalizeGender(data.gender)
    this.gender = normalizedGender || 'f'
    this.email = data.email
    this.preferredOperatorIds = Array.isArray(data.preferredOperatorIds) ? data.preferredOperatorIds : []
    this.preferred = Array.isArray(data.preferred) ? data.preferred : []
    this.user_id = data.user_id
    this.old_id = data.old_id
    this.note = data.note
    this.deposits = normalizeDeposits(data.deposits ?? data.acconti)
    this.fileUrls = normalizeUrlList(data.fileUrls)
    this.schedaLaser = normalizeLaserSheetRecord(data.schedaLaser)
    this.dataSchiedaLaser = normalizeOptionalTimestamp(data.dataSchiedaLaser)
    this.schedaLaserNumber = normalizePositiveInteger(data.schedaLaserNumber)
    this.laserDocUrls = normalizeUrlList(data.laserDocUrls)
    this.laserMediaUrls = normalizeUrlList(data.laserMediaUrls)
    this.laserShareToken = normalizeString(data.laserShareToken)
    this.laserShareTokenHash = normalizeString(data.laserShareTokenHash)
    this.laserShareTokenExpiresAt = normalizeOptionalTimestamp(data.laserShareTokenExpiresAt)
    this.laserShareTokenCreatedAt = normalizeOptionalTimestamp(data.laserShareTokenCreatedAt)
    this.laserShareTokenOperatorFirstName = normalizeString(data.laserShareTokenOperatorFirstName)
    this.laserShareSkippedKeys = normalizeStringList(data.laserShareSkippedKeys)
    this.updateBy = data.updateBy
  }

  toData(): ClientData {
    return {
      id: this.id,
      name: this.name,
      surname: this.surname,
      phone_number: this.phone_number,
      consenso_promozioni_whatsapp: this.consenso_promozioni_whatsapp,
      data_consenso_promozioni: this.data_consenso_promozioni,
      birthdate: this.birthdate,
      gender: this.gender,
      email: this.email,
      preferredOperatorIds: this.preferredOperatorIds,
      preferred: this.preferred,
      user_id: this.user_id,
      old_id: this.old_id,
      note: this.note,
      acconti: this.deposits,
      deposits: this.deposits,
      fileUrls: this.fileUrls,
      schedaLaser: this.schedaLaser,
      dataSchiedaLaser: this.dataSchiedaLaser,
      schedaLaserNumber: this.schedaLaserNumber,
      laserDocUrls: this.laserDocUrls,
      laserMediaUrls: this.laserMediaUrls,
      laserShareToken: this.laserShareToken,
      laserShareTokenHash: this.laserShareTokenHash,
      laserShareTokenExpiresAt: this.laserShareTokenExpiresAt,
      laserShareTokenCreatedAt: this.laserShareTokenCreatedAt,
      laserShareTokenOperatorFirstName: this.laserShareTokenOperatorFirstName,
      laserShareSkippedKeys: this.laserShareSkippedKeys,
      updateBy: this.updateBy,
      ...this.timestampbleProps()
    }
  }
}
