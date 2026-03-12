type AppointmentVisibilityLike = {
  personalOwnerId?: unknown
  isPersonal?: unknown
  isPublic?: unknown
  operator_ids?: unknown
  user_id?: unknown
}

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

export function appointmentOperatorIds(appointment: AppointmentVisibilityLike) {
  if (!Array.isArray(appointment.operator_ids)) return []
  return appointment.operator_ids
    .map((item) => normalizeString(item))
    .filter(Boolean)
}

export function appointmentPersonalOwnerId(appointment: AppointmentVisibilityLike) {
  const explicitOwner = normalizeString(appointment.personalOwnerId)
  if (explicitOwner) return explicitOwner

  if (!appointment.isPersonal) return ''

  const operatorIds = appointmentOperatorIds(appointment)
  return normalizeString(operatorIds[0] ?? appointment.user_id)
}

export function isPersonalAppointment(appointment: AppointmentVisibilityLike) {
  return Boolean(appointmentPersonalOwnerId(appointment))
}

export function isAppointmentPublic(appointment: AppointmentVisibilityLike) {
  if (!isPersonalAppointment(appointment)) return true
  return Boolean(appointment.isPublic)
}

export function canReadAppointmentForUser(appointment: AppointmentVisibilityLike, currentUserId: unknown) {
  if (!isPersonalAppointment(appointment)) return true
  if (isAppointmentPublic(appointment)) return true
  const normalizedUserId = normalizeString(currentUserId)
  if (!normalizedUserId) return false
  return appointmentPersonalOwnerId(appointment) === normalizedUserId
}

