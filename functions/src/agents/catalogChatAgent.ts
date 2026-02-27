import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { generateJsonObject } from '../ai/geminiClient.js';
import { db } from '../config/firebaseAdmin.js';
import { DEFAULT_GEMINI_MODEL, REGION } from '../config/runtime.js';
import { GEMINI_API_KEY } from '../config/secret.js';
import { requireUserPermission } from '../utils/auth.js';
import { readOptionalIntegerInRange, readRequiredString } from '../utils/validation.js';

const PRODUCT_CANDIDATE_LIMIT = 100;
const TREATMENT_CANDIDATE_LIMIT = 100;

export type CatalogChatHistoryItem = {
  role: 'user' | 'assistant';
  text: string;
};

export type CatalogChatAgentRequest = {
  message: string;
  history?: CatalogChatHistoryItem[];
  productLimit?: number;
  treatmentLimit?: number;
};

export type CatalogSuggestion = {
  id: string;
  reason: string;
};

export type FinalAdvice = {
  title: string;
  summary: string;
  treatmentIds: string[];
  productIds: string[];
  frequency: string;
  quantity: string;
};

export type CatalogChatAgentResponse = {
  products: CatalogSuggestion[];
  treatments: CatalogSuggestion[];
  finalAdvice: FinalAdvice;
};

type CatalogCandidate = {
  id: string;
  metaAI: string;
  price: number | null;
};

type CatalogChatRawResponse = {
  products?: unknown;
  treatments?: unknown;
  finalAdvice?: unknown;
};

export const catalogChatAgent = onCall<CatalogChatAgentRequest>(
  {
    region: REGION,
    secrets: [GEMINI_API_KEY],
  },
  async (request): Promise<CatalogChatAgentResponse> => {
    await requireUserPermission(request, 'AI');

    const data = asObject(request.data);
    const message = readRequiredString(data, 'message', { maxLength: 2000 });
    const productLimit = readOptionalIntegerInRange(data.productLimit, 'productLimit', 1, 5, 3);
    const treatmentLimit = readOptionalIntegerInRange(data.treatmentLimit, 'treatmentLimit', 1, 5, 3);
    const history = readHistory(data.history);

    const [productCandidates, treatmentCandidates] = await Promise.all([
      loadCandidates('products', PRODUCT_CANDIDATE_LIMIT),
      loadCandidates('treatments', TREATMENT_CANDIDATE_LIMIT),
    ]);

    if (!productCandidates.length && !treatmentCandidates.length) {
      return {
        products: [],
        treatments: [],
        finalAdvice: emptyAdvice(),
      };
    }

    const model = DEFAULT_GEMINI_MODEL;
    const geminiOutput = await generateJsonObject<CatalogChatRawResponse>({
      model,
      systemInstruction: [
        'Sei un consulente esperto di centro estetico.',
        'Analizza i candidati usando sia metaAI sia prezzo.',
        'Il prezzo e espresso in euro.',
        'Non inventare id e non usare id fuori lista.',
        'Se il messaggio contiene vincoli di budget o fascia prezzo, rispettali quando selezioni prodotti e trattamenti ma non essere troppo selettivo il prezzo è sempre orientativo.',
        `Restituisci massimo ${productLimit} prodotti e massimo ${treatmentLimit} trattamenti.`,
        'Formato obbligatorio:',
        '{"products":[{"id":"...","reason":"..."}],"treatments":[{"id":"...","reason":"..."}],"finalAdvice":{"title":"...","summary":"...","treatmentIds":["..."],"productIds":["..."],"frequency":"...","quantity":"..."}}',
        'reason deve essere breve e concreta.',
        'finalAdvice deve proporre un percorso chiaro; usa frequency e quantity quando utili.',
        'Rispondi solo con JSON valido.',
      ].join('\n'),
      userPrompt: JSON.stringify(
        {
          message,
          history,
          limits: { products: productLimit, treatments: treatmentLimit },
          productCandidates,
          treatmentCandidates,
        },
        null,
        2,
      ),
      maxOutputTokens: 1400,
      temperature: 0.35,
    });

    const allowedProductIds = new Set(productCandidates.map((candidate) => candidate.id));
    const allowedTreatmentIds = new Set(treatmentCandidates.map((candidate) => candidate.id));
    const products = normalizeSuggestions(geminiOutput.products, allowedProductIds, productLimit);
    const treatments = normalizeSuggestions(geminiOutput.treatments, allowedTreatmentIds, treatmentLimit);
    const finalAdvice = normalizeFinalAdvice(geminiOutput.finalAdvice, allowedTreatmentIds, allowedProductIds);

    return {
      products,
      treatments,
      finalAdvice: {
        ...finalAdvice,
        treatmentIds: mergeUniqueIds(finalAdvice.treatmentIds, treatments.map((item) => item.id)),
        productIds: mergeUniqueIds(finalAdvice.productIds, products.map((item) => item.id)),
      },
    };
  },
);

