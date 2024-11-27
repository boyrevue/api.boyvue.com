import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';

export class PerformerBlockCountryDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.sourceId)
  sourceId: ObjectId;

  @Expose()
  source: string;

  @Expose()
  countryCodes: string[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(PerformerBlockCountryDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }
}
