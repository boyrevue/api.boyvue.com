import { Expose, Transform, plainToInstance } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { UserDto } from 'src/modules/user/dtos';

export class PerformerBlockUserDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.sourceId)
  sourceId: ObjectId;

  @Expose()
  source: string;

  @Expose()
  @Transform(({ obj }) => obj.targetId)
  targetId: ObjectId;

  @Expose()
  target: string;

  @Expose()
  reason: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  targetInfo: Partial<UserDto>;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(PerformerBlockUserDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  public setTargetInfo(user: UserDto) {
    // set public info
    this.targetInfo = user.toResponse();
  }
}
