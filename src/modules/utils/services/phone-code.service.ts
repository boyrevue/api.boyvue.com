import { Injectable } from '@nestjs/common';
import { PHONE_CODE } from '../constants';

@Injectable()
export class PhoneCodeService {
  private phoneCodeList;

  public getList() {
    if (this.phoneCodeList) {
      return this.phoneCodeList;
    }

    this.phoneCodeList = PHONE_CODE.map((c) => ({
      name: c.name,
      dialCode: c.dialCode,
      code: `${c.code}_${c.dialCode}`
    }));
    return this.phoneCodeList;
  }
}
