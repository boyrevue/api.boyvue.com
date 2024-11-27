import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';

export class PaymentGatewaySettingDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.performerId)
  performerId: ObjectId | any;

  @Expose()
  key: string;

  @Expose()
  value: Record<string, any>;

  @Expose()
  status: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(PaymentGatewaySettingDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }
}
