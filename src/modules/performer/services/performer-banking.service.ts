import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { BankingSetting } from '../schemas';
import { BankingSettingDto } from '../dtos';
import { BankingSettingPayload } from '../payloads';

@Injectable()
export class PerformerBankingService {
  constructor(
    @InjectModel(BankingSetting.name) private readonly BankingSettingModel: Model<BankingSetting>
  ) { }

  async findByPerformerId(performerId: string | ObjectId): Promise<BankingSettingDto> {
    const banking = await this.BankingSettingModel.findOne({ performerId });
    return BankingSettingDto.fromModel(banking);
  }

  async createOrUpdateForPerformer(performerId: string | ObjectId | any, payload: BankingSettingPayload) {
    let item = await this.BankingSettingModel.findOne({ performerId });
    if (!item) {
      item = new this.BankingSettingModel(payload);
    }
    item.performerId = performerId;
    item.firstName = payload.firstName;
    item.lastName = payload.lastName;
    item.SSN = payload.SSN;
    item.bankName = payload.bankName;
    item.bankAccount = payload.bankAccount;
    item.bankRouting = payload.bankRouting;
    item.bankSwiftCode = payload.bankSwiftCode;
    item.address = payload.address;
    item.city = payload.city;
    item.state = payload.state;
    item.country = payload.country;
    await item.save();

    return BankingSettingDto.fromModel(item);
  }
}
