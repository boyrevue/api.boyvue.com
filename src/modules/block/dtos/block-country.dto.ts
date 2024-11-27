import { Expose, Transform, plainToInstance } from 'class-transformer';
import { ObjectId } from 'mongoose';

export class BlockCountryDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  countryCode: string;

  @Expose()
  createdAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(BlockCountryDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }
}
