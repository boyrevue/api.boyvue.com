import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { UserDto } from 'src/modules/user/dtos';

export class CommentDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  objectType: string;

  @Expose()
  @Transform(({ obj }) => obj.objectId)
  objectId: ObjectId;

  @Expose()
  content: string;

  @Expose()
  @Transform(({ obj }) => obj.createdBy)
  createdBy: ObjectId;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  creator?: Partial<UserDto>;

  @Expose()
  isLiked?: boolean;

  @Expose()
  totalReply?: number;

  @Expose()
  totalLike?: number;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(CommentDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  setCreator(user: UserDto) {
    if (!user) return;

    this.creator = user.toResponse();
  }

  setIsLiked(liked: boolean) {
    this.isLiked = liked;
  }
}
