import { Expose, Transform, plainToInstance } from 'class-transformer';
import { ObjectId } from 'mongodb';

export class ForgotDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id?: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.authId)
  authId: ObjectId;

  @Expose()
  source: string;

  @Expose()
  @Transform(({ obj }) => obj.sourceId)
  sourceId: ObjectId;

  @Expose()
  token: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(ForgotDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }
}
