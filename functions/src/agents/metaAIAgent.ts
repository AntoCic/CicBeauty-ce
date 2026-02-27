import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { generateJsonObject } from '../ai/geminiClient.js';
import { DEFAULT_GEMINI_MODEL, REGION } from '../config/runtime.js';
import { GEMINI_API_KEY } from '../config/secret.js';
import { requireUserPermission } from '../utils/auth.js';
import { readOptionalIntegerInRange } from '../utils/validation.js';

export type MetaAIAgentRequest = {
  entityType: 'product' | 'treatment';
  source: Record<string, unknown>;
  maxWords?: number;
};

export type MetaAIAgentResponse = {
  metaAI: string;
};

type MetaAIAgentRawResponse = {
  metaAI?: unknown;
};

export const metaAIAgent = onCall<MetaAIAgentRequest>(
  {
    region: REGION,
    secrets: [GEMINI_API_KEY],
  },
  async (request): Promise<MetaAIAgentResponse> => {
    await requireUserPermission(request, 'AI');

    const data = asObject(request.data);
    const entityType = readEntityType(data.entityType);
    const source = asObject(data.source);
    const maxWords = readOptionalIntegerInRange(data.maxWords, 'maxWords', 40, 300, 140);

    const cleanedSource = cleanSourceForMetaAI(source);
    const model = DEFAULT_GEMINI_MODEL;
    const output = await generateJsonObject<MetaAIAgentRawResponse>({
      model,
      systemInstruction: [
        'Sei un data curator specializzato in schede estetiche.',
        'Genera solo il campo metaAI in italiano, sintetico ma informativo.',
        'Formato obbligatorio: {"metaAI":"..."}',
        'Usa solo i dati forniti dal payload.',
        'Se nel payload trovi "metaAIAttuale", usalo come riferimento per aggiornare e migliorare il nuovo metaAI mantenendo coerenza.',
        'Non inserire ID tecnici, type_expense_id, prezzi amministrativi o campi interni.',
        'Niente markdown, niente elenco puntato, niente testo extra.',
        `Massimo ${maxWords} parole.`,
      ].join('\n'),
      userPrompt: JSON.stringify(
        {
          entityType,
          source: cleanedSource,
          objective:
            'Creare un testo pulito con caratteristiche essenziali, benefici, target ideale, uso/frequenza e note importanti se disponibili. Se presente metaAIAttuale, trattalo come base di partenza da rifinire.',
        },
        null,
        2,
      ),
      maxOutputTokens: 700,
      temperature: 0.35,
    });

    const metaAI = normalizeResultByWords(output.metaAI, maxWords, 'metaAI');
    return { metaAI };
  },
);

function asObject(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpsError('invalid-argument', 'Payload non valido.');
  }
  return input as Record<string, unknown>;
}

function readEntityType(raw: unknown): 'product' | 'treatment' {
  const normalized = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'product' || normalized === 'treatment') {
    return normalized;
  }
  throw new HttpsError('invalid-argument', 'entityType deve essere "product" o "treatment".');
}

function cleanSourceForMetaAI(value: unknown): unknown {
  if (value == null) return undefined;

  if (Array.isArray(value)) {
    const nextItems = value
      .map((item) => cleanSourceForMetaAI(item))
      .filter((item) => !isEmptyValue(item));
    return nextItems.length ? nextItems : undefined;
  }

  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(input)) {
      if (key === 'type_expense_id') continue;
      const cleaned = cleanSourceForMetaAI(raw);
      if (isEmptyValue(cleaned)) continue;
      next[key] = cleaned;
    }
    return Object.keys(next).length ? next : undefined;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized || undefined;
  }

  return value;
}

function isEmptyValue(value: unknown) {
  if (value == null) return true;
  if (typeof value === 'string') return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

function normalizeResultByWords(value: unknown, maxWords: number, key: string) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    throw new HttpsError('internal', `Gemini non ha restituito "${key}".`);
  }

  const words = normalized
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const clipped = words.slice(0, maxWords).join(' ').trim();
  if (!clipped) {
    throw new HttpsError('internal', `Gemini non ha restituito "${key}" valido.`);
  }
  return clipped;
}
