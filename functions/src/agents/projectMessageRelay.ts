import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { REGION } from '../config/runtime.js';
import { requireUserPermission } from '../utils/auth.js';
import { readOptionalString, readRequiredString } from '../utils/validation.js';

const HUBCORTEX_INGEST_ENDPOINT =
  'https://europe-west1-hubcortex-33389.cloudfunctions.net/ingestProjectMessage';

type JsonRecord = Record<string, unknown>;

export type PublishProjectMessageRequest = {
  apiKey: string;
  typeMessage?: string;
  title?: string;
  message: string;
  sendPush?: boolean;
  payload?: JsonRecord;
};

export type PublishProjectMessageResponse = {
  ok: boolean;
  status: number;
  data: JsonRecord;
};

export const publishProjectMessage = onCall<PublishProjectMessageRequest>(
  {
    region: REGION,
  },
  async (request): Promise<PublishProjectMessageResponse> => {
    await requireUserPermission(request, 'BETA_FEATURES');

    const data = asObject(request.data);
    const apiKey = readRequiredString(data, 'apiKey', { maxLength: 512 });
    const message = readRequiredString(data, 'message', { maxLength: 4000 });
    const typeMessage = readOptionalString(data, 'typeMessage', { maxLength: 80 });
    const title = readOptionalString(data, 'title', { maxLength: 180 });
    const sendPush = readOptionalBoolean(data.sendPush, 'sendPush');
    const payload = readOptionalObject(data.payload, 'payload');

    const body: JsonRecord = { message };
    body.apiKey = apiKey;
    if (typeMessage) body.typeMessage = typeMessage;
    if (title) body.title = title;
    if (typeof sendPush === 'boolean') body.sendPush = sendPush;
    if (payload) body.payload = payload;

    const response = await fetch(HUBCORTEX_INGEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-project-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    const parsedResponse = await parseResponseData(response);
    const responseAsObject = asOptionalObject(parsedResponse) ?? {
      raw: String(parsedResponse ?? ''),
    };

    if (!response.ok) {
      const remoteError = extractErrorMessage(responseAsObject);
      throw new HttpsError('internal', remoteError || `HubCortex HTTP status ${response.status}.`);
    }

    if (responseAsObject.ok === false) {
      const remoteError = extractErrorMessage(responseAsObject);
      throw new HttpsError('internal', remoteError || 'HubCortex ha restituito ok=false.');
    }

    return {
      ok: true,
      status: response.status,
      data: responseAsObject,
    };
  },
);

// Backward-compatible export name used by older clients.
export const relayProjectMessage = publishProjectMessage;

function asObject(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpsError('invalid-argument', 'Payload non valido.');
  }
  return input as Record<string, unknown>;
}

function asOptionalObject(input: unknown): JsonRecord | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return undefined;
  }
  return input as JsonRecord;
}

function readOptionalBoolean(raw: unknown, key: string) {
  if (raw == null || raw === '') return undefined;
  if (typeof raw !== 'boolean') {
    throw new HttpsError('invalid-argument', `${key} deve essere boolean.`);
  }
  return raw;
}

function readOptionalObject(raw: unknown, key: string): JsonRecord | undefined {
  if (raw == null || raw === '') return undefined;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new HttpsError('invalid-argument', `${key} deve essere un oggetto JSON.`);
  }
  return raw as JsonRecord;
}

function extractErrorMessage(input: JsonRecord) {
  const details = typeof input.details === 'string' ? input.details.trim() : '';
  if (details) return details;
  const error = typeof input.error === 'string' ? input.error.trim() : '';
  if (error) return error;
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  if (message) return message;
  return '';
}

async function parseResponseData(response: globalThis.Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text.trim() ? { raw: text } : null;
  } catch {
    return null;
  }
}
