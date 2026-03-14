import { Timestamp } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { google } from 'googleapis';
import { createHash } from 'node:crypto';
import { db } from '../config/firebaseAdmin.js';
import { REGION } from '../config/runtime.js';
import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  HUBCORTEX_API_KEY,
} from '../config/secret.js';
import { hub } from '../utils/hub.js';

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

type AppConfigGoogleData = {
  googleCalendarId?: unknown;
  googleCalendarAccessRole?: unknown;
  googleCalendarAllowedEmailsCsv?: unknown;
};

type CalendarAclRole = 'freeBusyReader' | 'reader' | 'writer';
type CalendarClient = ReturnType<typeof google.calendar>;

const MINUTE_MS = 60_000;
const CALENDAR_ACL_ROLE_SET = new Set<CalendarAclRole>([
  'freeBusyReader',
  'reader',
  'writer',
]);
const DEFAULT_CALENDAR_ACL_ROLE: CalendarAclRole = 'writer';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CALENDAR_EVENT_ID_REGEX = /^[a-v0-9]{5,1024}$/;
const GOOGLE_CALENDAR_RUNTIME_SECRETS = [
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  HUBCORTEX_API_KEY,
];

export const syncAppointmentGoogleCalendar = onDocumentWritten(
  {
    region: REGION,
    document: 'appointments/{appointmentId}',
    secrets: GOOGLE_CALENDAR_RUNTIME_SECRETS,
  },
  async (event) => {
    const appointmentId = normalizeString(event.params.appointmentId) || 'unknown';

    try {
      const appConfig = await db.collection('appConfig').doc('main').get();
      const config = (appConfig.data() ?? {}) as Record<string, unknown>;
      const syncEnabled = Boolean(config.googleCalendarSyncEnabled);
      const calendarId = normalizeString(config.googleCalendarId);
      const timeZone = normalizeString(config.businessTimezone) || 'Europe/Rome';
      if (!syncEnabled || !calendarId) {
        await hub.warning({
          message: `:warning: Google Calendar sync saltata per appointment ${appointmentId}. syncEnabled=${syncEnabled}, calendarId=${calendarId || '(vuoto)'}.`,
        });
        return;
      }

      const calendar = getCalendarClient();
      if (!calendar) {
        const message =
          ':warning: Google Calendar sync saltata: secret mancanti GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.';
        console.warn(message);
        await hub.error({
          message,
        });
        return;
      }

      const eventId = buildEventId(appointmentId);
      const afterData = event.data?.after?.data() as AppointmentData | undefined;
      if (!afterData) {
        await safeDeleteEvent(calendar, calendarId, eventId);
        await hub.info({
          message: `:wastebasket: Evento Google Calendar eliminato (${eventId}) per appointment ${appointmentId}.`,
        });
        return;
      }

      const start = toDate(afterData.date_time);
      if (!start) {
        const message =
          `:warning: Google Calendar sync saltata per appointment ${appointmentId}: ` +
          `campo date_time non valido (${describeDateValue(afterData.date_time)}).`;
        console.warn(message);
        await hub.warning({ message });
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

      let operation: 'update' | 'insert' = 'update';
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
        operation = 'insert';
        await calendar.events.insert({
          calendarId,
          requestBody: {
            id: eventId,
            ...requestBody,
          },
        });
      }

      await hub.info({
        message: `:white_check_mark: Google Calendar sync ok (${operation}) appointment ${appointmentId}, eventId ${eventId}, calendar ${calendarId}.`,
      });
    } catch (error) {
      const details = formatErrorDetails(error);
      await hub.error({
        message: `:x: Google Calendar sync errore su appointment ${appointmentId}. ${details}`,
      });
      throw error;
    }
  },
);

