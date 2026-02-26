import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';

type GeminiError = {
  code?: number;
  message?: string;
  status?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: GeminiError;
};

const geminiApiKey = defineSecret('GEMINI_API_KEY');

export const aiGenerateText = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    secrets: [geminiApiKey],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Use POST.' });
      return;
    }

    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    const modelInput =
      typeof req.body?.model === 'string' && req.body.model.trim()
        ? req.body.model.trim()
        : 'gemini-2.0-flash';
    const model = modelInput.startsWith('models/') ? modelInput.slice(7) : modelInput;

    if (!prompt) {
      res.status(400).json({ error: 'Missing "prompt" in request body.' });
      return;
    }

    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      res.status(500).json({ error: 'Missing GEMINI_API_KEY secret.' });
      return;
    }

    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const geminiResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      });

      const data = (await geminiResponse.json()) as GeminiResponse;

      if (!geminiResponse.ok || data.error) {
        res.status(geminiResponse.status || 502).json({
          error: data.error?.message ?? 'Gemini request failed.',
          details: data.error ?? null,
        });
        return;
      }

      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim() ?? '';

      res.status(200).json({ model, text });
    } catch (error) {
      console.error('Gemini call failed', error);
      res.status(500).json({ error: 'Unexpected error while calling Gemini.' });
    }
  },
);
