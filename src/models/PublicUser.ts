import { _PublicUser, type _PublicUserData } from "cic-kit";
import { normalizeUserColor } from "../constants/userProfile";

export type PublicUserData = _PublicUserData & { operatore?: boolean; color?: string };

export class PublicUser extends _PublicUser {
  operatore: boolean;
  color: string;

  constructor(data: PublicUserData) {
    super(data);
    this.operatore = data.operatore ?? false;
    this.color = normalizeUserColor(data.color);
  }

  override toData(): PublicUserData {
    return { ...super.toData(), operatore: this.operatore, color: this.color };
  }
}
