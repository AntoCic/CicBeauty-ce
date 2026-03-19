import { createHash, randomBytes } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall, onRequest, type CallableRequest } from 'firebase-functions/v2/https';
import type { Request, Response } from 'express';
import { db } from '../config/firebaseAdmin.js';
import { sendUserPush } from '../config/cicKitFunctions.js';
import { REGION } from '../config/runtime.js';
import { requireAuth } from '../utils/auth.js';

type CreateTokenRequest = {
  clientId?: string;
  ttlHours?: number;
};

type RevokeTokenRequest = {
  clientId?: string;
};

const TOKEN_TTL_HOURS = new Set([48, 168, 336, 720]);
const OPERATOR_PERMISSIONS = new Set(['OPERATORE', 'ADMIN', 'SUPERADMIN']);
const MAX_TEXT_LENGTH = 1500;
const SYSTEM_PUSH_UID = 'public-laser-share';

const PUBLIC_TEXT_KEYS = new Set([
  'clientAddress',
  'clientResidenceCity',
  'clientStreet',
  'epilationAreasDone',
  'epilationResults',
  'epilationCurrentMethods',
  'medsWomanAltri',
  'medsManAltri',
  'zonaInteresse',
]);

const PUBLIC_YES_NO_KEYS = new Set([
  'epilationAlreadyDone',
  'medsWomanAnticoncezionali',
  'medsWomanAnabolizzanti',
  'medsWomanCortisonici',
  'medsManRicrescitaCapelli',
  'medsManAnabolizzanti',
  'medsManCortisonici',
  'gravidanzaAllattamento',
  'pacemaker',
  'epilessia',
  'cicloRegolare',
  'consensoFoto',
]);

const PUBLIC_NUMERIC_KEYS = new Set([
  'clientAge',
  'fitzpatrick_q1',
  'fitzpatrick_q2',
  'fitzpatrick_q3',
  'fitzpatrick_q4',
  'fitzpatrick_q5',
  'fitzpatrick_q6',
  'fitzpatrick_q7',
  'fitzpatrick_q8',
  'fitzpatrick_q9',
  'fitzpatrick_q10',
]);

const PUBLIC_GENDER_KEYS = new Set(['clientGender']);
const ALLOWED_PUBLIC_KEYS = new Set([
  ...PUBLIC_TEXT_KEYS,
  ...PUBLIC_YES_NO_KEYS,
  ...PUBLIC_NUMERIC_KEYS,
  ...PUBLIC_GENDER_KEYS,
]);

export const createClientLaserShareToken = onCall<CreateTokenRequest>(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);
    const input = asObject(request.data);
    const clientId = readRequiredString(input, 'clientId');
    const ttlHours = readAllowedTtl(input.ttlHours);
    const userData = await requireOperatorUser(uid);

    const clientRef = db.collection('clients').doc(clientId);
    const clientSnapshot = await clientRef.get();
    if (!clientSnapshot.exists) {
      throw new HttpsError('not-found', 'Cliente non trovato.');
    }

    const clientData = asObject(clientSnapshot.data());
    const phoneNumber = normalizeString(clientData.phone_number);
    if (!phoneNumber) {
      throw new HttpsError('failed-precondition', 'Serve il numero di telefono del cliente per creare il link.');
    }

    const operatorFirstName = resolveFirstName(userData);
    const updateBy = resolveUpdateBy(request, userData);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
    const token = randomBytes(24).toString('base64url');
    const tokenHash = hashToken(token);

    const updatePayload: Record<string, unknown> = {
      laserShareToken: token,
      laserShareTokenHash: tokenHash,
      laserShareTokenCreatedAt: Timestamp.fromDate(now),
      laserShareTokenExpiresAt: Timestamp.fromDate(expiresAt),
      laserShareTokenOperatorFirstName: operatorFirstName,
      laserShareTokenCreatedByUid: uid,
      updateBy,
    };

    const existingSheet = readSheetRecord(clientData.schedaLaser);
    const hasSheetData = Object.keys(existingSheet).length > 0;
    const shouldInitializeSheet = !hasSheetData;
    const nextSheet = shouldInitializeSheet
      ? buildInitialLaserSheet(clientData, operatorFirstName, now)
      : {
          ...existingSheet,
          operatorName: normalizeString(existingSheet.operatorName) || operatorFirstName,
          clientAge: normalizeString(existingSheet.clientAge) || resolveClientAge(clientData.birthdate),
          clientGender: normalizeGenderForSheet(existingSheet.clientGender || clientData.gender),
        };

    updatePayload.schedaLaser = nextSheet;
    updatePayload.dataSchiedaLaser = Timestamp.fromDate(now);

    const currentSheetNumber = Number(clientData.schedaLaserNumber);
    if (!Number.isFinite(currentSheetNumber) || currentSheetNumber <= 0) {
      updatePayload.schedaLaserNumber = await nextLaserSheetNumber();
    }

    await clientRef.update(updatePayload);

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      operatorFirstName,
      ttlHours,
    };
  },
);

