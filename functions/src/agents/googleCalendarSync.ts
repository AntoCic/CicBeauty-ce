import { Timestamp } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { google } from 'googleapis';
import { db } from '../config/firebaseAdmin.js';
import { REGION } from '../config/runtime.js';

type AppointmentData = {
  date_time?: unknown;
  end_time?: unknown;
  custom_duration_minutes?: unknown;
  fix_duration?: unknown;
  treatment_ids?: unknown;
  client_id?: unknown;
  user_id?: unknown;
  notes?: unknown;
  status?: unknown;
  personalOwnerId?: unknown;
  isPersonal?: unknown;
  isPublic?: unknown;
};

const MINUTE_MS = 60_000;

export const syncAppointmentGoogleCalendar = onDocumentWritten(
  {
    region: REGION,
    document: 'appointments/{appointmentId}',
  },
  async (event) => {
    const appConfig = await db.collection('appConfig').doc('main').get();
    const config = (appConfig.data() ?? {}) as Record<string, unknown>;
    const syncEnabled = Boolean(config.googleCalendarSyncEnabled);
    const calendarId = normalizeString(config.googleCalendarId);
    const timeZone = normalizeString(config.businessTimezone) || 'Europe/Rome';
    if (!syncEnabled || !calendarId) {
      return;
    }

    const calendar = getCalendarClient();
    if (!calendar) {
      console.warn('Google Calendar sync skipped: missing service account env vars.');
      return;
    }

    const appointmentId = normalizeString(event.params.appointmentId);
    if (!appointmentId) return;
    const eventId = buildEventId(appointmentId);

    const afterData = event.data?.after?.data() as AppointmentData | undefined;
    if (!afterData) {
      await safeDeleteEvent(calendar, calendarId, eventId);
      return;
    }

    const start = toDate(afterData.date_time);
    if (!start) {
      console.warn(`Google Calendar sync skipped: invalid start date for ${appointmentId}`);
      return;
    }

    const defaultDuration = Number(config.defaultAppointmentDurationMinutes ?? 60);
    const end =
      toDate(afterData.end_time) ??
      new Date(
        start.getTime() +
          resolveDurationMinutes(afterData, defaultDuration) * MINUTE_MS,
      );

    const summary = await buildSummary(afterData);
    const description = buildDescription(afterData);

    const requestBody = {
      summary,
      description,
      start: { dateTime: start.toISOString(), timeZone },
      end: { dateTime: end.toISOString(), timeZone },
    };

    try {
      await calendar.events.update({
        calendarId,
        eventId,
        requestBody,
      });
    } catch (error) {
      const status = readErrorStatus(error);
      if (status !== 404) {
        throw error;
      }
      await calendar.events.insert({
        calendarId,
        requestBody: {
          id: eventId,
          ...requestBody,
        },
      });
    }
  },
);

function getCalendarClient() {
  const clientEmail = normalizeString(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  const privateKeyRaw = normalizeString(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
  const subject = normalizeString(process.env.GOOGLE_CALENDAR_IMPERSONATED_USER);
  if (!clientEmail || !privateKeyRaw) return null;

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    subject: subject || undefined,
  });

  return google.calendar({ version: 'v3', auth });
}

function normalizeString(value: unknown) {
  return String(value ?? '').trim();
}

function toDate(value: unknown) {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const next = new Date(value);
    return Number.isNaN(next.getTime()) ? undefined : next;
  }
  if (typeof value === 'object' && value && 'toDate' in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

function resolveDurationMinutes(data: AppointmentData, fallback: number) {
  const customDuration = Number(data.custom_duration_minutes ?? 0);
  if (Number.isFinite(customDuration) && customDuration > 0) {
    return customDuration;
  }
  const fixDuration = Number(data.fix_duration ?? 0);
  const duration = fallback + (Number.isFinite(fixDuration) ? fixDuration : 0);
  return Math.max(5, duration);
}

function buildEventId(appointmentId: string) {
  const normalized = appointmentId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 900);
  return `cb${normalized || 'appointment'}`;
}

function readErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { code?: unknown; response?: { status?: number } };
  if (typeof e.response?.status === 'number') return e.response.status;
  if (typeof e.code === 'number') return e.code;
  return undefined;
}

async function safeDeleteEvent(
  calendar: ReturnType<typeof google.calendar>,
  calendarId: string,
  eventId: string,
) {
  try {
    await calendar.events.delete({ calendarId, eventId });
  } catch (error) {
    if (readErrorStatus(error) === 404) {
      return;
    }
    throw error;
  }
}

async function buildSummary(data: AppointmentData) {
  const clientId = normalizeString(data.client_id ?? data.user_id);
  const treatmentIds = Array.isArray(data.treatment_ids)
    ? data.treatment_ids.map((id) => normalizeString(id)).filter(Boolean)
    : [];

  let clientName = '';
  if (clientId) {
    const clientDoc = await db.collection('clients').doc(clientId).get();
    if (clientDoc.exists) {
      const name = normalizeString(clientDoc.get('name'));
      const surname = normalizeString(clientDoc.get('surname'));
      clientName = `${name} ${surname}`.trim();
    }
  }

  let treatmentLabel = '';
  if (treatmentIds.length) {
    const docs = await Promise.all(
      treatmentIds.slice(0, 5).map((id) => db.collection('treatments').doc(id).get()),
    );
    treatmentLabel = docs
      .map((doc) => normalizeString(doc.get('title')))
      .filter(Boolean)
      .join(', ');
  }

  const base = clientName || 'Appuntamento'
  if (!treatmentLabel) return base;
  return `${base} - ${treatmentLabel}`;
}

function buildDescription(data: AppointmentData) {
  const isPersonal = Boolean(normalizeString(data.personalOwnerId) || data.isPersonal);
  const lines = [
    `Stato: ${normalizeString(data.status) || 'planned'}`,
    `Personale: ${isPersonal ? 'si' : 'no'}`,
    isPersonal ? `Pubblico: ${Boolean(data.isPublic) ? 'si' : 'no'}` : '',
    normalizeString(data.notes) ? `Note: ${normalizeString(data.notes)}` : '',
  ].filter(Boolean);

  return lines.join('\n');
}
