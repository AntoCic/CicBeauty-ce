function rawToString(value: unknown) {
  return String(value ?? '').trim()
}

export function sanitizePhoneNumberInput(value: unknown) {
  const raw = rawToString(value)
  if (!raw) return ''

  const compact = raw.replace(/\s+/g, '')
  const hasLeadingPlus = compact.startsWith('+')
  const digits = compact.replace(/\D+/g, '')
  if (!digits) return hasLeadingPlus ? '+' : ''

  return hasLeadingPlus ? `+${digits}` : digits
}

function phoneSearchVariants(value: unknown) {
  const normalized = sanitizePhoneNumberInput(value)
  const digits = normalized.replace(/\D+/g, '')
  if (!digits) return []

  const variants = new Set<string>([digits])
  if (normalized.startsWith('+39') && digits.startsWith('39') && digits.length > 2) {
    variants.add(digits.slice(2))
  }

  return [...variants]
}

export function matchesPhoneSearch(phoneValue: unknown, searchTerm: unknown) {
  const rawTerm = rawToString(searchTerm)
  if (!rawTerm || !/\d/.test(rawTerm)) return false

  const searchVariants = phoneSearchVariants(rawTerm)
  const phoneVariants = phoneSearchVariants(phoneValue)
  if (!searchVariants.length || !phoneVariants.length) return false

  return searchVariants.some((searchDigits) =>
    phoneVariants.some((phoneDigits) => phoneDigits.includes(searchDigits) || searchDigits.includes(phoneDigits)),
  )
}
