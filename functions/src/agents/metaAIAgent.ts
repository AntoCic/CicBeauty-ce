import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { generateJsonObject } from '../ai/geminiClient.js';
import { REGION } from '../config/runtime.js';
import { GEMINI_API_KEY } from '../config/secret.js';
import { requireUserPermission } from '../utils/auth.js';
import { readOptionalIntegerInRange } from '../utils/validation.js';
import { buildAgentSystemInstruction, getAgentPromptConfig } from './agentPromptConfig.js';

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
    const promptConfig = await getAgentPromptConfig('metaAIAgent');
    const systemInstruction = buildAgentSystemInstruction('metaAIAgent', promptConfig.prompt);
    const output = await generateJsonObject<MetaAIAgentRawResponse>({
      model: promptConfig.model,
      systemInstruction,
      userPrompt: JSON.stringify(
        {
          payload: {
            entityType,
            source: cleanedSource,
            objective:
              'Creare un testo pulito con caratteristiche essenziali, benefici, target ideale, uso/frequenza e note importanti se disponibili. Se presente metaAIAttuale, trattalo come base di partenza da rifinire.',
            maxWords,
          },
        },
        null,
        2,
      ),
      maxOutputTokens: promptConfig.maxOutputTokens,
      temperature: promptConfig.temperature,
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
