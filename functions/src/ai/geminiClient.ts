import { HttpsError } from 'firebase-functions/v2/https';
import { GEMINI_API_KEY } from '../config/secret.js';

type GeminiPart = { text?: string };
type GeminiCandidate = { content?: { parts?: GeminiPart[] } };
type GeminiApiError = { code?: number; message?: string; status?: string };
type GeminiApiResponse = { candidates?: GeminiCandidate[]; error?: GeminiApiError };

type GenerateJsonInput = {
  model: string;
  systemInstruction: string;
  userPrompt: string;
  maxOutputTokens?: number;
  temperature?: number;
};

export async function generateJsonObject<T>(input: GenerateJsonInput): Promise<T> {
  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'Missing GEMINI_API_KEY secret.');
  }

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(normalizeModel(input.model))}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        role: 'system',
        parts: [{ text: input.systemInstruction }],
      },
      contents: [{ role: 'user', parts: [{ text: input.userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: input.temperature ?? 0.2,
        maxOutputTokens: input.maxOutputTokens ?? 1024,
      },
    }),
  });

  const payload = (await response.json()) as GeminiApiResponse;

  if (!response.ok || payload.error) {
    throw new HttpsError(
      'internal',
      payload.error?.message ?? 'Gemini request failed.',
      payload.error ?? undefined,
    );
  }

  const rawText = extractFirstText(payload);
  if (!rawText) {
    throw new HttpsError('internal', 'Gemini returned an empty body.');
  }

  const normalizedJson = stripCodeFence(rawText);

  try {
    return JSON.parse(normalizedJson) as T;
  } catch (error) {
    console.error('Gemini JSON parse error', { normalizedJson, error });
    throw new HttpsError('internal', 'Gemini returned invalid JSON.');
  }
}

function normalizeModel(model: string) {
  const minimumModel = 'gemini-2.5-flash-lite';
  const value = String(model ?? '').trim();
  if (!value) return minimumModel;

  const normalized = value.startsWith('models/') ? value.slice(7) : value;
  if (!isAtLeastGemini25(normalized)) {
    return minimumModel;
  }

  return normalized;
}

function isAtLeastGemini25(model: string) {
  const normalized = String(model ?? '').trim().toLowerCase();
  const match = normalized.match(/^gemini-(\d+)(?:\.(\d+))?/);
  if (!match) return true;

  const major = Number(match[1] ?? 0);
  const minor = Number(match[2] ?? 0);

  if (major > 2) return true;
  if (major < 2) return false;
  return minor >= 5;
}

function extractFirstText(payload: GeminiApiResponse) {
  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim() ?? ''
  );
}

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;

  const withoutStart = trimmed.replace(/^```(?:json)?\s*/i, '');
  return withoutStart.replace(/\s*```$/, '').trim();
}