export const syncGoogleCalendarAcl = onDocumentWritten(
  {
    region: REGION,
    document: 'appConfig/main',
    secrets: GOOGLE_CALENDAR_RUNTIME_SECRETS,
  },
  async (event) => {
    try {
      const afterConfig = (event.data?.after?.data() ?? {}) as AppConfigGoogleData;
      const beforeConfig = (event.data?.before?.data() ?? {}) as AppConfigGoogleData;
      if (buildAclSignature(beforeConfig) === buildAclSignature(afterConfig)) {
        return;
      }

      const calendarId = normalizeString(afterConfig.googleCalendarId);
      if (!calendarId) {
        await hub.warning({
          message: ':warning: Google Calendar ACL sync saltata: googleCalendarId vuoto.',
        });
        return;
      }

      const calendar = getCalendarClient();
      if (!calendar) {
        const message =
          ':warning: Google Calendar ACL sync saltata: secret mancanti GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.';
        console.warn(message);
        await hub.error({
          message,
        });
        return;
      }

      const desiredRole = normalizeAclRole(afterConfig.googleCalendarAccessRole);
      const desiredEmails = parseAclEmails(afterConfig.googleCalendarAllowedEmailsCsv);
      const protectedEmails = getProtectedAclEmails();

      const result = await reconcileCalendarAcl({
        calendar,
        calendarId,
        desiredEmails,
        desiredRole,
        protectedEmails,
      });

      const message =
        `:white_check_mark: Google Calendar ACL sync ok su ${calendarId}. ` +
        `desired=${desiredEmails.length}, inserted=${result.inserted}, ` +
        `updated=${result.updated}, deleted=${result.deleted}.`;
      console.info(message);
      await hub.info({ message });
    } catch (error) {
      const details = formatErrorDetails(error);
      await hub.error({
        message: `:x: Google Calendar ACL sync errore. ${details}`,
      });
      throw error;
    }
  },
);

function getCalendarClient() {
  const clientEmail = readSecretValue(
    () => GOOGLE_SERVICE_ACCOUNT_EMAIL.value(),
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  );
  const privateKeyRaw = readSecretValue(
    () => GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.value(),
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  );
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

function readSecretValue(secretGetter: () => string, fallbackEnv: string | undefined) {
  try {
    const direct = normalizeString(secretGetter());
    if (direct) return direct;
  } catch {
    // fall back to env vars when secret is not available in local runtimes
  }
  return normalizeString(fallbackEnv);
}

function toDate(value: unknown) {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();

  if (typeof value === 'object' && value) {
    const valueAsObject = value as Record<string, unknown>;

    const toDateFn = valueAsObject.toDate;
    if (typeof toDateFn === 'function') {
      try {
        const date = toDateFn.call(valueAsObject) as Date;
        if (date instanceof Date && !Number.isNaN(date.getTime())) {
          return date;
        }
      } catch {
        // continue with other parsing strategies
      }
    }

    const milliseconds = Number(
      valueAsObject._milliseconds ??
      valueAsObject.milliseconds ??
      valueAsObject.millis ??
      Number.NaN,
    );
    if (Number.isFinite(milliseconds)) {
      const date = new Date(milliseconds);
      if (!Number.isNaN(date.getTime())) return date;
    }

    const seconds = Number(
      valueAsObject._seconds ??
      valueAsObject.seconds ??
      Number.NaN,
    );
    const nanoseconds = Number(
      valueAsObject._nanoseconds ??
      valueAsObject.nanoseconds ??
      valueAsObject.nanos ??
      0,
    );
    if (Number.isFinite(seconds) && Number.isFinite(nanoseconds)) {
      const date = new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000));
      if (!Number.isNaN(date.getTime())) return date;
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const next = new Date(value);
    return Number.isNaN(next.getTime()) ? undefined : next;
  }
  return undefined;
}

function describeDateValue(value: unknown) {
  if (value == null) return 'null/undefined';
  if (value instanceof Date) return `Date(${value.toISOString()})`;
  if (value instanceof Timestamp) return 'firebase-admin Timestamp';
  if (typeof value === 'string') return `string(${value.slice(0, 64)})`;
  if (typeof value === 'number') return `number(${value})`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).slice(0, 8).join(',');
    return `object(keys=${keys || 'none'})`;
  }
  return typeof value;
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
  const legacyNormalized = appointmentId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 900);
  const legacyEventId = `cb${legacyNormalized || 'appointment'}`;
  if (isValidCalendarEventId(legacyEventId)) {
    return legacyEventId;
  }

  // Google Calendar event.id accetta solo [a-v0-9].
  // Usiamo un hash deterministicamente stabile e sempre valido.
  const stableHash = createHash('sha1')
    .update(appointmentId || 'appointment')
    .digest('hex')
    .slice(0, 64);
  return `cb${stableHash}`;
}

function isValidCalendarEventId(value: string) {
  return CALENDAR_EVENT_ID_REGEX.test(normalizeString(value));
}

function readErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { code?: unknown; response?: { status?: number } };
  if (typeof e.response?.status === 'number') return e.response.status;
  if (typeof e.code === 'number') return e.code;
  return undefined;
}

