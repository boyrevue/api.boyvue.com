import { Expose, Transform, plainToInstance } from 'class-transformer';
import { ObjectId } from 'mongoose';

export class CategoryDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  group: string;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  description: string;

  @Expose()
  status: string;

  @Expose()
  ordering: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(CategoryDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  public toResponse(options?: Record<string, any>) {
    const {
      minify = true
    } = options || {};

    if (minify) {
      return {
        _id: this._id,
        name: this.name,
        slug: this.slug,
        ordering: this.ordering
      };
    }

    return {
      _id: this._id,
      name: this.name,
      slug: this.slug,
      ordering: this.ordering,
      status: this.status
    };
  }
}
