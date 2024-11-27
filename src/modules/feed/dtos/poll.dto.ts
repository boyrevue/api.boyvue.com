import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';

export class PollDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId | string;

  @Expose()
  @Transform(({ obj }) => obj.createdBy)
  createdBy: ObjectId | string;

  @Expose()
  totalVote: number;

  @Expose()
  expiredAt: Date;

  @Expose()
  description: string;

  @Expose()
  @Transform(({ obj }) => obj.refId)
  refId: ObjectId;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(PollDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  public toPublicList() {
    return {
      _id: this._id,
      totalVote: this.totalVote,
      description: this.description,
      refId: this.refId,
      expiredAt: this.expiredAt,
      createdAt: this.createdAt
    };
  }
}
