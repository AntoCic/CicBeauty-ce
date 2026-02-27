import { FirestoreModel, type Timestampble } from 'cic-kit'

export const AGENT_PROMPT_IDS = ['catalogChatAgent', 'marketingAgent', 'metaAIAgent'] as const
export type AgentPromptId = (typeof AGENT_PROMPT_IDS)[number]

export const AGENT_PROMPT_LABELS: Record<AgentPromptId, string> = {
  catalogChatAgent: 'Catalog Chat Agent',
  marketingAgent: 'Marketing Agent',
  metaAIAgent: 'Meta AI Agent',
}

export const AGENT_PROMPT_MODEL_OPTIONS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
] as const

export const AGENT_PROMPT_DEFAULT_MODEL = AGENT_PROMPT_MODEL_OPTIONS[0]
export const AGENT_PROMPT_DEFAULT_TOKENS = 1400
export const AGENT_PROMPT_DEFAULT_TEMPERATURE = 0.35

export type AgentPromptFields = {
  prompt: string
  tokens: number
  temperature: number
  model: string
  updateBy: string
}

export interface AgentPromptData extends AgentPromptFields, Partial<Timestampble> {
  id: string
}

export const AGENT_PROMPT_DEFAULTS: Record<AgentPromptId, AgentPromptFields> = {
  catalogChatAgent: {
    prompt: [
      'Sei un consulente esperto di centro estetico.',
      'Analizza i candidati usando sia metaAI sia prezzo.',
      'Il prezzo e espresso in euro.',
      'Non inventare id e non usare id fuori lista.',
      'Se il messaggio contiene vincoli di budget o fascia prezzo, rispettali quando selezioni prodotti e trattamenti ma non essere troppo selettivo: il prezzo e sempre orientativo.',
      'Usa i limiti presenti in payload.limits.products e payload.limits.treatments per il numero massimo di risultati.',
      'reason deve essere breve e concreta.',
      'finalAdvice deve proporre un percorso chiaro; usa frequency e quantity quando utili.',
    ].join('\n'),
    tokens: AGENT_PROMPT_DEFAULT_TOKENS,
    temperature: AGENT_PROMPT_DEFAULT_TEMPERATURE,
    model: AGENT_PROMPT_DEFAULT_MODEL,
    updateBy: 'system',
  },
  marketingAgent: {
    prompt: [
      'Sei un copywriter senior per un centro estetico premium.',
      'Rispetta i limiti subtitleMaxWords e descriptionMaxWords presenti nel payload.',
      'Tono: elegante, persuasivo, concreto, in italiano.',
    ].join('\n'),
    tokens: AGENT_PROMPT_DEFAULT_TOKENS,
    temperature: AGENT_PROMPT_DEFAULT_TEMPERATURE,
    model: AGENT_PROMPT_DEFAULT_MODEL,
    updateBy: 'system',
  },
  metaAIAgent: {
    prompt: [
      'Sei un data curator specializzato in schede estetiche.',
      'Genera solo il campo metaAI in italiano, sintetico ma informativo.',
      'Usa solo i dati forniti dal payload.',
      'Se nel payload trovi "metaAIAttuale", usalo come riferimento per aggiornare e migliorare il nuovo metaAI mantenendo coerenza.',
      'Non inserire ID tecnici, type_expense_id, prezzi amministrativi o campi interni.',
      'Niente markdown, niente elenco puntato, niente testo extra.',
      'Rispetta il limite maxWords presente nel payload.',
    ].join('\n'),
    tokens: AGENT_PROMPT_DEFAULT_TOKENS,
    temperature: AGENT_PROMPT_DEFAULT_TEMPERATURE,
    model: AGENT_PROMPT_DEFAULT_MODEL,
    updateBy: 'system',
  },
}

export function isAgentPromptId(value: unknown): value is AgentPromptId {
  return AGENT_PROMPT_IDS.includes(value as AgentPromptId)
}

function resolveAgentPromptId(value: unknown): AgentPromptId {
  return isAgentPromptId(value) ? value : AGENT_PROMPT_IDS[0]
}

function normalizePrompt(value: unknown, fallback: string) {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function normalizeModel(value: unknown, fallback: string) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return fallback
  if (AGENT_PROMPT_MODEL_OPTIONS.includes(normalized as (typeof AGENT_PROMPT_MODEL_OPTIONS)[number])) {
    return normalized
  }
  return fallback
}

function normalizeTokens(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  const normalized = Math.round(parsed)
  if (normalized < 1) return 1
  if (normalized > 8192) return 8192
  return normalized
}

function normalizeTemperature(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed < 0) return 0
  if (parsed > 1) return 1
  return Number(parsed.toFixed(2))
}

function normalizeUpdateBy(value: unknown, fallback: string) {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

export function mergeAgentPromptWithDefaults(
  id: AgentPromptId,
  data?: Partial<AgentPromptData> | null,
): AgentPromptData {
  const defaults = AGENT_PROMPT_DEFAULTS[id]
  return {
    ...(data ?? {}),
    id,
    prompt: normalizePrompt(data?.prompt, defaults.prompt),
    tokens: normalizeTokens(data?.tokens, defaults.tokens),
    temperature: normalizeTemperature(data?.temperature, defaults.temperature),
    model: normalizeModel(data?.model, defaults.model),
    updateBy: normalizeUpdateBy(data?.updateBy, defaults.updateBy),
  }
}

export class AgentPrompt extends FirestoreModel<AgentPromptData> {
  static collectionName = 'agentPrompts'

  prompt: string
  tokens: number
  temperature: number
  model: string
  updateBy: string

  constructor(data: AgentPromptData) {
    const id = resolveAgentPromptId(data.id)
    const normalized = mergeAgentPromptWithDefaults(id, data)
    super(normalized)
    this.prompt = normalized.prompt
    this.tokens = normalized.tokens
    this.temperature = normalized.temperature
    this.model = normalized.model
    this.updateBy = normalized.updateBy
  }

  toData(): AgentPromptData {
    const id = resolveAgentPromptId(this.id)
    const normalized = mergeAgentPromptWithDefaults(id, {
      id: this.id,
      prompt: this.prompt,
      tokens: this.tokens,
      temperature: this.temperature,
      model: this.model,
      updateBy: this.updateBy,
    })

    return {
      id: normalized.id,
      prompt: normalized.prompt,
      tokens: normalized.tokens,
      temperature: normalized.temperature,
      model: normalized.model,
      updateBy: normalized.updateBy,
      ...this.timestampbleProps(),
    }
  }
}
