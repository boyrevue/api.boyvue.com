import { Expose, Transform, plainToInstance } from 'class-transformer';
import { ObjectId } from 'mongodb';

export class WalletPackageDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  ordering: number;

  @Expose()
  price: number;

  @Expose()
  token: number;

  @Expose()
  status: string;

  @Expose()
  url: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(WalletPackageDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  toResponse() {
    const publicInfo = {
      _id: this._id,
      name: this.name,
      description: this.description,
      ordering: this.ordering,
      price: this.price,
      token: this.token,
      url: this.url
    };

    return {
      ...publicInfo
    };
  }
}
