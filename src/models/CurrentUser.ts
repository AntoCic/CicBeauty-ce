import { _CurrentUser, type _CurrentUserData } from "cic-kit";

type CurrentUserData = _CurrentUserData & { operatore: boolean };

export class CurrentUser extends _CurrentUser {
  operatore: boolean;

  constructor(data: CurrentUserData) {
    super(data);
    this.operatore = data.operatore ?? false;
  }

  override toData(): CurrentUserData {
    return { ...super.toData(), operatore: this.operatore };
  }
}