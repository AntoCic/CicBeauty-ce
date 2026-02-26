import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { generateJsonObject } from '../ai/geminiClient.js';
import { db } from '../config/firebaseAdmin.js';
import { DEFAULT_GEMINI_MODEL, PRODUCT_CANDIDATE_LIMIT, REGION } from '../config/runtime.js';
import { GEMINI_API_KEY } from '../config/secret.js';
import { requireAuth } from '../utils/auth.js';
import { readRecommendationLimit, readRequiredString } from '../utils/validation.js';

export type ProductChatAgentRequest = {
  message: string;
  limit?: number;
};

export type ProductChatAgentResponse = {
  recommended: string[];
};

type ProductCandidate = {
  id: string;
  name: string;
  tags: string[];
  shortDescription?: string;
};

type ProductChatRawResponse = {
  recommended?: unknown;
};

export const productChatAgent = onCall<ProductChatAgentRequest>(
  {
    region: REGION,
    secrets: [GEMINI_API_KEY],
  },
  async (request): Promise<ProductChatAgentResponse> => {
    requireAuth(request);

    const data = asObject(request.data);
    const message = readRequiredString(data, 'message', { maxLength: 2000 });
    const limit = readRecommendationLimit(data.limit);

    const candidates = await loadProductCandidates(PRODUCT_CANDIDATE_LIMIT);
    if (!candidates.length) {
      return { recommended: [] };
    }

    const model = DEFAULT_GEMINI_MODEL;
    const geminiOutput = await generateJsonObject<ProductChatRawResponse>({
      model,
      systemInstruction: [
        'Sei un consulente prodotti di un centro estetico.',
        'Scegli solo prodotti presenti nella lista candidate.',
        'Non inventare id.',
        `Restituisci massimo ${limit} id.`,
        'Formato obbligatorio: {"recommended":["id1","id2"]}.',
        'Se non ci sono match, restituisci {"recommended":[]}.',
        'Rispondi esclusivamente con JSON valido.',
      ].join('\n'),
      userPrompt: JSON.stringify(
        {
          message,
          candidateProducts: candidates,
          maxResults: limit,
        },
        null,
        2,
      ),
      maxOutputTokens: 500,
      temperature: 0.2,
    });

    const allowedIds = new Set(candidates.map((candidate) => candidate.id));
    const recommended = normalizeRecommended(geminiOutput.recommended, allowedIds, limit);

    return { recommended };
  },
);

async function loadProductCandidates(candidateLimit: number): Promise<ProductCandidate[]> {
  const snapshot = await db.collection('products').limit(candidateLimit).get();
  return snapshot.docs.map(mapProductCandidate).filter((item): item is ProductCandidate => Boolean(item));
}

function mapProductCandidate(doc: QueryDocumentSnapshot): ProductCandidate | null {
  const raw = doc.data() as Record<string, unknown>;
  const name = pickString(raw.name, raw.title);
  if (!name) return null;

  const tags = pickStringArray(raw.tags, raw.tag).slice(0, 8);
  const shortDescription = pickString(raw.shortDescription, raw.subtitle, raw.description);

  return {
    id: doc.id,
    name,
    tags,
    shortDescription: shortDescription ? shortDescription.slice(0, 220) : undefined,
  };
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (normalized) return normalized;
  }
  return '';
}

function pickStringArray(...values: unknown[]) {
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    const normalized = value.map((item) => String(item ?? '').trim()).filter(Boolean);
    if (normalized.length) return normalized;
  }
  return [];
}

function normalizeRecommended(recommended: unknown, allowedIds: Set<string>, limit: number) {
  if (!Array.isArray(recommended)) return [];
  const result: string[] = [];
  for (const item of recommended) {
    const id = String(item ?? '').trim();
    if (!id || !allowedIds.has(id) || result.includes(id)) continue;
    result.push(id);
    if (result.length >= limit) break;
  }
  return result;
}

function asObject(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpsError('invalid-argument', 'Payload non valido.');
  }
  return input as Record<string, unknown>;
}