export const revokeClientLaserShareToken = onCall<RevokeTokenRequest>(
  { region: REGION },
  async (request) => {
    const uid = requireAuth(request);
    const input = asObject(request.data);
    const clientId = readRequiredString(input, 'clientId');
    const userData = await requireOperatorUser(uid);
    const updateBy = resolveUpdateBy(request, userData);

    const clientRef = db.collection('clients').doc(clientId);
    const clientSnapshot = await clientRef.get();
    if (!clientSnapshot.exists) {
      throw new HttpsError('not-found', 'Cliente non trovato.');
    }

    await clientRef.update({
      ...buildShareTokenRevocationUpdate(),
      updateBy,
    });

    return { revoked: true };
  },
);

export const getClientLaserShareSession = onRequest(
  { region: REGION, cors: true },
  async (request, response) => {
    handleCors(request, response);
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const token = normalizeString(request.query.token);
      if (!token) {
        response.status(400).json({ error: 'token_required' });
        return;
      }

      const clientTokenData = await resolveClientByToken(token);
      const clientData = clientTokenData.data;
      const sheet = readSheetRecord(clientData.schedaLaser);
      const operatorFirstName = normalizeString(clientData.laserShareTokenOperatorFirstName) || 'operatore';

      response.status(200).json({
        ok: true,
        clientName: normalizeString(clientData.name),
        operatorFirstName,
        expiresAt: clientTokenData.expiresAt.toISOString(),
        answers: sanitizePublicAnswers(sheet),
        skippedKeys: normalizeStringArray(clientData.laserShareSkippedKeys),
      });
    } catch (error) {
      sendPublicError(response, error);
    }
  },
);

export const saveClientLaserShareSession = onRequest(
  { region: REGION, cors: true },
  async (request, response) => {
    handleCors(request, response);
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const body = readJsonBody(request);
      const token = readRequiredString(body, 'token');
      const updates = asObjectOrEmpty(body.updates);
      const skippedKeys = normalizeStringArray(body.skippedKeys).filter((key) => ALLOWED_PUBLIC_KEYS.has(key));
      const completeSession = readBoolean(body.completeSession);

      const clientTokenData = await resolveClientByToken(token);
      const clientRef = clientTokenData.ref;
      const clientData = clientTokenData.data;
      const creatorUid = normalizeString(clientData.laserShareTokenCreatedByUid);
      const clientDisplayName = resolveClientDisplayName(clientData);
      const previousSheet = readSheetRecord(clientData.schedaLaser);
      const sanitizedUpdates = sanitizeUpdates(updates);
      const nextSheet = {
        ...previousSheet,
        ...sanitizedUpdates,
      };

      const nextSkipped = new Set(normalizeStringArray(clientData.laserShareSkippedKeys));
      for (const key of Object.keys(sanitizedUpdates)) {
        nextSkipped.delete(key);
      }
      for (const key of skippedKeys) {
        if (!sanitizedUpdates[key]) {
          nextSkipped.add(key);
        }
      }

      const updatePayload: Record<string, unknown> = {
        schedaLaser: nextSheet,
        laserShareSkippedKeys: [...nextSkipped],
        dataSchiedaLaser: Timestamp.fromDate(new Date()),
        updateBy: 'public-laser-share',
      };
      if (completeSession) {
        Object.assign(updatePayload, buildShareTokenRevocationUpdate());
      }

      await clientRef.update(updatePayload);
      if (completeSession) {
        await notifyShareCompleted({
          toUid: creatorUid,
          clientId: clientRef.id,
          clientName: clientDisplayName,
        });
      }

      response.status(200).json({
        ok: true,
        skippedKeys: [...nextSkipped],
      });
    } catch (error) {
      sendPublicError(response, error);
    }
  },
);

async function requireOperatorUser(uid: string) {
  const snapshot = await db.collection('users').doc(uid).get();
  if (!snapshot.exists) {
    throw new HttpsError('permission-denied', 'Utente non autorizzato.');
  }
  const data = asObject(snapshot.data());
  const permissions = normalizeStringArray(data.permissions);
  const hasAccess = permissions.some((permission) => OPERATOR_PERMISSIONS.has(permission));
  if (!hasAccess) {
    throw new HttpsError('permission-denied', 'Permesso operatore richiesto.');
  }
  return data;
}

