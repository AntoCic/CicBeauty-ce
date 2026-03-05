import { _CurrentUser, type _CurrentUserData, defaultUserPermission } from "cic-kit";
import { UserPermission } from "../enums/UserPermission";

type CurrentUserData = _CurrentUserData & { operatore: boolean };

export class CurrentUser extends _CurrentUser {
  operatore: boolean;

  constructor(data: CurrentUserData) {
    super(data);
    this.operatore = data.operatore ?? false;
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
    return { ...super.toData(), operatore: this.operatore };
  }
}
