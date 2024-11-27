import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { UserDto } from 'src/modules/user/dtos';
import { PerformerDto } from 'src/modules/performer/dtos';

export class SubscriptionDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: string | ObjectId;

  @Expose()
  subscriptionType: string;

  @Expose()
  @Transform(({ obj }) => obj.userId)
  userId: string | ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.performerId)
  performerId: string | ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.subscriptionId)
  subscriptionId: string;

  @Expose()
  @Transform(({ obj }) => obj.transactionId)
  transactionId: string | ObjectId;

  @Expose()
  paymentGateway: string;

  @Expose()
  status: string;

  @Expose()
  meta: any;

  @Expose()
  startRecurringDate: Date;

  @Expose()
  nextRecurringDate: Date;

  @Expose()
  expiredAt: Date;

  @Expose()
  userInfo: Partial<UserDto>;

  @Expose()
  performerInfo: Partial<PerformerDto>;

  @Expose()
  blockedUser: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(SubscriptionDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  toResponse(includePrivateInfo = false) {
    const publicInfo = {
      _id: this._id,
      subscriptionType: this.subscriptionType,
      subscriptionId: this.subscriptionId,
      userId: this.userId,
      userInfo: this.userInfo,
      performerId: this.performerId,
      performerInfo: this.performerInfo,
      status: this.status,
      expiredAt: this.expiredAt,
      blockedUser: this.blockedUser,
      startRecurringDate: this.startRecurringDate,
      nextRecurringDate: this.nextRecurringDate,
      paymentGateway: this.paymentGateway,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };

    const privateInfo = {
      transactionId: this.transactionId,
      meta: this.meta
    };
    if (!includePrivateInfo) {
      return publicInfo;
    }

    return { ...publicInfo, ...privateInfo };
  }

  setUserInfo(user: UserDto | any) {
    if (!user) return;
    const dto = plainToInstance(UserDto, user);
    this.userInfo = dto;
  }

  setPerformerInfo(performer: PerformerDto) {
    if (!performer) return;

    const dto = plainToInstance(PerformerDto, performer);
    this.performerInfo = dto.toSearchResponse();
  }
}
