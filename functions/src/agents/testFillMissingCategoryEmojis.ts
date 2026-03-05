import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { generateJsonObject } from '../ai/geminiClient.js';
import { db } from '../config/firebaseAdmin.js';
import { DEFAULT_GEMINI_MODEL, REGION } from '../config/runtime.js';
import { GEMINI_API_KEY } from '../config/secret.js';
import { requireAuth, requireUserPermission } from '../utils/auth.js';
import { readOptionalIntegerInRange } from '../utils/validation.js';

type TestFillMissingCategoryEmojisRequest = {
  limit?: number;
};

type CategoryCollection = 'productsCategories' | 'treatmentsCategories';

type CategoryCandidate = {
  collection: CategoryCollection;
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
};

type CategoryUpdateItem = {
  collection: CategoryCollection;
  id: string;
  title: string;
  emoji: string;
  status: 'updated' | 'missing-output';
};

type GeminiCategoryEmojiResponse = {
  items?: Array<{
    key?: unknown;
    emoji?: unknown;
  }>;
};

export type TestFillMissingCategoryEmojisResponse = {
  model: string;
  scanned: number;
  missingBefore: number;
  attempted: number;
  updated: number;
  items: CategoryUpdateItem[];
};

export const testFillMissingCategoryEmojis = onCall<TestFillMissingCategoryEmojisRequest>(
  {
    region: REGION,
    secrets: [GEMINI_API_KEY],
  },
  async (request): Promise<TestFillMissingCategoryEmojisResponse> => {
    await requireUserPermission(request, 'AI');
    const uid = requireAuth(request);
    const data = readInput(request.data);
    const limit = readOptionalIntegerInRange(data.limit, 'limit', 1, 200, 80);

    const categories = await loadCategories();
    const missingCategories = categories.filter((item) => !item.emoji);
    const candidates = missingCategories.slice(0, limit);

    if (!candidates.length) {
      return {
        model: DEFAULT_GEMINI_MODEL,
        scanned: categories.length,
        missingBefore: missingCategories.length,
        attempted: 0,
        updated: 0,
        items: [],
      };
    }

    const suggestionByKey = await generateCategoryEmojiSuggestions(candidates);
    const batch = db.batch();
    const resultItems: CategoryUpdateItem[] = [];
    let updatedCount = 0;

    for (const category of candidates) {
      const key = categoryKey(category);
      const emoji = normalizeEmoji(suggestionByKey.get(key));
      if (!emoji) {
        resultItems.push({
          collection: category.collection,
          id: category.id,
          title: category.title,
          emoji: '',
          status: 'missing-output',
        });
        continue;
      }

      batch.update(db.collection(category.collection).doc(category.id), {
        emoji,
        updateBy: `ai-emoji-test:${uid}`,
      });
      resultItems.push({
        collection: category.collection,
        id: category.id,
        title: category.title,
        emoji,
        status: 'updated',
      });
      updatedCount += 1;
    }

    if (updatedCount) {
      await batch.commit();
    }

    return {
      model: DEFAULT_GEMINI_MODEL,
      scanned: categories.length,
      missingBefore: missingCategories.length,
      attempted: candidates.length,
      updated: updatedCount,
      items: resultItems,
    };
  },
);

function readInput(raw: unknown) {
  if (raw == null) return {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new HttpsError('invalid-argument', 'Payload non valido.');
  }
  return raw as Record<string, unknown>;
}

async function loadCategories() {
  const [productSnapshot, treatmentSnapshot] = await Promise.all([
    db.collection('productsCategories').get(),
    db.collection('treatmentsCategories').get(),
  ]);

  const productCategories = productSnapshot.docs
    .map((doc) => mapCategoryDoc('productsCategories', doc))
    .filter((item): item is CategoryCandidate => Boolean(item));
  const treatmentCategories = treatmentSnapshot.docs
    .map((doc) => mapCategoryDoc('treatmentsCategories', doc))
    .filter((item): item is CategoryCandidate => Boolean(item));

  return [...productCategories, ...treatmentCategories].sort((a, b) => a.title.localeCompare(b.title, 'it'));
}

function mapCategoryDoc(collection: CategoryCollection, doc: QueryDocumentSnapshot) {
  const data = doc.data() as Record<string, unknown>;
  const title = String(data.title ?? '').trim();
  if (!title) return undefined;

  return {
    collection,
    id: doc.id,
    title,
    subtitle: String(data.subtitle ?? '').trim(),
    emoji: normalizeEmoji(data.emoji),
  } satisfies CategoryCandidate;
}

async function generateCategoryEmojiSuggestions(categories: CategoryCandidate[]) {
  const aiResponse = await generateJsonObject<GeminiCategoryEmojiResponse>({
    model: DEFAULT_GEMINI_MODEL,
    systemInstruction: [
      'Sei un assistente che assegna emoji a categorie di un centro estetico.',
      'Per ogni elemento restituisci una sola emoji coerente con titolo/sottotitolo.',
      'Non usare testo extra.',
      'Rispondi solo con JSON nel formato: {"items":[{"key":"...","emoji":"..."}]}.',
    ].join(' '),
    userPrompt: JSON.stringify(
      {
        payload: {
          objective: 'Assegna una emoji mancante per ogni categoria.',
          categories: categories.map((item) => ({
            key: categoryKey(item),
            collection: item.collection,
            title: item.title,
            subtitle: item.subtitle,
          })),
        },
      },
      null,
      2,
    ),
    maxOutputTokens: 1400,
    temperature: 0.2,
  });

  const map = new Map<string, string>();
  if (!Array.isArray(aiResponse.items)) {
    return map;
  }

  for (const item of aiResponse.items) {
    const key = String(item?.key ?? '').trim();
    const emoji = normalizeEmoji(item?.emoji);
    if (!key || !emoji) continue;
    if (map.has(key)) continue;
    map.set(key, emoji);
  }
  return map;
}

function categoryKey(category: Pick<CategoryCandidate, 'collection' | 'id'>) {
  return `${category.collection}:${category.id}`;
}

function normalizeEmoji(value: unknown) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';

  const firstToken = normalized.split(/\s+/)[0] ?? '';
  const cleaned = firstToken.trim();
  if (!cleaned) return '';

  if (/^[\p{L}\p{N}_-]+$/u.test(cleaned)) {
    return '';
  }

  return cleaned.slice(0, 8);
}
