import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { generateJsonObject } from '../ai/geminiClient.js';
import { REGION, DEFAULT_GEMINI_MODEL } from '../config/runtime.js';
import { GEMINI_API_KEY } from '../config/secret.js';
import { requireAuth } from '../utils/auth.js';
import { readOptionalString, readRequiredString } from '../utils/validation.js';

export type MarketingAgentRequest = {
  title: string;
  context?: string;
};

export type MarketingAgentResponse = {
  subtitle: string;
  description: string;
};

type MarketingAgentRawResponse = Partial<MarketingAgentResponse>;

export const marketingAgent = onCall<MarketingAgentRequest>(
  {
    region: REGION,
    secrets: [GEMINI_API_KEY],
  },
  async (request): Promise<MarketingAgentResponse> => {
    requireAuth(request);

    const data = asObject(request.data);
    const title = readRequiredString(data, 'title', { maxLength: 180 });
    const context = readOptionalString(data, 'context', { maxLength: 2000 });

    const model = DEFAULT_GEMINI_MODEL;
    const output = await generateJsonObject<MarketingAgentRawResponse>({
      model,
      systemInstruction: [
        'Sei un copywriter senior per un centro estetico premium.',
        'Rispondi solo con JSON valido e senza testo extra.',
        'Formato obbligatorio: {"subtitle":"...","description":"..."}',
        'subtitle massimo 120 caratteri.',
        'description massimo 800 caratteri.',
        'Tono: elegante, persuasivo, concreto, in italiano.',
      ].join('\n'),
      userPrompt: JSON.stringify({ title, context: context ?? null }),
      maxOutputTokens: 900,
      temperature: 0.6,
    });

    const subtitle = normalizeResultString(output.subtitle, 120, 'subtitle');
    const description = normalizeResultString(output.description, 800, 'description');

    return { subtitle, description };
  },
);

function asObject(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpsError('invalid-argument', 'Payload non valido.');
  }
  return input as Record<string, unknown>;
}

function normalizeResultString(value: unknown, maxLength: number, key: string) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    throw new HttpsError('internal', `Gemini non ha restituito "${key}".`);
  }
  return normalized.slice(0, maxLength).trim();
}
