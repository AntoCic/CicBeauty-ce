import { _CurrentUser, type _CurrentUserData, defaultUserPermission } from "cic-kit";
import { UserPermission } from "../enums/UserPermission";
import { normalizePublicUserKeys, normalizeUserColor } from "../constants/userProfile";

type CurrentUserData = _CurrentUserData & {
  operatore?: boolean;
  color?: string;
  publicKeys?: string[];
};

export class CurrentUser extends _CurrentUser {
  operatore: boolean;
  color: string;

  constructor(data: CurrentUserData) {
    super(data);
    this.operatore = data.operatore ?? false;
    this.color = normalizeUserColor(data.color);
    this.publicKeys = normalizePublicUserKeys(data.publicKeys) as typeof this.publicKeys;
  }

  override hasPermission(permission: string | string[]): boolean {
    if (Array.isArray(permission)) {
      return permission.every((singlePermission) => this.hasPermission(singlePermission));
    }

    if (super.hasPermission(permission)) {
      return true;
    }

    if (permission === defaultUserPermission.ADMIN) {
      return super.hasPermission(defaultUserPermission.SUPERADMIN);
    }

    if (permission === UserPermission.OPERATORE) {
      return (
        super.hasPermission(defaultUserPermission.SUPERADMIN) ||
        super.hasPermission(defaultUserPermission.ADMIN)
      );
    }

    return false;
  }

  override toData(): CurrentUserData {
    return {
      ...super.toData(),
      operatore: this.operatore,
      color: this.color,
      publicKeys: normalizePublicUserKeys(this.publicKeys) as string[],
    };
  }
}
