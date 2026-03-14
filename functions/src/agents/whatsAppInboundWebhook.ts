import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { db } from '../config/firebaseAdmin.js';
import { REGION } from '../config/runtime.js';
import { HUBCORTEX_API_KEY, WHATSAPP_WEBHOOK_VERIFY_TOKEN } from '../config/secret.js';
import { requireUserPermission } from '../utils/auth.js';
import { readOptionalIntegerInRange } from '../utils/validation.js';
import { hub } from '../utils/hub.js';

type JsonRecord = Record<string, unknown>;

type WhatsAppInboundMessageItem = {
  messageId: string;
  from: string;
  fromName?: string;
  type: string;
  textPreview?: string;
  timestamp?: string;
  receivedAt: Date;
  phoneNumberId?: string;
};

export type WhatsAppInboundMessageDTO = {
  id: string;
  from: string;
  fromName?: string;
  type: string;
  textPreview?: string;
  timestamp?: string;
  receivedAt?: string;
  phoneNumberId?: string;
};

export type ListWhatsAppInboundMessagesRequest = {
  limit?: number;
};

export type ListWhatsAppInboundMessagesResponse = {
  items: WhatsAppInboundMessageDTO[];
  count: number;
};

const WHATSAPP_WEBHOOK_SECRETS = [WHATSAPP_WEBHOOK_VERIFY_TOKEN, HUBCORTEX_API_KEY];
const INBOUND_COLLECTION = 'whatsappInboundMessages';

