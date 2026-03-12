import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { generateJsonObject } from '../ai/geminiClient.js';
import { db } from '../config/firebaseAdmin.js';
import { DEFAULT_GEMINI_MODEL, REGION } from '../config/runtime.js';
import { GEMINI_API_KEY } from '../config/secret.js';
import { requireAuth } from '../utils/auth.js';
import { readOptionalIntegerInRange } from '../utils/validation.js';

type LegacyTreatmentMapperRequest = {
  legacyTreatment?: unknown;
  maxAttempts?: unknown;
};

type LegacyTreatmentInput = {
  oldId: string;
  name: string;
  typeExpenseId: string;
  typeExpenseName: string;
  duration?: number;
  price?: number;
};

type TreatmentCandidate = {
  id: string;
  oldId: string;
  title: string;
  typeExpenseId: string;
  typeExpenseName: string;
  duration: number;
  price: number;
  metaAI: string;
};

type LegacyTreatmentMapperResponse = {
  matchedTreatmentId?: string;
  matchedTreatmentTitle?: string;
  method: 'old_id' | 'name-exact' | 'gemini' | 'none';
  attempts: number;
  reason: string;
  candidates: Array<{
    id: string;
    title: string;
    typeExpenseName: string;
    duration: number;
    price: number;
  }>;
};

type GeminiMapperResponse = {
  matchedTreatmentId?: unknown;
  reason?: unknown;
};

type RuntimeCatalogCache = {
  loadedAt: number;
  candidates: TreatmentCandidate[];
};

const CACHE_TTL_MS = 60_000;
const GEMINI_CANDIDATE_LIMIT = 40;
const MANUAL_CANDIDATE_LIMIT = 6;
let runtimeCache: RuntimeCatalogCache | undefined;