async function safeDeleteEvent(
  calendar: CalendarClient,
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

function normalizeEmail(value: unknown) {
  return normalizeString(value).toLowerCase();
}

function isValidEmail(email: string) {
  return EMAIL_REGEX.test(email);
}

function parseAclEmails(value: unknown) {
  const raw = normalizeString(value);
  if (!raw) return [];

  return [...new Set(
    raw
      .split(/[\n,;]+/g)
      .map((item) => normalizeEmail(item))
      .filter((email) => isValidEmail(email)),
  )].sort();
}

function normalizeAclRole(value: unknown): CalendarAclRole {
  const normalized = normalizeString(value) as CalendarAclRole;
  return CALENDAR_ACL_ROLE_SET.has(normalized)
    ? normalized
    : DEFAULT_CALENDAR_ACL_ROLE;
}

function buildAclSignature(config: AppConfigGoogleData) {
  const calendarId = normalizeString(config.googleCalendarId);
  const role = normalizeAclRole(config.googleCalendarAccessRole);
  const emails = parseAclEmails(config.googleCalendarAllowedEmailsCsv);
  return `${calendarId}|${role}|${emails.join(',')}`;
}

function getProtectedAclEmails() {
  return new Set(
    [
      normalizeEmail(
        readSecretValue(
          () => GOOGLE_SERVICE_ACCOUNT_EMAIL.value(),
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        ),
      ),
      normalizeEmail(process.env.GOOGLE_CALENDAR_IMPERSONATED_USER),
    ].filter(Boolean),
  );
}

function formatErrorDetails(error: unknown) {
  if (!error) return 'Errore sconosciuto.';
  if (error instanceof Error) {
    const message = normalizeString(error.message);
    if (message) return message;
    return error.name || 'Errore sconosciuto.';
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

async function listUserAclRules(calendar: CalendarClient, calendarId: string) {
  const rules: Array<{ id: string; email: string; role: string }> = [];
  let pageToken: string | undefined;

  do {
    const response = await calendar.acl.list({
      calendarId,
      pageToken,
      maxResults: 250,
    });

    const items = response.data.items ?? [];
    for (const item of items) {
      if (normalizeString(item.scope?.type) !== 'user') continue;
      const id = normalizeString(item.id);
      const email = normalizeEmail(item.scope?.value);
      if (!id || !email) continue;

      rules.push({
        id,
        email,
        role: normalizeString(item.role),
      });
    }

    pageToken = normalizeString(response.data.nextPageToken) || undefined;
  } while (pageToken);

  return rules;
}

async function ensureAclRule(
  calendar: CalendarClient,
  calendarId: string,
  email: string,
  role: CalendarAclRole,
) {
  try {
    await calendar.acl.insert({
      calendarId,
      sendNotifications: false,
      requestBody: {
        role,
        scope: {
          type: 'user',
          value: email,
        },
      },
    });
  } catch (error) {
    if (readErrorStatus(error) === 409) {
      return;
    }
    throw error;
  }
}

async function safeDeleteAclRule(
  calendar: CalendarClient,
  calendarId: string,
  ruleId: string,
) {
  try {
    await calendar.acl.delete({
      calendarId,
      ruleId,
    });
  } catch (error) {
    if (readErrorStatus(error) === 404) {
      return;
    }
    throw error;
  }
}

async function reconcileCalendarAcl(args: {
  calendar: CalendarClient;
  calendarId: string;
  desiredEmails: string[];
  desiredRole: CalendarAclRole;
  protectedEmails: Set<string>;
}) {
  const existingRules = await listUserAclRules(args.calendar, args.calendarId);
  const existingByEmail = new Map(existingRules.map((rule) => [rule.email, rule]));
  const desiredEmailSet = new Set(args.desiredEmails);
  let inserted = 0;
  let updated = 0;
  let deleted = 0;

  for (const email of desiredEmailSet) {
    const current = existingByEmail.get(email);
    if (!current) {
      await ensureAclRule(args.calendar, args.calendarId, email, args.desiredRole);
      inserted += 1;
      continue;
    }

    const currentRole = normalizeString(current.role);
    if (currentRole && currentRole !== args.desiredRole && currentRole !== 'owner') {
      await args.calendar.acl.patch({
        calendarId: args.calendarId,
        ruleId: current.id,
        requestBody: {
          role: args.desiredRole,
        },
      });
      updated += 1;
    }
  }

  for (const rule of existingRules) {
    if (desiredEmailSet.has(rule.email)) continue;
    if (args.protectedEmails.has(rule.email)) continue;
    if (normalizeString(rule.role) === 'owner') continue;

    await safeDeleteAclRule(args.calendar, args.calendarId, rule.id);
    deleted += 1;
  }

  return { inserted, updated, deleted };
}