export const whatsAppInboundWebhook = onRequest(
  {
    region: REGION,
    secrets: WHATSAPP_WEBHOOK_SECRETS,
    cors: true,
  },
  async (request, response) => {
    const method = normalizeString(request.method).toUpperCase();
    if (method === 'GET') {
      handleVerifyRequest(request, response);
      return;
    }

    if (method !== 'POST') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const payload = parseRequestBody(request.body);
      const inboundMessages = extractInboundMessages(payload);

      if (!inboundMessages.length) {
        response.status(200).send('EVENT_RECEIVED');
        return;
      }

      for (const item of inboundMessages) {
        const documentId = normalizeString(item.messageId) || `msg_${Date.now()}`;
        await db.collection(INBOUND_COLLECTION).doc(documentId).set(
          {
            messageId: item.messageId,
            from: item.from,
            fromName: item.fromName || undefined,
            type: item.type,
            textPreview: item.textPreview || undefined,
            timestamp: item.timestamp || undefined,
            receivedAt: Timestamp.fromDate(item.receivedAt),
            phoneNumberId: item.phoneNumberId || undefined,
            direction: 'inbound',
            updateBy: 'whatsappWebhook',
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      const first = inboundMessages[0];
      const firstFrom = first ? `${first.fromName ? `${first.fromName} ` : ''}(${first.from})` : 'n/a';
      await hub.info({
        message:
          `:incoming_envelope: WhatsApp inbound ricevuto. count=${inboundMessages.length}, ` +
          `firstFrom=${firstFrom}.`,
      });

      response.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      const details = formatErrorDetails(error);
      await hub.error({
        message: `:x: WhatsApp inbound webhook errore. ${details}`,
      });
      response.status(500).send('Webhook error');
    }
  },
);

export const listWhatsAppInboundMessages = onCall<ListWhatsAppInboundMessagesRequest>(
  {
    region: REGION,
  },
  async (request): Promise<ListWhatsAppInboundMessagesResponse> => {
    await requireUserPermission(request, 'BETA_FEATURES');
    const data = asObject(request.data ?? {});
    const limit = readOptionalIntegerInRange(data.limit, 'limit', 1, 100, 20);

    const snapshot = await db
      .collection(INBOUND_COLLECTION)
      .orderBy('receivedAt', 'desc')
      .limit(limit)
      .get();

    const items = snapshot.docs.map((doc) => {
      const dataItem = (doc.data() ?? {}) as JsonRecord;
      return {
        id: normalizeString(dataItem.messageId) || doc.id,
        from: normalizeString(dataItem.from),
        fromName: normalizeString(dataItem.fromName) || undefined,
        type: normalizeString(dataItem.type) || 'unknown',
        textPreview: normalizeString(dataItem.textPreview) || undefined,
        timestamp: normalizeString(dataItem.timestamp) || undefined,
        phoneNumberId: normalizeString(dataItem.phoneNumberId) || undefined,
        receivedAt: toIsoDate(dataItem.receivedAt),
      } as WhatsAppInboundMessageDTO;
    });

    return {
      items,
      count: items.length,
    };
  },
);

function handleVerifyRequest(
  request: { query: unknown },
  response: {
    status: (code: number) => { send: (body: string) => unknown };
    send: (body: string) => unknown;
  },
) {
  const mode = readQueryString(request.query, 'hub.mode');
  const token = readQueryString(request.query, 'hub.verify_token');
  const challenge = readQueryString(request.query, 'hub.challenge');
  const expectedToken = readSecretValue(
    () => WHATSAPP_WEBHOOK_VERIFY_TOKEN.value(),
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  );

  if (!expectedToken) {
    response.status(500).send('Missing WHATSAPP_WEBHOOK_VERIFY_TOKEN');
    return;
  }

  if (mode === 'subscribe' && token === expectedToken && challenge) {
    response.status(200).send(challenge);
    return;
  }

  response.status(403).send('Forbidden');
}

function parseRequestBody(input: unknown): JsonRecord {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return input as JsonRecord;
  }

  if (typeof input === 'string') {
    const parsed = safeParseJson(input);
    if (parsed) return parsed;
  }

  throw new HttpsError('invalid-argument', 'Webhook payload non valido.');
}

function safeParseJson(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as JsonRecord;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function extractInboundMessages(payload: JsonRecord) {
  const entryItems = asArray(payload.entry);
  const messages: WhatsAppInboundMessageItem[] = [];

  for (const entryItem of entryItems) {
    const entryObj = asObject(entryItem);
    const changes = asArray(entryObj.changes);

    for (const changeItem of changes) {
      const changeObj = asObject(changeItem);
      const value = asObject(changeObj.value);
      const phoneNumberId = normalizeString((asObject(value.metadata).phone_number_id as unknown) ?? '');
      const contacts = asArray(value.contacts);
      const messagesRaw = asArray(value.messages);
      if (!messagesRaw.length) continue;

      const nameByWaId = new Map<string, string>();
      for (const contactRaw of contacts) {
        const contact = asObject(contactRaw);
        const waId = normalizeString(contact.wa_id);
        const profile = asObject(contact.profile);
        const name = normalizeString(profile.name);
        if (waId && name) {
          nameByWaId.set(waId, name);
        }
      }

      for (const messageRaw of messagesRaw) {
        const message = asObject(messageRaw);
        const from = normalizeString(message.from);
        const messageId = normalizeString(message.id);
        if (!from || !messageId) continue;

        const timestamp = normalizeString(message.timestamp) || undefined;
        const receivedAt = parseUnixSecondsToDate(timestamp) ?? new Date();
        const type = normalizeString(message.type) || 'unknown';
        const textPreview = extractTextPreview(message, type);
        const fromName = nameByWaId.get(from);

        messages.push({
          messageId,
          from,
          fromName,
          type,
          textPreview,
          timestamp,
          receivedAt,
          phoneNumberId: phoneNumberId || undefined,
        });
      }
    }
  }

  return messages;
}

function extractTextPreview(message: JsonRecord, type: string) {
  if (type === 'text') {
    const textObj = asObject(message.text);
    const textBody = normalizeString(textObj.body);
    if (textBody) return textBody.slice(0, 300);
  }

  if (type === 'button') {
    const buttonObj = asObject(message.button);
    const buttonText = normalizeString(buttonObj.text);
    if (buttonText) return `button: ${buttonText.slice(0, 280)}`;
  }

  if (type === 'interactive') {
    const interactiveObj = asObject(message.interactive);
    const title = normalizeString(asObject(interactiveObj.button_reply).title);
    if (title) return `interactive: ${title.slice(0, 270)}`;
  }

  return '';
}

function parseUnixSecondsToDate(value: string | undefined) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  return new Date(numeric * 1000);
}

function toIsoDate(value: unknown) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();

  if (typeof value === 'object' && value && 'toDate' in value) {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function asObject(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as JsonRecord;
  }
  return value as JsonRecord;
}

function readQueryString(query: unknown, key: string) {
  const queryAsObject = asObject(query);
  const raw = queryAsObject[key];
  if (Array.isArray(raw)) {
    return normalizeString(raw[0]);
  }
  return normalizeString(raw);
}

function normalizeString(value: unknown) {
  return String(value ?? '').trim();
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

function formatErrorDetails(error: unknown) {
  if (!error) return 'Errore sconosciuto.';
  if (error instanceof Error) {
    const message = normalizeString(error.message);
    return message || error.name || 'Errore sconosciuto.';
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
