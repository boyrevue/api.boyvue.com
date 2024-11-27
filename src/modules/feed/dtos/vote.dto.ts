import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';

export class VoteDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId | string;

  @Expose()
  @Transform(({ obj }) => obj.fromSourceId)
  fromSourceId: ObjectId | string;

  @Expose()
  fromSource: string;

  @Expose()
  @Transform(({ obj }) => obj.targetId)
  targetId: ObjectId | string;

  @Expose()
  targetSource: string;

  @Expose()
  @Transform(({ obj }) => obj.refId)
  refId: ObjectId | string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(VoteDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }
}
