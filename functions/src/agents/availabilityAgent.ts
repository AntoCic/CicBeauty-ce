import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../config/firebaseAdmin.js';
import { REGION } from '../config/runtime.js';
import { requireAuth, requireUserPermissions } from '../utils/auth.js';
import { readOptionalIntegerInRange } from '../utils/validation.js';

type AvailabilityAgentRequest = {
  clientId?: string;
  referenceDate: string;
  treatmentIds?: string[];
  overrideDurationMinutes?: number;
  rangeDays?: number;
};

type AvailabilityAgentResponse = {
  durationMinutes: number;
  slots: Array<{ start: string; end: string; reason: string }>;
  clientContext?: {
    previousAppointmentAt?: string;
    nextAppointmentAt?: string;
    totalAppointments: number;
  };
};

type AppointmentLike = {
  date_time?: unknown;
  end_time?: unknown;
  operator_id?: unknown;
  operator_ids?: unknown;
  ownerOperatorId?: unknown;
  isPersonal?: unknown;
  custom_duration_minutes?: unknown;
};

const MINUTE_MS = 60_000;

export const availabilityAgent = onCall<AvailabilityAgentRequest>(
  { region: REGION },
  async (request): Promise<AvailabilityAgentResponse> => {
    await requireUserPermissions(request, ['AI', 'OPERATORE']);
    const uid = requireAuth(request);
    const data = asObject(request.data);

    const referenceDate = parseRequiredDate(data.referenceDate, 'referenceDate');
    const clientId = normalizeString(data.clientId);
    const treatmentIds = Array.isArray(data.treatmentIds)
      ? data.treatmentIds.map((item) => normalizeString(item)).filter(Boolean)
      : [];
    const overrideDuration = readOptionalIntegerInRange(
      data.overrideDurationMinutes,
      'overrideDurationMinutes',
      5,
      720,
      0,
    );
    const rangeDays = readOptionalIntegerInRange(data.rangeDays, 'rangeDays', 1, 90, 30);

    const appConfig = await getAppConfig();
    const durationMinutes =
      overrideDuration > 0
        ? overrideDuration
        : await computeDurationMinutes(
            treatmentIds,
            Number(appConfig.defaultAppointmentDurationMinutes ?? 60),
          );

    const dateStart = referenceDate;
    const dateEnd = new Date(referenceDate.getTime() + rangeDays * 24 * 60 * MINUTE_MS);

    const snapshot = await db
      .collection('appointments')
      .where('date_time', '>=', dateStart)
      .where('date_time', '<', dateEnd)
      .orderBy('date_time', 'asc')
      .get();

    const appointments = snapshot.docs
      .map((doc) => doc.data() as AppointmentLike)
      .map((dataItem) => normalizeAppointment(dataItem))
      .filter((item): item is { start: Date; end: Date; isPersonal: boolean; ownerOperatorId: string; operatorIds: string[] } => !!item)
      .filter((item) => {
        if (item.isPersonal) {
          return item.ownerOperatorId === uid;
        }
        if (!item.operatorIds.length) {
          return true;
        }
        return item.operatorIds.includes(uid);
      });

    const slotStepMinutes = Number(appConfig.appointmentSlotMinutes ?? 15);
    const minNoticeMinutes = Number(appConfig.availabilityMinNoticeMinutes ?? 30);
    const nowWithNotice = new Date(Date.now() + minNoticeMinutes * MINUTE_MS);

    const slots = buildSlots({
      dayStart: normalizeString(appConfig.dayStart) || '09:00',
      breakStart: normalizeString(appConfig.breakStart) || '13:00',
      breakEnd: normalizeString(appConfig.breakEnd) || '14:00',
      dayEnd: normalizeString(appConfig.dayEnd) || '19:00',
      workingDays: normalizeWorkingDays(appConfig.workingDays),
      slotStepMinutes: Math.max(5, slotStepMinutes || 15),
      durationMinutes,
      dateStart,
      dateEnd,
      nowWithNotice,
      appointments,
    }).slice(0, 12);

    const clientContext = clientId
      ? await buildClientContext(clientId, referenceDate)
      : undefined;

    return {
      durationMinutes,
      slots: slots.map((slot) => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        reason: 'Slot libero su agenda operatore',
      })),
      clientContext,
    };
  },
);

function asObject(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpsError('invalid-argument', 'Payload non valido.');
  }
  return input as Record<string, unknown>;
}

function normalizeString(value: unknown) {
  return String(value ?? '').trim();
}

function parseRequiredDate(value: unknown, key: string) {
  const next = new Date(normalizeString(value));
  if (Number.isNaN(next.getTime())) {
    throw new HttpsError('invalid-argument', `${key} non valido.`);
  }
  return next;
}

async function getAppConfig() {
  const snapshot = await db.collection('appConfig').doc('main').get();
  return (snapshot.data() ?? {}) as Record<string, unknown>;
}

async function computeDurationMinutes(treatmentIds: string[], fallback: number) {
  if (!treatmentIds.length) {
    return fallback;
  }

  const uniqueIds = [...new Set(treatmentIds)].slice(0, 30);
  const docs = await Promise.all(uniqueIds.map((id) => db.collection('treatments').doc(id).get()));
  const sum = docs.reduce((acc, doc) => acc + Number(doc.get('duration') ?? 0), 0);
  return sum > 0 ? sum : fallback;
}