export const legacyTreatmentMapper = onCall<LegacyTreatmentMapperRequest>(
  {
    region: REGION,
    secrets: [GEMINI_API_KEY],
  },
  async (request): Promise<LegacyTreatmentMapperResponse> => {
    requireAuth(request);
    const payload = asObject(request.data);
    const maxAttempts = readOptionalIntegerInRange(payload.maxAttempts, 'maxAttempts', 1, 3, 3);
    const legacyTreatment = normalizeLegacyTreatment(payload.legacyTreatment);
    const catalog = await loadTreatmentCatalog();
    if (!catalog.length) {
      throw new HttpsError('failed-precondition', 'Nessun trattamento disponibile nel catalogo attuale.');
    }

    const directByOldId = findExactByOldId(legacyTreatment.oldId, catalog);
    if (directByOldId) {
      return {
        matchedTreatmentId: directByOldId.id,
        matchedTreatmentTitle: directByOldId.title,
        method: 'old_id',
        attempts: 0,
        reason: 'Match diretto tramite old_id.',
        candidates: toManualCandidates([directByOldId]),
      };
    }

    const directByName = findExactByName(legacyTreatment.name, catalog);
    if (directByName) {
      return {
        matchedTreatmentId: directByName.id,
        matchedTreatmentTitle: directByName.title,
        method: 'name-exact',
        attempts: 0,
        reason: 'Match diretto tramite nome trattamento.',
        candidates: toManualCandidates([directByName]),
      };
    }

    const ranked = rankCandidates(legacyTreatment, catalog);
    const geminiPool = ranked.slice(0, GEMINI_CANDIDATE_LIMIT);
    const candidateById = new Map(geminiPool.map((item) => [item.id, item]));
    const fallbackManualCandidates = toManualCandidates(ranked.slice(0, MANUAL_CANDIDATE_LIMIT));

    let lastReason = 'Nessuna corrispondenza affidabile trovata.';
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const geminiOutput = await generateJsonObject<GeminiMapperResponse>({
          model: DEFAULT_GEMINI_MODEL,
          systemInstruction: [
            'Sei un assistente di migrazione dati per un centro estetico.',
            'Devi scegliere un solo id trattamento dalla lista candidati.',
            'Preferisci coerenza su nome, area/type expense, durata e prezzo.',
            'Se non c e una corrispondenza affidabile restituisci matchedTreatmentId vuoto.',
            'Rispondi solo JSON valido: {"matchedTreatmentId":"...","reason":"..."}',
          ].join('\n'),
          userPrompt: JSON.stringify(
            {
              payload: {
                legacyTreatment,
                candidates: geminiPool.map((item) => ({
                  id: item.id,
                  title: item.title,
                  typeExpenseName: item.typeExpenseName,
                  duration: item.duration,
                  price: item.price,
                  oldId: item.oldId || null,
                  metaAI: item.metaAI ? item.metaAI.slice(0, 240) : null,
                })),
              },
            },
            null,
            2,
          ),
          maxOutputTokens: 320,
          temperature: 0.2 + (attempt - 1) * 0.08,
        });

        const matchedTreatmentId = normalizeString(geminiOutput.matchedTreatmentId);
        const reason = normalizeString(geminiOutput.reason);
        if (matchedTreatmentId && candidateById.has(matchedTreatmentId)) {
          const selected = candidateById.get(matchedTreatmentId);
          if (!selected) {
            throw new HttpsError('internal', 'Candidato selezionato non disponibile.');
          }
          return {
            matchedTreatmentId: selected.id,
            matchedTreatmentTitle: selected.title,
            method: 'gemini',
            attempts: attempt,
            reason: reason || `Match Gemini al tentativo ${attempt}.`,
            candidates: toManualCandidates([selected, ...ranked.slice(0, MANUAL_CANDIDATE_LIMIT - 1)]),
          };
        }

        lastReason = reason || `Tentativo ${attempt}: nessun id valido restituito da Gemini.`;
      } catch (error) {
        console.error('legacyTreatmentMapper attempt failed', { attempt, error });
        lastReason = `Tentativo ${attempt} fallito: ${extractErrorMessage(error)}`;
      }
    }

    return {
      method: 'none',
      attempts: maxAttempts,
      reason: lastReason,
      candidates: fallbackManualCandidates,
    };
  },
);

function asObject(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpsError('invalid-argument', 'Payload non valido.');
  }
  return input as Record<string, unknown>;
}

function normalizeLegacyTreatment(input: unknown): LegacyTreatmentInput {
  const source = asObject(input);
  return {
    oldId: normalizeString(source.oldId ?? source._id ?? source.id),
    name: normalizeString(source.name ?? source.title),
    typeExpenseId: normalizeString(source.typeExpenseId ?? source.type_expense_id),
    typeExpenseName: normalizeString(source.typeExpenseName ?? source.type_expense_name),
    duration: normalizeOptionalNumber(source.duration),
    price: normalizeOptionalNumber(source.price),
  };
}

