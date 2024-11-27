import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { UserDto } from 'src/modules/user/dtos';
import { PerformerDto } from 'src/modules/performer/dtos';

export class EarningDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.userId)
  userId: ObjectId;

  @Expose()
  userInfo?: Partial<UserDto>;

  @Expose()
  @Transform(({ obj }) => obj.transactionId)
  transactionId: ObjectId;

  @Expose()
  transactionInfo?: Record<string, any>;

  @Expose()
  @Transform(({ obj }) => obj.performerId)
  performerId: ObjectId;

  @Expose()
  performerInfo?: Partial<PerformerDto>;

  @Expose()
  order?: any;

  @Expose()
  sourceType: string;

  @Expose()
  grossPrice: number;

  @Expose()
  netPrice: number;

  @Expose()
  commission: number;

  @Expose()
  isPaid?: boolean;

  @Expose()
  transactionStatus?: string;

  @Expose()
  paymentMethod?: string;

  @Expose()
  paymentStatus?: string;

  @Expose()
  payoutStatus?: string;

  @Expose()
  paidAt?: Date;

  @Expose()
  createdAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(EarningDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  public setUserInfo(user: any) {
    if (!user) return;

    const dto = plainToInstance(UserDto, user);
    this.userInfo = dto.toResponse();
  }

  public setPerformerInfo(user: any) {
    if (!user) return;

    const dto = plainToInstance(PerformerDto, user);
    this.performerInfo = dto.toResponse();
  }
}

export interface IEarningStatResponse {
  totalGrossPrice: number;
  totalNetPrice: number;
  totalCommission: number;
  paidPrice: number;
}
