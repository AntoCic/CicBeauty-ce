type TimestampLike = {
  toDate?: () => Date
  seconds?: number
  nanoseconds?: number
}

export function asDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const next = new Date(value)
    return Number.isNaN(next.getTime()) ? undefined : next
  }

  if (value && typeof value === 'object') {
    const timestampLike = value as TimestampLike
    if (typeof timestampLike.toDate === 'function') {
      const next = timestampLike.toDate()
      return Number.isNaN(next.getTime()) ? undefined : next
    }
    if (typeof timestampLike.seconds === 'number') {
      const millis =
        timestampLike.seconds * 1000 +
        Math.floor((timestampLike.nanoseconds ?? 0) / 1_000_000)
      const next = new Date(millis)
      return Number.isNaN(next.getTime()) ? undefined : next
    }
  }

  return undefined
}

export function asIso(value: unknown) {
  const date = asDate(value)
  return date ? date.toISOString() : undefined
}