async function resolveClientByToken(token: string) {
  const tokenHash = hashToken(token);
  const snapshot = await db
    .collection('clients')
    .where('laserShareTokenHash', '==', tokenHash)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new HttpsError('not-found', 'Token non valido.');
  }

  const doc = snapshot.docs[0];
  if (!doc) {
    throw new HttpsError('not-found', 'Token non valido.');
  }
  const data = asObject(doc.data());
  const expiresAt = toDate(data.laserShareTokenExpiresAt);
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    throw new HttpsError('permission-denied', 'Token scaduto.');
  }
  return {
    ref: doc.ref,
    data,
    expiresAt,
  };
}

async function notifyShareCompleted(params: { toUid: string; clientId: string; clientName: string }) {
  const toUid = normalizeString(params.toUid);
  if (!toUid) return;

  const clientName = normalizeString(params.clientName) || 'Un cliente';
  const title = `⚡ ${clientName} ha completato la scheda laser`;
  const body = `${clientName} ha completato la compilazione della scheda laser.`;

  try {
    await sendUserPush.run({
      data: {
        toUid,
        title,
        options: {
          body,
          data: { url: `/clients/${params.clientId}/laser` },
        },
      },
      auth: {
        uid: SYSTEM_PUSH_UID,
        token: {} as never,
        rawToken: 'internal',
      },
      rawRequest: {} as never,
      acceptsStreaming: false,
    } as never);
  } catch (error) {
    console.error('Errore invio notifica completamento scheda laser', error);
  }
}

function resolveClientDisplayName(clientData: Record<string, unknown>) {
  const name = normalizeString(clientData.name);
  const surname = normalizeString(clientData.surname);
  const fullName = `${name} ${surname}`.trim();
  if (fullName) return fullName;
  return name || 'Cliente';
}

function buildShareTokenRevocationUpdate() {
  return {
    laserShareToken: FieldValue.delete(),
    laserShareTokenHash: FieldValue.delete(),
    laserShareTokenCreatedAt: FieldValue.delete(),
    laserShareTokenExpiresAt: FieldValue.delete(),
    laserShareTokenOperatorFirstName: FieldValue.delete(),
    laserShareTokenCreatedByUid: FieldValue.delete(),
  };
}

function buildInitialLaserSheet(clientData: Record<string, unknown>, operatorFirstName: string, now: Date) {
  return {
    documentDate: toIsoDate(now),
    operatorName: operatorFirstName,
    clientAddress: '',
    clientResidenceCity: '',
    clientStreet: '',
    clientAge: resolveClientAge(clientData.birthdate),
    clientGender: normalizeGenderForSheet(clientData.gender),
    epilationAlreadyDone: 'no',
    epilationAreasDone: '',
    epilationResults: '',
    epilationCurrentMethods: '',
    medsWomanAnticoncezionali: 'no',
    medsWomanAnabolizzanti: 'no',
    medsWomanCortisonici: 'no',
    medsWomanAltri: '',
    medsManRicrescitaCapelli: 'no',
    medsManAnabolizzanti: 'no',
    medsManCortisonici: 'no',
    medsManAltri: '',
    gravidanzaAllattamento: 'no',
    pacemaker: 'no',
    epilessia: 'no',
    cicloRegolare: 'si',
    zonaInteresse: '',
    consensoFoto: 'si',
  };
}

async function nextLaserSheetNumber() {
  const snapshot = await db
    .collection('clients')
    .where('schedaLaserNumber', '>', 0)
    .orderBy('schedaLaserNumber', 'desc')
    .limit(1)
    .get();
  if (snapshot.empty) return 1;
  const value = Number(snapshot.docs[0]?.get('schedaLaserNumber') ?? 0);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.round(value) + 1;
}

function sanitizePublicAnswers(rawSheet: Record<string, unknown>) {
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(rawSheet)) {
    if (!ALLOWED_PUBLIC_KEYS.has(key)) continue;
    const sanitized = sanitizeValue(key, value);
    if (sanitized == null) continue;
    result[key] = sanitized;
  }
  return result;
}

function sanitizeUpdates(raw: Record<string, unknown>) {
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!ALLOWED_PUBLIC_KEYS.has(key)) continue;
    const sanitized = sanitizeValue(key, value);
    if (sanitized == null) continue;
    result[key] = sanitized;
  }
  return result;
}

