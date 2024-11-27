import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { UserDto } from 'src/modules/user/dtos';

export class ReactionDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  source: string;

  @Expose()
  action: string;

  @Expose()
  @Transform(({ obj }) => obj.objectId)
  objectId: ObjectId;

  @Expose()
  objectType: string;

  @Expose()
  @Transform(({ obj }) => obj.createdBy)
  createdBy: string | ObjectId;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  creator: Partial<UserDto>;

  @Expose()
  objectInfo: Record<string, any>;

  @Expose()
  isSubscribed: boolean;

  @Expose()
  isBought: boolean;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(ReactionDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }
}
