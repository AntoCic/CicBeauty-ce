import { Timestamp } from 'firebase/firestore'
import type { Coupon } from '../../models/Coupon'
import { asDate } from '../../utils/date'
import { buildDefaultCouponValidity, buildGiftCouponCode, fromIsoDateInput, toIsoDateInput } from '../../utils/couponUtils'

export type CouponGiftFormValues = {
  code: string
  from: string
  client_id: string
  trattamenti: string[]
  valid_from: string
  valid_to: string
  note: string
}

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

export function defaultCouponGiftFormValues(referenceDate = new Date()): CouponGiftFormValues {
  const validity = buildDefaultCouponValidity(referenceDate)
  return {
    code: buildGiftCouponCode(referenceDate),
    from: '',
    client_id: '',
    trattamenti: [],
    valid_from: validity.validFrom,
    valid_to: validity.validUntil,
    note: '',
  }
}

export function couponToGiftFormValues(coupon: Coupon): CouponGiftFormValues {
  const validFrom = asDate(coupon.valid_from) ?? new Date()
  const validTo = asDate(coupon.valid_to) ?? buildDefaultCouponValidity(validFrom).validUntilDate
  return {
    code: normalizeString(coupon.code),
    from: normalizeString(coupon.from),
    client_id: normalizeString(coupon.client_id),
    trattamenti: [...(coupon.trattamenti ?? [])],
    valid_from: toIsoDateInput(validFrom),
    valid_to: toIsoDateInput(validTo),
    note: normalizeString(coupon.note),
  }
}

export function normalizeCouponGiftForm(values: CouponGiftFormValues) {
  const from = normalizeString(values.from)
  const code = normalizeString(values.code).toUpperCase()
  const clientId = normalizeString(values.client_id)
  const note = normalizeString(values.note)
  const trattamenti = [...new Set((values.trattamenti ?? []).map((id) => normalizeString(id)).filter(Boolean))]

  const validFromDate = fromIsoDateInput(values.valid_from)
  const validToDate = fromIsoDateInput(values.valid_to)

  return {
    code,
    from,
    client_id: clientId || undefined,
    trattamenti,
    valid_from: validFromDate ? Timestamp.fromDate(new Date(validFromDate.setHours(0, 0, 0, 0))) : undefined,
    valid_to: validToDate ? Timestamp.fromDate(new Date(validToDate.setHours(23, 59, 59, 999))) : undefined,
    note,
    active: true,
    max_usage: 1,
  }
}

