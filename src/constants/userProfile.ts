export const USER_COLOR_PALETTE = [
  '#e8b3be',
  '#2f7450',
  '#0b5ea8',
  '#5c6bc0',
  '#7b5ca8',
  '#2b8c7f',
  '#b66a3c',
  '#d2648c',
  '#6f7f47',
  '#4d7aa3',
  '#a05e74',
] as const

export const DEFAULT_USER_COLOR = USER_COLOR_PALETTE[0]
export const PERSONAL_APPOINTMENT_COLOR = '#0a4f86'

export const DEFAULT_PUBLIC_USER_KEYS = ['name', 'surname', 'photoURL', 'operatore', 'color'] as const

const USER_COLOR_BY_LOWER = new Map(USER_COLOR_PALETTE.map((color) => [color.toLowerCase(), color]))
const PUBLIC_USER_KEY_SET = new Set(DEFAULT_PUBLIC_USER_KEYS)

function normalizeHexColor(value: unknown) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return ''

  if (/^#[0-9a-f]{6}$/.test(raw)) return raw
  const short = /^#[0-9a-f]{3}$/.exec(raw)
  if (!short) return ''

  const [r, g, b] = short[0].slice(1).split('')
  return `#${r}${r}${g}${g}${b}${b}`
}

export function normalizeUserColor(value: unknown) {
  const normalized = normalizeHexColor(value)
  if (!normalized) return DEFAULT_USER_COLOR
  return USER_COLOR_BY_LOWER.get(normalized) ?? DEFAULT_USER_COLOR
}

export function normalizePublicUserKeys(value: unknown) {
  const normalized = Array.isArray(value)
    ? value
        .map((item) => String(item ?? '').trim())
        .filter((item): item is (typeof DEFAULT_PUBLIC_USER_KEYS)[number] => PUBLIC_USER_KEY_SET.has(item as (typeof DEFAULT_PUBLIC_USER_KEYS)[number]))
    : []

  const merged = new Set<typeof DEFAULT_PUBLIC_USER_KEYS[number]>(DEFAULT_PUBLIC_USER_KEYS)
  for (const key of normalized) {
    merged.add(key)
  }

  return Array.from(merged)
}

