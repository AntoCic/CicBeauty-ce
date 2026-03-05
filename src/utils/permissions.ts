import { defaultUserPermission } from 'cic-kit'
import { Auth } from '../main'
import { UserPermission, type UserPermission as AppUserPermission } from '../enums/UserPermission'

type DefaultUserPermission = (typeof defaultUserPermission)[keyof typeof defaultUserPermission]

export type AppPermission = AppUserPermission | DefaultUserPermission
export type AppPermissionInput = AppPermission | AppPermission[]

export function hasOperatorAccess() {
  return (
    Auth.isSuperAdmin ||
    Auth.isAdmin ||
    (Auth?.user?.hasPermission(UserPermission.OPERATORE) ?? false)
  )
}

export function hasPermissionAccess(permission?: AppPermissionInput) {
  if (!permission) return true

  const permissions = Array.isArray(permission) ? permission : [permission]
  if (!permissions.length) return true

  const hasSinglePermission = (singlePermission: AppPermission) => {
    if (singlePermission === UserPermission.OPERATORE) {
      return hasOperatorAccess()
    }
    if (singlePermission === defaultUserPermission.ADMIN) {
      return Boolean(Auth.isAdmin || Auth.isSuperAdmin)
    }
    if (singlePermission === defaultUserPermission.SUPERADMIN) {
      return Boolean(Auth.isSuperAdmin)
    }

    return Auth?.user?.hasPermission(singlePermission) ?? false
  }

  return permissions.every(hasSinglePermission)
}

export function hasAiAndOperatorAccess() {
  return hasOperatorAccess() && hasPermissionAccess(UserPermission.AI)
}

export function hasBetaFeaturesAccess() {
  return hasPermissionAccess(defaultUserPermission.BETA_FEATURES)
}