async function loadCandidates(collectionName: 'products' | 'treatments', candidateLimit: number) {
  const snapshot = await db.collection(collectionName).limit(candidateLimit).get();
  return snapshot.docs.map(mapCatalogCandidate).filter((item): item is CatalogCandidate => Boolean(item));
}

function mapCatalogCandidate(doc: QueryDocumentSnapshot): CatalogCandidate | null {
  const raw = doc.data() as Record<string, unknown>;
  const metaAI = pickString(raw.metaAI);
  if (!metaAI) return null;
  const price = pickPrice(raw.price);

  return {
    id: doc.id,
    metaAI: metaAI.slice(0, 1600),
    price,
  };
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (normalized) return normalized;
  }
  return '';
}

function pickPrice(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Number(value.toFixed(2));
  }

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    const parsed = Number(normalized);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Number(parsed.toFixed(2));
    }
  }

  return null;
}

function normalizeSuggestions(raw: unknown, allowedIds: Set<string>, limit: number): CatalogSuggestion[] {
  if (!Array.isArray(raw)) return [];
  const result: CatalogSuggestion[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const entry = item as Record<string, unknown>;
    const id = String(entry.id ?? '').trim();
    const reason = normalizeReason(entry.reason);
    if (!id || !reason || !allowedIds.has(id)) continue;
    if (result.some((current) => current.id === id)) continue;
    result.push({ id, reason });
    if (result.length >= limit) break;
  }

  return result;
}

function normalizeReason(value: unknown) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';
  return normalized.slice(0, 240);
}

function normalizeFinalAdvice(
  raw: unknown,
  allowedTreatmentIds: Set<string>,
  allowedProductIds: Set<string>,
): FinalAdvice {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyAdvice();
  }

  const source = raw as Record<string, unknown>;
  const title = pickString(source.title).slice(0, 80);
  const summary = pickString(source.summary).slice(0, 700);
  const treatmentIds = normalizeIds(source.treatmentIds, allowedTreatmentIds);
  const productIds = normalizeIds(source.productIds, allowedProductIds);
  const frequency = pickString(source.frequency).slice(0, 220);
  const quantity = pickString(source.quantity).slice(0, 220);

  return {
    title: title || emptyAdvice().title,
    summary: summary || emptyAdvice().summary,
    treatmentIds,
    productIds,
    frequency,
    quantity,
  };
}

function emptyAdvice(): FinalAdvice {
  return {
    title: 'Percorso Signature Cic Beauty',
    summary:
      'Data la specificità della richiesta, ti consigliamo di rivolgerti a un operatore per una consulenza gratuita dedicata.',
    treatmentIds: [],
    productIds: [],
    frequency: '',
    quantity: '',
  };
}

function normalizeIds(raw: unknown, allowedIds: Set<string>) {
  if (!Array.isArray(raw)) return [];
  const result: string[] = [];
  for (const item of raw) {
    const id = String(item ?? '').trim();
    if (!id || !allowedIds.has(id) || result.includes(id)) continue;
    result.push(id);
  }
  return result;
}

function mergeUniqueIds(first: string[], second: string[]) {
  const result: string[] = [];
  for (const id of [...first, ...second]) {
    const normalized = String(id ?? '').trim();
    if (!normalized || result.includes(normalized)) continue;
    result.push(normalized);
  }
  return result;
}

function asObject(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpsError('invalid-argument', 'Payload non valido.');
  }
  return input as Record<string, unknown>;
}

function readHistory(input: unknown): CatalogChatHistoryItem[] {
  if (!Array.isArray(input)) return [];
  const normalized: CatalogChatHistoryItem[] = [];

  for (const item of input) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const entry = item as Record<string, unknown>;
    const roleRaw = String(entry.role ?? '')
      .trim()
      .toLowerCase();
    const text = String(entry.text ?? '').trim();
    if (!text) continue;
    if (roleRaw !== 'user' && roleRaw !== 'assistant') continue;
    normalized.push({
      role: roleRaw,
      text: text.slice(0, 900),
    });
  }

  return normalized.slice(-8);
}
