import { db } from '../config/firebaseAdmin.js';
import { DEFAULT_GEMINI_MODEL } from '../config/runtime.js';

export const AGENT_PROMPT_COLLECTION = 'agentPrompts';
export const AGENT_PROMPT_IDS = ['catalogChatAgent', 'marketingAgent', 'metaAIAgent'] as const;
export type AgentPromptId = (typeof AGENT_PROMPT_IDS)[number];

export type AgentPromptRuntimeConfig = {
  model: string;
  prompt: string;
  maxOutputTokens: number;
  temperature: number;
};

const SERVER_JSON_GUARD_LINES = [
  'Formato obbligatorio:',
  '{"products":[{"id":"...","reason":"..."}],"treatments":[{"id":"...","reason":"..."}],"finalAdvice":{"title":"...","summary":"...","treatmentIds":["..."],"productIds":["..."],"frequency":"...","quantity":"..."}}',
  'Rispondi solo con JSON valido.',
] as const;

const DEFAULT_MAX_OUTPUT_TOKENS = 1400;
const DEFAULT_TEMPERATURE = 0.35;

const DEFAULT_AGENT_PROMPTS: Record<AgentPromptId, AgentPromptRuntimeConfig> = {
  catalogChatAgent: {
    model: DEFAULT_GEMINI_MODEL,
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
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    temperature: DEFAULT_TEMPERATURE,
  },
  marketingAgent: {
    model: DEFAULT_GEMINI_MODEL,
    prompt: [
      'Sei un copywriter senior per un centro estetico premium.',
      'Rispetta i limiti subtitleMaxWords e descriptionMaxWords presenti nel payload.',
      'Tono: elegante, persuasivo, concreto, in italiano.',
    ].join('\n'),
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    temperature: DEFAULT_TEMPERATURE,
  },
  metaAIAgent: {
    model: DEFAULT_GEMINI_MODEL,
    prompt: [
      'Sei un data curator specializzato in schede estetiche.',
      'Genera solo il campo metaAI in italiano, sintetico ma informativo.',
      'Usa solo i dati forniti dal payload.',
      'Se nel payload trovi "metaAIAttuale", usalo come riferimento per aggiornare e migliorare il nuovo metaAI mantenendo coerenza.',
      'Non inserire ID tecnici, type_expense_id, prezzi amministrativi o campi interni.',
      'Niente markdown, niente elenco puntato, niente testo extra.',
      'Rispetta il limite maxWords presente nel payload.',
    ].join('\n'),
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    temperature: DEFAULT_TEMPERATURE,
  },
};

export async function getAgentPromptConfig(agentId: AgentPromptId): Promise<AgentPromptRuntimeConfig> {
  const defaults = DEFAULT_AGENT_PROMPTS[agentId];
  try {
    const snapshot = await db.collection(AGENT_PROMPT_COLLECTION).doc(agentId).get();
    if (!snapshot.exists) {
      return defaults;
    }

    const data = snapshot.data() as Record<string, unknown>;
    return {
      model: normalizeModel(data.model, defaults.model),
      prompt: normalizePrompt(data.prompt, defaults.prompt),
      maxOutputTokens: normalizeTokens(data.tokens, defaults.maxOutputTokens),
      temperature: normalizeTemperature(data.temperature, defaults.temperature),
    };
  } catch (error) {
    console.error(`Unable to load ${agentId} prompt config`, error);
    return defaults;
  }
}

export function buildAgentSystemInstruction(agentId: AgentPromptId, prompt: string) {
  const promptWithoutManagedLines = removeServerManagedJsonLines(prompt);
  const sections = [
    promptWithoutManagedLines,
    ...SERVER_JSON_GUARD_LINES,
  ];

  if (agentId === 'marketingAgent') {
    sections.push('Per questo agente il formato di risposta effettivo e: {"subtitle":"...","description":"..."}');
  } else if (agentId === 'metaAIAgent') {
    sections.push('Per questo agente il formato di risposta effettivo e: {"metaAI":"..."}');
  }

  return sections
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function normalizeModel(value: unknown, fallback: string) {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function normalizePrompt(value: unknown, fallback: string) {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function normalizeTokens(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.round(parsed);
  if (normalized < 1) return 1;
  if (normalized > 8192) return 8192;
  return normalized;
}

function normalizeTemperature(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return Number(parsed.toFixed(2));
}

function removeServerManagedJsonLines(prompt: string) {
  const toDrop = new Set(
    [
      ...SERVER_JSON_GUARD_LINES,
      'Rispondi solo con JSON valido e senza testo extra.',
      'Formato obbligatorio: {"subtitle":"...","description":"..."}',
      'Formato obbligatorio: {"metaAI":"..."}',
    ].map((line) => line.trim()),
  );

  return String(prompt ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !toDrop.has(line))
    .join('\n')
    .trim();
}
