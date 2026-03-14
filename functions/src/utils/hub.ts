import { HUBCORTEX_API_KEY } from '../config/secret.js';

const HUBCORTEX_INGEST_ENDPOINT =
  'https://europe-west1-hubcortex-33389.cloudfunctions.net/ingestProjectMessage';

type JsonRecord = Record<string, unknown>;
type HubLevel = 'info' | 'warning' | 'error';

type HubNotifyInput = {
  message: string;
  title?: string;
  sendPush?: boolean;
  payload?: JsonRecord;
};

export const hub = {
  info: (input: HubNotifyInput) => notifyHub('info', input),
  warning: (input: HubNotifyInput) => notifyHub('warning', input),
  error: (input: HubNotifyInput) => notifyHub('error', input),
};

function normalizeString(value: unknown) {
  return String(value ?? '').trim();
}

function hasPayload(payload: unknown): payload is JsonRecord {
  return !!payload && typeof payload === 'object' && !Array.isArray(payload);
}

function resolveTitle(level: HubLevel, customTitle?: string) {
  const normalizedCustom = normalizeString(customTitle);
  if (normalizedCustom) return normalizedCustom;

  if (level === 'error') return 'Cloud Functions error';
  if (level === 'warning') return 'Cloud Functions warning';
  return 'Cloud Functions info';
}

function readHubApiKey() {
  try {
    return normalizeString(HUBCORTEX_API_KEY.value());
  } catch {
    return normalizeString(process.env.HUBCORTEX_API_KEY);
  }
}

async function notifyHub(level: HubLevel, input: HubNotifyInput) {
  const message = normalizeString(input.message);
  if (!message) return;

  const apiKey = readHubApiKey();
  if (!apiKey) {
    console.warn('Hub notify skipped: missing HUBCORTEX_API_KEY.');
    return;
  }

  const body: JsonRecord = {
    typeMessage: level,
    title: resolveTitle(level, input.title),
    message,
    sendPush: Boolean(input.sendPush),
  };

  if (hasPayload(input.payload)) {
    body.payload = input.payload;
  }

  try {
    const response = await fetch(HUBCORTEX_INGEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-project-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const responseText = await safeReadBody(response);
      console.error(`Hub notify failed (${response.status}): ${responseText}`);
    }
  } catch (error) {
    console.error('Hub notify request failed', error);
  }
}

async function safeReadBody(response: globalThis.Response) {
  try {
    return (await response.text()).trim();
  } catch {
    return '';
  }
}