function normalizeString(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeOptionalNumber(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.round(parsed * 100) / 100;
}

async function loadTreatmentCatalog() {
  if (runtimeCache && Date.now() - runtimeCache.loadedAt < CACHE_TTL_MS) {
    return runtimeCache.candidates;
  }

  const [treatmentsSnapshot, typeExpensesSnapshot] = await Promise.all([
    db.collection('treatments').get(),
    db.collection('typeExpenses').get(),
  ]);

  const typeExpenseNameById = new Map<string, string>();
  for (const doc of typeExpensesSnapshot.docs) {
    const raw = doc.data() as Record<string, unknown>;
    typeExpenseNameById.set(doc.id, normalizeString(raw.name));
  }

  const candidates: TreatmentCandidate[] = treatmentsSnapshot.docs.map((doc) => {
    const raw = doc.data() as Record<string, unknown>;
    const typeExpenseId = normalizeString(raw.type_expense_id);
    return {
      id: doc.id,
      oldId: normalizeString(raw.old_id),
      title: normalizeString(raw.title),
      typeExpenseId,
      typeExpenseName: normalizeString(typeExpenseNameById.get(typeExpenseId)),
      duration: normalizeOptionalNumber(raw.duration) ?? 0,
      price: normalizeOptionalNumber(raw.price) ?? 0,
      metaAI: normalizeString(raw.metaAI),
    };
  });

  runtimeCache = {
    loadedAt: Date.now(),
    candidates,
  };

  return candidates;
}

function findExactByOldId(oldId: string, candidates: TreatmentCandidate[]) {
  const normalized = normalizeString(oldId);
  if (!normalized) return undefined;
  return candidates.find((item) => normalizeString(item.oldId) === normalized);
}

function findExactByName(name: string, candidates: TreatmentCandidate[]) {
  const normalized = normalizeText(name);
  if (!normalized) return undefined;
  return candidates.find((item) => normalizeText(item.title) === normalized);
}

function rankCandidates(legacy: LegacyTreatmentInput, candidates: TreatmentCandidate[]) {
  return [...candidates]
    .map((candidate) => ({
      candidate,
      score: candidateScore(legacy, candidate),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.candidate);
}

function candidateScore(legacy: LegacyTreatmentInput, candidate: TreatmentCandidate) {
  let score = 0;

  const legacyName = normalizeText(legacy.name);
  const candidateName = normalizeText(candidate.title);
  if (legacyName && candidateName) {
    const overlap = tokenOverlap(legacyName, candidateName);
    score += overlap * 5;
    if (legacyName === candidateName) score += 15;
    if (candidateName.includes(legacyName) || legacyName.includes(candidateName)) score += 5;
  }

  const legacyTypeExpense = normalizeText(legacy.typeExpenseName);
  const candidateTypeExpense = normalizeText(candidate.typeExpenseName);
  if (legacyTypeExpense && candidateTypeExpense) {
    score += tokenOverlap(legacyTypeExpense, candidateTypeExpense) * 3;
    if (legacyTypeExpense === candidateTypeExpense) score += 8;
  }

  const legacyDuration = legacy.duration ?? 0;
  if (legacyDuration > 0 && candidate.duration > 0) {
    const diff = Math.abs(legacyDuration - candidate.duration);
    if (diff <= 5) score += 5;
    else if (diff <= 10) score += 3;
    else if (diff <= 20) score += 1;
  }

  const legacyPrice = legacy.price ?? 0;
  if (legacyPrice > 0 && candidate.price > 0) {
    const diff = Math.abs(legacyPrice - candidate.price);
    if (diff <= 2) score += 5;
    else if (diff <= 5) score += 3;
    else if (diff <= 10) score += 1;
  }

  return score;
}

function tokenOverlap(left: string, right: string) {
  const leftTokens = new Set(left.split(' ').filter(Boolean));
  const rightTokens = new Set(right.split(' ').filter(Boolean));
  if (!leftTokens.size || !rightTokens.size) return 0;

  let shared = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) shared += 1;
  }

  return shared;
}

function normalizeText(value: string) {
  return normalizeString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toManualCandidates(list: TreatmentCandidate[]) {
  const result: LegacyTreatmentMapperResponse['candidates'] = [];
  for (const candidate of list) {
    if (!candidate?.id) continue;
    if (result.some((item) => item.id === candidate.id)) continue;
    result.push({
      id: candidate.id,
      title: candidate.title,
      typeExpenseName: candidate.typeExpenseName,
      duration: candidate.duration,
      price: candidate.price,
    });
    if (result.length >= MANUAL_CANDIDATE_LIMIT) break;
  }
  return result;
}

function extractErrorMessage(error: unknown) {
  if (error instanceof HttpsError) {
    return error.message;
  }
  if (error instanceof Error && normalizeString(error.message)) {
    return error.message;
  }
  return 'errore inatteso';
}
