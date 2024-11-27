import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';

export class BankingSettingDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.performerId)
  performerId: ObjectId | any;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  SSN: string;

  @Expose()
  bankName: string;

  @Expose()
  bankAccount: string;

  @Expose()
  bankRouting: string;

  @Expose()
  bankSwiftCode: string;

  @Expose()
  address: string;

  @Expose()
  city: string;

  @Expose()
  state: string;

  @Expose()
  country: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(BankingSettingDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }
}
