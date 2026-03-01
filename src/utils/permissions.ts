import { defaultUserPermission } from 'cic-kit'
import { Auth } from '../main'
import { UserPermission } from '../enums/UserPermission'

export function hasOperatorAccess() {
  return (
    Auth.isSuperAdmin ||
    Auth.isAdmin ||
    (Auth?.user?.hasPermission(UserPermission.OPERATORE) ?? false)
  )
}

export function hasAiAndOperatorAccess() {
  return hasOperatorAccess() && (Auth?.user?.hasPermission(UserPermission.AI) ?? false)
}

export function hasBetaFeaturesAccess() {
  return Auth?.user?.hasPermission(defaultUserPermission.BETA_FEATURES) ?? false
}