function sanitizeValue(key: string, rawValue: unknown) {
  if (PUBLIC_NUMERIC_KEYS.has(key)) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return undefined;
    if (key.startsWith('fitzpatrick_')) {
      const bounded = Math.max(0, Math.min(4, Math.round(parsed)));
      return bounded;
    }
    return Math.max(0, Math.round(parsed));
  }

  if (PUBLIC_YES_NO_KEYS.has(key)) {
    const normalized = normalizeString(rawValue).toLowerCase();
    if (normalized === 'si' || normalized === 'no') return normalized;
    if (key === 'epilationAlreadyDone' && normalized) return 'si';
    return undefined;
  }

  if (PUBLIC_GENDER_KEYS.has(key)) {
    const normalized = normalizeString(rawValue).toUpperCase();
    if (normalized === 'F' || normalized === 'M') return normalized;
    return undefined;
  }

  const value = normalizeString(rawValue);
  if (!value) return '';
  if (value.length > MAX_TEXT_LENGTH) {
    return value.slice(0, MAX_TEXT_LENGTH);
  }
  return value;
}

function resolveClientAge(rawBirthdate: unknown) {
  const birthdate = normalizeString(rawBirthdate);
  if (!birthdate) return '';
  const date = new Date(birthdate);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }
  if (!Number.isFinite(age) || age < 0) return '';
  return String(age);
}

function normalizeGenderForSheet(rawGender: unknown) {
  const normalized = normalizeString(rawGender).toLowerCase();
  if (normalized === 'f') return 'F';
  if (normalized === 'm') return 'M';
  if (normalized === 'F' || normalized === 'M') return normalized;
  return '';
}

function resolveUpdateBy(request: CallableRequest<unknown>, userData: Record<string, unknown>) {
  const tokenEmail = normalizeString(request.auth?.token?.email);
  if (tokenEmail) return tokenEmail;
  const userEmail = normalizeString(userData.email);
  if (userEmail) return userEmail;
  return normalizeString(request.auth?.uid) || 'operator';
}

function resolveFirstName(userData: Record<string, unknown>) {
  const name = normalizeString(userData.name || userData.displayName);
  if (name) {
    const first = name.split(/\s+/)[0];
    if (first) return first;
  }
  const email = normalizeString(userData.email);
  if (email.includes('@')) {
    return email.split('@')[0] || 'operatore';
  }
  return email || 'operatore';
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function readSheetRecord(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    const normalizedKey = normalizeString(key);
    if (!normalizedKey) continue;
    output[normalizedKey] = value;
  }
  return output;
}

function toDate(raw: unknown) {
  if (!raw) return undefined;
  if (raw instanceof Timestamp) return raw.toDate();
  if (typeof raw === 'object' && raw && 'toDate' in raw) {
    const value = (raw as { toDate?: () => Date }).toDate?.();
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  }
  const parsed = new Date(normalizeString(raw));
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readAllowedTtl(raw: unknown) {
  const hours = Number(raw);
  if (!Number.isFinite(hours)) {
    throw new HttpsError('invalid-argument', 'Durata token non valida.');
  }
  const rounded = Math.round(hours);
  if (!TOKEN_TTL_HOURS.has(rounded)) {
    throw new HttpsError('invalid-argument', 'Durata token non supportata.');
  }
  return rounded;
}

function readRequiredString(input: Record<string, unknown>, key: string) {
  const value = normalizeString(input[key]);
  if (!value) {
    throw new HttpsError('invalid-argument', `Campo "${key}" obbligatorio.`);
  }
  return value;
}

function normalizeString(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeStringArray(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((item) => normalizeString(item)).filter(Boolean))];
}

function readBoolean(raw: unknown) {
  if (typeof raw === 'boolean') return raw;
  const normalized = normalizeString(raw).toLowerCase();
  return normalized === 'true' || normalized === '1';
}

function asObject(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  return input as Record<string, unknown>;
}

function asObjectOrEmpty(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  return input as Record<string, unknown>;
}

function readJsonBody(request: Request) {
  if (typeof request.body === 'string') {
    try {
      const parsed = JSON.parse(request.body);
      return asObject(parsed);
    } catch (error) {
      throw new HttpsError('invalid-argument', 'Body JSON non valido.');
    }
  }
  return asObject(request.body);
}

function handleCors(request: Request, response: Response) {
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Headers', 'Content-Type');
  response.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.set('Vary', 'Origin');
  if (request.method === 'OPTIONS') {
    response.set('Access-Control-Max-Age', '3600');
  }
}

function sendPublicError(response: Response, error: unknown) {
  if (error instanceof HttpsError) {
    const status = mapHttpsErrorStatus(error.code);
    response.status(status).json({
      error: error.code,
      message: error.message,
    });
    return;
  }
  console.error(error);
  response.status(500).json({
    error: 'internal',
    message: 'Errore interno',
  });
}

function mapHttpsErrorStatus(code: HttpsError['code']) {
  if (code === 'invalid-argument') return 400;
  if (code === 'unauthenticated') return 401;
  if (code === 'permission-denied') return 403;
  if (code === 'not-found') return 404;
  if (code === 'already-exists') return 409;
  if (code === 'failed-precondition') return 412;
  return 500;
}

