import { Expose, Transform, plainToInstance } from 'class-transformer';
import { ObjectId } from 'mongodb';

export class NotificationDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.userId)
  userId: ObjectId;

  @Expose()
  type: string;

  @Expose()
  action: string;

  @Expose()
  avatar: string;

  @Expose()
  title: string;

  @Expose()
  message: string;

  @Expose()
  thumbnail: string;

  @Expose()
  @Transform(({ obj }) => obj.refId)
  refId: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.reference)
  reference: any;

  @Expose()
  read: boolean;

  @Expose()
  readAt: Date;

  @Expose()
  @Transform(({ obj }) => obj.createdBy)
  createdBy: ObjectId;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  refItem?: any;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(NotificationDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }
}
