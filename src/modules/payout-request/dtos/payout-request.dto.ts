import { Expose, Transform, plainToInstance } from 'class-transformer';
import { ObjectId } from 'mongodb';
import { PerformerDto } from 'src/modules/performer/dtos';
import { UserDto } from 'src/modules/user/dtos';

export class PayoutRequestDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  source: string;

  @Expose()
  @Transform(({ obj }) => obj.sourceId)
  sourceId: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.sourceInfo)
  sourceInfo: Record<string, any>;

  @Expose()
  @Transform(({ obj }) => obj.paymentAccountInfo)
  paymentAccountInfo: Record<string, any>;

  @Expose()
  paymentAccountType: string;

  @Expose()
  requestNote: string;

  @Expose()
  adminNote?: string;

  @Expose()
  status: string;

  @Expose()
  requestedPrice: number;

  @Expose()
  fromDate: Date;

  @Expose()
  toDate: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(PayoutRequestDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  public setSourceInfo(user: UserDto | PerformerDto) {
    if (!user) this.sourceInfo = null;
    else this.sourceInfo = user.toSearchResponse();
  }
}
