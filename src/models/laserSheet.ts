export type LaserSheetRecordValue = string | number
export type LaserSheetRecord = Record<string, LaserSheetRecordValue>

export type FitzpatrickOption = {
  value: number
  label: string
}

export type FitzpatrickQuestion = {
  id: string
  label: string
  options: FitzpatrickOption[]
}

export const LASER_SHEET_FITZPATRICK_IDS = [
  'fitzpatrick_q1',
  'fitzpatrick_q2',
  'fitzpatrick_q3',
  'fitzpatrick_q4',
  'fitzpatrick_q5',
  'fitzpatrick_q6',
  'fitzpatrick_q7',
  'fitzpatrick_q8',
  'fitzpatrick_q9',
  'fitzpatrick_q10',
] as const

const standardFitzpatrickScale: FitzpatrickOption[] = [
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
]

export const FITZPATRICK_QUESTIONS: FitzpatrickQuestion[] = [
  {
    id: 'fitzpatrick_q1',
    label: 'Qual e il colore naturale dei capelli?',
    options: [
      { value: 0, label: 'Rosso sabbia' },
      { value: 1, label: 'Biondo' },
      { value: 2, label: 'Castano / biondo scuro' },
      { value: 3, label: 'Castano scuro' },
      { value: 4, label: 'Nero' },
    ],
  },
  {
    id: 'fitzpatrick_q2',
    label: 'Qual e il colore naturale degli occhi?',
    options: [
      { value: 0, label: 'Celeste / grigio / verde' },
      { value: 1, label: 'Blu / grigio / verde' },
      { value: 2, label: 'Blu' },
      { value: 3, label: 'Marrone scuro' },
      { value: 4, label: 'Marrone nerastro' },
    ],
  },
  {
    id: 'fitzpatrick_q3',
    label: 'Qual e il colore della cute esposta al sole?',
    options: [
      { value: 0, label: 'Rossastro' },
      { value: 1, label: 'Molto pallido' },
      { value: 2, label: 'Pallido con tocco di beige' },
      { value: 3, label: 'Marrone chiaro' },
      { value: 4, label: 'Marrone scuro' },
    ],
  },
  {
    id: 'fitzpatrick_q4',
    label: 'Quante lentiggini sono presenti nelle zone esposte?',
    options: [
      { value: 0, label: 'Molte' },
      { value: 1, label: 'Alcune' },
      { value: 2, label: 'Poche' },
      { value: 3, label: 'Pochissime' },
      { value: 4, label: 'Nessuna' },
    ],
  },
  {
    id: 'fitzpatrick_q5',
    label: 'Cosa succede con lunga esposizione al sole senza protezione?',
    options: [
      { value: 0, label: 'Rossore doloroso, vesciche, spellatura' },
      { value: 1, label: 'Vesciche seguite da spellatura' },
      { value: 2, label: 'Scottoni, a volte con spellatura' },
      { value: 3, label: 'Raramente ustioni' },
      { value: 4, label: 'Mai avuto problemi' },
    ],
  },
  {
    id: 'fitzpatrick_q6',
    label: "Qual e la qualita dell'abbronzatura?",
    options: [
      { value: 0, label: 'Nessuna o leggerissima' },
      { value: 1, label: 'Leggermente ambrata' },
      { value: 2, label: 'Abbronzatura ragionevole' },
      { value: 3, label: 'Si abbronza facilmente' },
      { value: 4, label: 'Diventa rapidamente scura' },
    ],
  },
  {
    id: 'fitzpatrick_q7',
    label: 'Diventa scuro dopo un giorno di esposizione?',
    options: [
      { value: 0, label: 'Mai' },
      { value: 1, label: 'Raramente' },
      { value: 2, label: 'A volte' },
      { value: 3, label: 'Spesso' },
      { value: 4, label: 'Sempre' },
    ],
  },
  {
    id: 'fitzpatrick_q8',
    label: 'Come risponde il viso al sole?',
    options: [
      { value: 0, label: 'Molto sensibile' },
      { value: 1, label: 'Sensibile' },
      { value: 2, label: 'Normale' },
      { value: 3, label: 'Molto resistente' },
      { value: 4, label: 'Mai avuto problemi' },
    ],
  },
  {
    id: 'fitzpatrick_q9',
    label: "Quando si e esposto l'ultima volta al sole o lampada?",
    options: [
      { value: 0, label: 'Piu di 3 mesi fa' },
      { value: 1, label: '2-3 mesi fa' },
      { value: 2, label: '1-2 mesi fa' },
      { value: 3, label: 'Meno di 1 mese fa' },
      { value: 4, label: 'Meno di 2 settimane fa' },
    ],
  },
  {
    id: 'fitzpatrick_q10',
    label: "Espone l'area da trattare al sole?",
    options: [
      { value: 0, label: 'Mai' },
      { value: 1, label: 'Quasi mai' },
      { value: 2, label: 'A volte' },
      { value: 3, label: 'Spesso' },
      { value: 4, label: 'Sempre' },
    ],
  },
].map((question) => ({
  ...question,
  options: question.options.length ? question.options : standardFitzpatrickScale,
}))

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

export function normalizeLaserSheetRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const source = value as Record<string, unknown>
  const normalized: LaserSheetRecord = {}
  for (const [key, rawValue] of Object.entries(source)) {
    const normalizedKey = normalizeString(key)
    if (!normalizedKey) continue
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      normalized[normalizedKey] = rawValue
      continue
    }
    if (typeof rawValue === 'string') {
      normalized[normalizedKey] = normalizeString(rawValue)
      continue
    }
    if (typeof rawValue === 'boolean') {
      normalized[normalizedKey] = rawValue ? 'si' : 'no'
    }
  }
  return Object.keys(normalized).length ? normalized : undefined
}

export function readLaserSheetString(record: LaserSheetRecord | undefined, key: string, fallback = '') {
  const value = record?.[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

export function readLaserSheetNumber(record: LaserSheetRecord | undefined, key: string) {
  const value = record?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

export function computeFitzpatrickScore(record: LaserSheetRecord | undefined) {
  return LASER_SHEET_FITZPATRICK_IDS.reduce((total, questionId) => {
    const value = readLaserSheetNumber(record, questionId)
    if (typeof value !== 'number') return total
    return total + Math.max(0, Math.min(4, Math.round(value)))
  }, 0)
}

export function computeFitzpatrickAnswered(record: LaserSheetRecord | undefined) {
  return LASER_SHEET_FITZPATRICK_IDS.reduce((count, questionId) => {
    const value = readLaserSheetNumber(record, questionId)
    return typeof value === 'number' ? count + 1 : count
  }, 0)
}

export function resolveFitzpatrickPhototype(score: number) {
  const normalized = Math.max(0, Math.round(score))
  if (normalized <= 7) return 'I'
  if (normalized <= 16) return 'II'
  if (normalized <= 25) return 'III'
  if (normalized <= 30) return 'IV'
  return 'V / VI'
}
