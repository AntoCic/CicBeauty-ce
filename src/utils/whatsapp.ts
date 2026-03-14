export const WHATSAPP_PLACEHOLDER_DEFINITIONS = [
  { token: '[NOME]', label: 'Nome cliente' },
  { token: '[COGNOME]', label: 'Cognome cliente' },
  { token: '[GIORNO]', label: 'Giorno settimana' },
  { token: '[DATA]', label: 'Data appuntamento' },
  { token: '[ORA]', label: 'Orario appuntamento' },
  { token: '[DURATA]', label: 'Durata appuntamento' },
  { token: '[PREZZO]', label: 'Prezzo appuntamento' },
  { token: '[TRATTAMENTI]', label: 'Trattamenti' },
  { token: '[INDIRIZZO]', label: 'Indirizzo centro' },
] as const

export type WhatsAppPlaceholderToken = (typeof WHATSAPP_PLACEHOLDER_DEFINITIONS)[number]['token']

export type WhatsAppTemplateVariables = Partial<Record<WhatsAppPlaceholderToken, string>>

export function replaceWhatsAppPlaceholders(template: unknown, variables: WhatsAppTemplateVariables) {
  const source = String(template ?? '')
  let compiled = source

  for (const placeholder of WHATSAPP_PLACEHOLDER_DEFINITIONS) {
    const replacement = String(variables[placeholder.token] ?? '').trim()
    compiled = compiled.split(placeholder.token).join(replacement)
  }

  return compiled
}

export function formatWhatsAppDay(date: Date) {
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
  })
}

export function formatWhatsAppDate(date: Date) {
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatWhatsAppTime(date: Date) {
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatWhatsAppDuration(minutes: unknown) {
  const totalMinutes = Math.max(0, Math.round(Number(minutes) || 0))
  if (totalMinutes === 0) return '0 min'

  const hours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  if (hours && remainingMinutes) {
    return `${hours}h ${remainingMinutes}m`
  }
  if (hours) {
    return `${hours}h`
  }
  return `${remainingMinutes} min`
}

const euroFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
})

export function formatWhatsAppPrice(value: unknown) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return euroFormatter.format(0)
  return euroFormatter.format(Math.max(0, Math.round(amount * 100) / 100))
}

export function normalizeWhatsAppPhoneNumber(phoneNumber: unknown) {
  const raw = String(phoneNumber ?? '').trim()
  if (!raw) return ''

  const startsWithPlus = raw.startsWith('+')
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''

  return startsWithPlus ? `+${digits}` : digits
}

export function buildWhatsAppDeepLink(message: unknown, phoneNumber: unknown) {
  const normalizedPhone = normalizeWhatsAppPhoneNumber(phoneNumber)
  if (!normalizedPhone) return ''

  const encodedMessage = encodeURIComponent(String(message ?? ''))
  return `whatsapp://send?phone=${normalizedPhone}&text=${encodedMessage}`
}

export function sendWhatsAppMessage(message: unknown, phoneNumber: unknown) {
  if (typeof window === 'undefined') return false

  const deepLink = buildWhatsAppDeepLink(message, phoneNumber)
  if (!deepLink) return false

  window.location.href = deepLink
  return true
}
