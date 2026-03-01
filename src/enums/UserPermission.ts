export const UserPermission = {
  AI: 'AI',
  AI_BETA_FEATURES: 'AI_BETA_FEATURES',
  OPERATORE: 'OPERATORE',
} as const

// Type union derivato dalle chiavi dell'oggetto
export type UserPermission = typeof UserPermission[keyof typeof UserPermission]

// Type guard per sanificare valori letti dal DB
export const isPermission = (x: unknown): x is UserPermission =>
  Object.values(UserPermission).includes(x as UserPermission)
