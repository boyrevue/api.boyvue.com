import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';

export class CouponDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  code: string;

  @Expose()
  value: number;

  @Expose()
  numberOfUses: number;

  @Expose()
  expiredDate: string | Date;

  @Expose()
  status: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(CouponDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  toResponse(includePrivateInfo = false) {
    const publicInfo = {
      _id: this._id,
      code: this.code,
      value: this.value
    };
    const privateInfo = {
      name: this.name,
      expiredDate: this.expiredDate,
      status: this.status,
      numberOfUses: this.numberOfUses,
      updatedAt: this.updatedAt,
      createdAt: this.createdAt
    };
    if (!includePrivateInfo) {
      return publicInfo;
    }
    return {
      ...publicInfo,
      ...privateInfo
    };
  }
}
