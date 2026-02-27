import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { generateJsonObject } from '../ai/geminiClient.js';
import { REGION } from '../config/runtime.js';
import { GEMINI_API_KEY } from '../config/secret.js';
import { requireUserPermission } from '../utils/auth.js';
import { readOptionalIntegerInRange, readOptionalString, readRequiredString } from '../utils/validation.js';
import { buildAgentSystemInstruction, getAgentPromptConfig } from './agentPromptConfig.js';

export type MarketingAgentRequest = {
  title: string;
  context?: string;
  subtitleMaxWords?: number;
  descriptionMaxWords?: number;
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
    await requireUserPermission(request, 'AI');

    const data = asObject(request.data);
    const title = readRequiredString(data, 'title', { maxLength: 180 });
    const context = readOptionalString(data, 'context', { maxLength: 2000 });
    const subtitleMaxWords = readOptionalIntegerInRange(data.subtitleMaxWords, 'subtitleMaxWords', 2, 20, 4);
    const descriptionMaxWords = readOptionalIntegerInRange(
      data.descriptionMaxWords,
      'descriptionMaxWords',
      10,
      120,
      40,
    );

    const promptConfig = await getAgentPromptConfig('marketingAgent');
    const output = await generateJsonObject<MarketingAgentRawResponse>({
      model: promptConfig.model,
      systemInstruction: buildAgentSystemInstruction('marketingAgent', promptConfig.prompt),
      userPrompt: JSON.stringify(
        {
          payload: {
            title,
            context: context ?? null,
            subtitleMaxWords,
            descriptionMaxWords,
          },
        },
        null,
        2,
      ),
      maxOutputTokens: promptConfig.maxOutputTokens,
      temperature: promptConfig.temperature,
    });

    const subtitle = normalizeResultByWords(output.subtitle, subtitleMaxWords, 'subtitle');
    const description = normalizeResultByWords(output.description, descriptionMaxWords, 'description');

    return { subtitle, description };
  },
);

function asObject(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpsError('invalid-argument', 'Payload non valido.');
  }
  return input as Record<string, unknown>;
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
    throw new HttpsError('internal', `Gemini non ha restituito un "${key}" valido.`);
  }
  return clipped;
}
