import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { REGION } from '../config/runtime.js';
import {
  HUBCORTEX_API_KEY,
  WHATSAPP_BUSINESS_ACCESS_TOKEN,
  WHATSAPP_BUSINESS_PHONE_NUMBER_ID,
} from '../config/secret.js';
import { requireUserPermission } from '../utils/auth.js';
import { hub } from '../utils/hub.js';

type JsonRecord = Record<string, unknown>;

export type SendWhatsAppTestMessageResponse = {
  ok: boolean;
  status: number;
  messageId: string;
  recipient: string;
  text: string;
};

const WHATSAPP_TEST_TEXT = 'sono un test';
const WHATSAPP_TEST_RECIPIENT = '+393295436315';
const WHATSAPP_GRAPH_API_VERSION = 'v23.0';
const WHATSAPP_RUNTIME_SECRETS = [
  WHATSAPP_BUSINESS_ACCESS_TOKEN,
  WHATSAPP_BUSINESS_PHONE_NUMBER_ID,
  HUBCORTEX_API_KEY,
];

export const sendWhatsAppTestMessage = onCall(
  {
    region: REGION,
    secrets: WHATSAPP_RUNTIME_SECRETS,
  },
  async (request): Promise<SendWhatsAppTestMessageResponse> => {
    await requireUserPermission(request, 'BETA_FEATURES');

    const accessToken = normalizeAccessToken(
      readSecretValue(
        () => WHATSAPP_BUSINESS_ACCESS_TOKEN.value(),
        process.env.WHATSAPP_BUSINESS_ACCESS_TOKEN,
      ),
    );
    const phoneNumberId = readSecretValue(
      () => WHATSAPP_BUSINESS_PHONE_NUMBER_ID.value(),
      process.env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID,
    );

    if (!accessToken || !phoneNumberId) {
      const missingSecrets = [
        !accessToken ? 'WHATSAPP_BUSINESS_ACCESS_TOKEN' : '',
        !phoneNumberId ? 'WHATSAPP_BUSINESS_PHONE_NUMBER_ID' : '',
      ].filter(Boolean);
      throw new HttpsError(
        'failed-precondition',
        `Missing secret: ${missingSecrets.join(', ')}.`,
      );
    }

    const recipientForApi = normalizeWhatsAppTo(WHATSAPP_TEST_RECIPIENT);
    const endpoint = `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${encodeURIComponent(phoneNumberId)}/messages`;

    let response: globalThis.Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientForApi,
          type: 'text',
          text: {
            preview_url: false,
            body: WHATSAPP_TEST_TEXT,
          },
        }),
      });
    } catch (error) {
      const details = formatErrorDetails(error);
      await hub.error({
        message: `:x: WhatsApp test errore rete su ${WHATSAPP_TEST_RECIPIENT}. ${details}`,
      });
      throw new HttpsError('unavailable', `WhatsApp API non raggiungibile. ${details}`);
    }

    const parsedResponse = await parseResponseData(response);
    const responseAsObject = asOptionalObject(parsedResponse) ?? {
      raw: normalizeString(parsedResponse),
    };

    if (!response.ok) {
      const remoteError =
        extractGraphErrorMessage(responseAsObject) || `WhatsApp API HTTP status ${response.status}.`;
      await hub.error({
        message: `:x: WhatsApp test fallito su ${WHATSAPP_TEST_RECIPIENT}. ${remoteError}`,
      });
      throw new HttpsError('internal', remoteError);
    }

    const messageId = extractGraphMessageId(responseAsObject) || 'unknown';
    if (messageId === 'unknown') {
      await hub.warning({
        message:
          `:warning: WhatsApp test inviato ma messageId assente per ${WHATSAPP_TEST_RECIPIENT}. ` +
          `Payload: ${compactPayloadPreview(responseAsObject)}`,
      });
    } else {
      await hub.info({
        message:
          `:white_check_mark: WhatsApp test inviato a ${WHATSAPP_TEST_RECIPIENT}. ` +
          `messageId=${messageId}.`,
      });
    }

    return {
      ok: true,
      status: response.status,
      messageId,
      recipient: WHATSAPP_TEST_RECIPIENT,
      text: WHATSAPP_TEST_TEXT,
    };
  },
);

function normalizeString(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeAccessToken(value: string) {
  return normalizeString(value)
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/^bearer\s+/i, '')
    .trim();
}

function readSecretValue(secretGetter: () => string, fallbackEnv: string | undefined) {
  try {
    const direct = normalizeString(secretGetter());
    if (direct) return direct;
  } catch {
    // fall back to env vars when secret is not available in local runtimes
  }
  return normalizeString(fallbackEnv);
}

function normalizeWhatsAppTo(value: string) {
  const digitsOnly = value.replace(/\D+/g, '').trim();
  if (!digitsOnly) {
    throw new HttpsError('invalid-argument', 'Numero WhatsApp destinatario non valido.');
  }
  return digitsOnly;
}

function asOptionalObject(input: unknown): JsonRecord | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return undefined;
  }
  return input as JsonRecord;
}

function extractGraphMessageId(payload: JsonRecord) {
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const first = messages[0];
  if (!first || typeof first !== 'object' || Array.isArray(first)) {
    return '';
  }
  return normalizeString((first as JsonRecord).id);
}

function extractGraphErrorMessage(payload: JsonRecord) {
  const topMessage = normalizeString(payload.message);
  if (topMessage) return topMessage;

  const errorRaw = payload.error;
  if (!errorRaw || typeof errorRaw !== 'object' || Array.isArray(errorRaw)) {
    return '';
  }

  const errorObj = errorRaw as JsonRecord;
  const details = normalizeString((errorObj.error_data as JsonRecord | undefined)?.details);
  if (details) return details;

  const message = normalizeString(errorObj.message);
  if (message) return message;

  const type = normalizeString(errorObj.type);
  const code = normalizeString(errorObj.code);
  if (type || code) {
    return [type, code].filter(Boolean).join(' ');
  }

  return '';
}

function compactPayloadPreview(payload: JsonRecord) {
  try {
    return normalizeString(JSON.stringify(payload)).slice(0, 260);
  } catch {
    return '[unserializable payload]';
  }
}

function formatErrorDetails(error: unknown) {
  if (!error) return 'Errore sconosciuto.';
  if (error instanceof Error) {
    const normalized = normalizeString(error.message);
    return normalized || error.name || 'Errore sconosciuto.';
  }
  if (typeof error === 'string') {
    return normalizeString(error) || 'Errore sconosciuto.';
  }

  try {
    const serialized = JSON.stringify(error);
    return normalizeString(serialized) || 'Errore sconosciuto.';
  } catch {
    return 'Errore sconosciuto.';
  }
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
