import { APP_CONFIG_DEFAULTS, type AppConfigData } from '../models/AppConfig'
import type { Coupon } from '../models/Coupon'
import { asDate } from './date'

type AppointmentCouponLike = {
  id?: string
  coupon_id?: string
}

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

export function toIsoDateInput(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromIsoDateInput(value: unknown) {
  const normalized = normalizeString(value)
  if (!normalized) return undefined
  const parsed = asDate(`${normalized}T12:00:00`)
  if (!parsed) return undefined
  return parsed
}

export function addMonthsSafe(value: Date, months: number) {
  const next = new Date(value)
  next.setMonth(next.getMonth() + months)
  return next
}

export function buildDefaultCouponValidity(reference = new Date()) {
  const validFromDate = new Date(reference)
  validFromDate.setHours(0, 0, 0, 0)
  const validUntilDate = addMonthsSafe(validFromDate, 2)
  validUntilDate.setHours(23, 59, 59, 999)

  return {
    validFrom: toIsoDateInput(validFromDate),
    validUntil: toIsoDateInput(validUntilDate),
    validFromDate,
    validUntilDate,
  }
}

function randomCouponToken(size = 5) {
  const token = Math.random().toString(36).slice(2, 2 + size).toUpperCase()
  return token.padEnd(size, 'X')
}

export function buildGiftCouponCode(reference = new Date()) {
  const year = String(reference.getFullYear()).slice(-2)
  const month = String(reference.getMonth() + 1).padStart(2, '0')
  const day = String(reference.getDate()).padStart(2, '0')
  return `GIFT-${year}${month}${day}-${randomCouponToken(5)}`
}

export function buildCouponUsageCountMap(appointments: AppointmentCouponLike[]) {
  const map = new Map<string, number>()
  for (const appointment of appointments) {
    const couponId = normalizeString(appointment.coupon_id)
    if (!couponId) continue
    map.set(couponId, (map.get(couponId) ?? 0) + 1)
  }
  return map
}

export function couponUsageCount(couponId: unknown, usageMap: Map<string, number>) {
  const normalized = normalizeString(couponId)
  if (!normalized) return 0
  return usageMap.get(normalized) ?? 0
}

export function couponRemainingUses(
  coupon: Pick<Coupon, 'id' | 'max_usage'>,
  usageMap: Map<string, number>,
  keepCurrentUsage = 0,
) {
  const maxUsage = Math.max(1, Number(coupon.max_usage ?? 1))
  const usage = couponUsageCount(coupon.id, usageMap)
  return Math.max(0, maxUsage - Math.max(0, usage - keepCurrentUsage))
}

export function isCouponValidNow(coupon: Pick<Coupon, 'active' | 'valid_from' | 'valid_to'>, now = new Date()) {
  if (!coupon.active) return false
  const nowMs = now.getTime()
  const from = asDate(coupon.valid_from)
  if (from && from.getTime() > nowMs) return false
  const to = asDate(coupon.valid_to)
  if (to && to.getTime() < nowMs) return false
  return true
}

export function couponDisplayTitle(coupon?: Pick<Coupon, 'code' | 'from'> | null) {
  if (!coupon) return ''
  const code = normalizeString(coupon.code)
  const from = normalizeString(coupon.from)
  if (!code && !from) return ''
  if (!from) return code
  return `${code} - regalo da ${from}`
}

export function couponGiftedByName(coupon: Pick<Coupon, 'from'>, clientFullName: unknown) {
  const sender = normalizeString(coupon.from).toLocaleLowerCase()
  const fullName = normalizeString(clientFullName).toLocaleLowerCase()
  if (!sender || !fullName) return false
  return sender === fullName
}

export function resolveCouponContactInfo(config: AppConfigData) {
  const ownerName = normalizeString(config.ownerName) || APP_CONFIG_DEFAULTS.ownerName
  const officeAddress = normalizeString(config.officeAddress) || APP_CONFIG_DEFAULTS.officeAddress
  const publicPhone = normalizeString(config.publicPhone) || APP_CONFIG_DEFAULTS.publicPhone
  return {
    ownerName,
    officeAddress,
    publicPhone,
  }
}

