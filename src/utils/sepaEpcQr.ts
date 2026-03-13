const MAX_EPC_AMOUNT = 999999999.99
const MIN_EPC_AMOUNT = 0.01
const EPC_AMOUNT_DECIMALS = 2
const MAX_BENEFICIARY_NAME_LENGTH = 70
const MAX_REMITTANCE_TEXT_LENGTH = 140
const MAX_BENEFICIARY_INFO_LENGTH = 70

const IBAN_REGEX = /^[A-Z]{2}[0-9A-Z]{13,32}$/
const BIC_REGEX = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/
const PURPOSE_REGEX = /^[A-Z0-9]{1,4}$/

export type BuildSepaEpcQrPayloadInput = {
  beneficiaryName: string
  iban: string
  amount: number
  remittanceText: string
  bic?: string
  purpose?: string
  beneficiaryToOriginatorInfo?: string
}

function normalizeWhitespace(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function truncate(value: string, maxLength: number) {
  return value.slice(0, maxLength)
}

export function normalizeSepaIban(value: unknown) {
  return String(value ?? '').replace(/\s+/g, '').toUpperCase()
}

export function normalizeSepaBic(value: unknown) {
  return String(value ?? '').replace(/\s+/g, '').toUpperCase()
}

export function parseSepaAmountInput(value: unknown) {
  const normalized = String(value ?? '').trim().replace(',', '.')
  if (!normalized) return null
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null

  const amount = Number(normalized)
  if (!Number.isFinite(amount)) return null
  return amount
}

function formatEpcAmount(amount: number) {
  const rounded = Number(amount.toFixed(EPC_AMOUNT_DECIMALS))
  return `EUR${rounded.toFixed(EPC_AMOUNT_DECIMALS).replace(/\.?0+$/, '')}`
}

export function buildSepaEpcQrPayload(input: BuildSepaEpcQrPayloadInput) {
  const beneficiaryName = truncate(normalizeWhitespace(input.beneficiaryName), MAX_BENEFICIARY_NAME_LENGTH)
  if (!beneficiaryName) {
    throw new Error('Nome beneficiario mancante')
  }

  const iban = normalizeSepaIban(input.iban)
  if (!IBAN_REGEX.test(iban)) {
    throw new Error('IBAN beneficiario non valido')
  }

  const bic = normalizeSepaBic(input.bic)
  if (bic && !BIC_REGEX.test(bic)) {
    throw new Error('BIC/SWIFT non valido')
  }

  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount < MIN_EPC_AMOUNT || amount > MAX_EPC_AMOUNT) {
    throw new Error('Importo non valido per EPC QR')
  }

  const remittanceText = truncate(normalizeWhitespace(input.remittanceText), MAX_REMITTANCE_TEXT_LENGTH)
  if (!remittanceText) {
    throw new Error('Causale mancante')
  }

  const purpose = normalizeWhitespace(input.purpose).toUpperCase()
  if (purpose && !PURPOSE_REGEX.test(purpose)) {
    throw new Error('Codice purpose non valido')
  }

  const beneficiaryToOriginatorInfo = truncate(
    normalizeWhitespace(input.beneficiaryToOriginatorInfo),
    MAX_BENEFICIARY_INFO_LENGTH,
  )

  const fields = [
    'BCD',
    '002',
    '1',
    'SCT',
    bic,
    beneficiaryName,
    iban,
    formatEpcAmount(amount),
    purpose,
    remittanceText,
    beneficiaryToOriginatorInfo,
  ]

  while (fields.length > 0 && !fields[fields.length - 1]) {
    fields.pop()
  }

  return fields.join('\n')
}

