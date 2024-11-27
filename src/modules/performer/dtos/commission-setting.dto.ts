import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';

export class CommissionSettingDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.performerId)
  performerId: ObjectId | any;

  @Expose()
  monthlySubscriptionCommission: number;

  @Expose()
  yearlySubscriptionCommission: number;

  @Expose()
  videoSaleCommission: number;

  @Expose()
  productSaleCommission: number;

  @Expose()
  privateChatCommission: number;

  @Expose()
  groupChatCommission: number;

  @Expose()
  tokenTipCommission: number;

  @Expose()
  feedSaleCommission: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(CommissionSettingDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }
}
