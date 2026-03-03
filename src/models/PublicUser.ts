import { _PublicUser, type _PublicUserData } from "cic-kit";

export type PublicUserData = _PublicUserData & { operatore?: boolean };

export class PublicUser extends _PublicUser {
  operatore: boolean;

  constructor(data: PublicUserData) {
    super(data);
    this.operatore = data.operatore ?? false;
  }

  override toData(): PublicUserData {
    return { ...super.toData(), operatore: this.operatore };
  }
}