function normalizeWorkingDays(raw: unknown) {
  if (!Array.isArray(raw)) return [1, 2, 3, 4, 5, 6];
  const values = raw
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);
  return values.length ? values : [1, 2, 3, 4, 5, 6];
}

function parseTimeToMinutes(value: string, fallback: number) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallback;
  return Math.max(0, Math.min(24 * 60 - 1, hours * 60 + minutes));
}

function toDate(base: Date, minutes: number) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, minutes, 0, 0);
}

function normalizeDate(value: unknown) {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const next = new Date(value);
    return Number.isNaN(next.getTime()) ? undefined : next;
  }
  if (typeof value === 'object' && value && 'toDate' in value) {
    const next = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(next.getTime()) ? undefined : next;
  }
  return undefined;
}

function normalizeAppointment(data: AppointmentLike) {
  const start = normalizeDate(data.date_time);
  if (!start) return undefined;

  const customDuration = Number(data.custom_duration_minutes ?? 0);
  const fallbackDuration = Number.isFinite(customDuration) && customDuration > 0 ? customDuration : 60;
  const end = normalizeDate(data.end_time) ?? new Date(start.getTime() + fallbackDuration * MINUTE_MS);
  const isPersonal = Boolean(data.isPersonal);
  const ownerOperatorId = normalizeString(data.ownerOperatorId);
  const operatorIds = [
    normalizeString(data.operator_id),
    ...(Array.isArray(data.operator_ids) ? data.operator_ids.map((value) => normalizeString(value)) : []),
  ].filter(Boolean);

  return { start, end, isPersonal, ownerOperatorId, operatorIds };
}

function buildSlots(args: {
  dayStart: string;
  breakStart: string;
  breakEnd: string;
  dayEnd: string;
  workingDays: number[];
  slotStepMinutes: number;
  durationMinutes: number;
  dateStart: Date;
  dateEnd: Date;
  nowWithNotice: Date;
  appointments: Array<{ start: Date; end: Date }>;
}) {
  const openMin = parseTimeToMinutes(args.dayStart, 9 * 60);
  const breakStartMin = parseTimeToMinutes(args.breakStart, 13 * 60);
  const breakEndMin = parseTimeToMinutes(args.breakEnd, 14 * 60);
  const closeMin = parseTimeToMinutes(args.dayEnd, 19 * 60);

  const windows = [
    { start: openMin, end: breakStartMin },
    { start: breakEndMin, end: closeMin },
  ].filter((windowItem) => windowItem.end > windowItem.start);

  const slots: Array<{ start: Date; end: Date }> = [];

  const startDay = new Date(
    args.dateStart.getFullYear(),
    args.dateStart.getMonth(),
    args.dateStart.getDate(),
    0,
    0,
    0,
    0,
  );
  const endDay = new Date(
    args.dateEnd.getFullYear(),
    args.dateEnd.getMonth(),
    args.dateEnd.getDate(),
    0,
    0,
    0,
    0,
  );

  for (
    let day = new Date(startDay);
    day.getTime() <= endDay.getTime();
    day = new Date(day.getTime() + 24 * 60 * MINUTE_MS)
  ) {
    if (!args.workingDays.includes(day.getDay())) continue;

    const busy = args.appointments
      .filter((item) => item.start.toDateString() === day.toDateString())
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    for (const windowPart of windows) {
      for (
        let minute = windowPart.start;
        minute + args.durationMinutes <= windowPart.end;
        minute += args.slotStepMinutes
      ) {
        const slotStart = toDate(day, minute);
        const slotEnd = new Date(slotStart.getTime() + args.durationMinutes * MINUTE_MS);
        if (slotStart < args.nowWithNotice) continue;
        const overlaps = busy.some(
          (item) => slotStart.getTime() < item.end.getTime() && slotEnd.getTime() > item.start.getTime(),
        );
        if (!overlaps) {
          slots.push({ start: slotStart, end: slotEnd });
        }
      }
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

async function buildClientContext(clientId: string, referenceDate: Date) {
  const normalizedClientId = normalizeString(clientId);
  if (!normalizedClientId) {
    return { totalAppointments: 0 };
  }

  const clientAppointmentsByClient = await db
    .collection('appointments')
    .where('client_id', '==', normalizedClientId)
    .get();

  let docs = clientAppointmentsByClient.docs;
  if (!docs.length) {
    const fallbackByUserId = await db
      .collection('appointments')
      .where('user_id', '==', normalizedClientId)
      .get();
    docs = fallbackByUserId.docs;
  }

  const appointmentDates = docs
    .map((doc) => normalizeDate(doc.get('date_time')))
    .filter((item): item is Date => !!item)
    .sort((a, b) => a.getTime() - b.getTime());

  const previous = [...appointmentDates].reverse().find((date) => date.getTime() < referenceDate.getTime());
  const next = appointmentDates.find((date) => date.getTime() > referenceDate.getTime());

  return {
    previousAppointmentAt: previous?.toISOString(),
    nextAppointmentAt: next?.toISOString(),
    totalAppointments: appointmentDates.length,
  };
}
