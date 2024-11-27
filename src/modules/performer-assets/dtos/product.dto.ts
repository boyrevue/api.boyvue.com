import { Expose, Transform, plainToInstance } from 'class-transformer';
import { ObjectId } from 'mongodb';
import { CategoryDto } from 'src/modules/category/dtos';
import { FileDto } from 'src/modules/file';
import { PerformerDto } from 'src/modules/performer/dtos';

export class ProductDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.performerId)
  performerId: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.digitalFileId)
  digitalFileId: ObjectId;

  digitalFile: any;

  @Expose()
  @Transform(({ obj }) => obj.imageIds)
  imageIds: ObjectId[];

  @Expose()
  images: Record<string, any>[];

  @Expose()
  @Transform(({ obj }) => obj.categoryIds)
  categoryIds: ObjectId[];

  @Expose()
  categories: Partial<CategoryDto>[];

  @Expose()
  type: string;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  description: string;

  @Expose()
  status: string;

  @Expose()
  price: number;

  @Expose()
  stock: number;

  @Expose()
  performer: Partial<PerformerDto>;

  @Expose()
  @Transform(({ obj }) => obj.createdBy)
  createdBy: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.updatedBy)
  updatedBy: ObjectId;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  stats: {
    likes: number;
    comments: number;
    views: number;
  };

  @Expose()
  isBought: boolean;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(ProductDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  toPublic() {
    return {
      _id: this._id,
      performerId: this.performerId,
      digitalFileId: this.digitalFileId,
      digitalFile: this.digitalFile,
      imageIds: this.imageIds,
      images: this.images,
      categoryIds: this.categoryIds,
      categories: this.categories,
      type: this.type,
      name: this.name,
      slug: this.slug,
      description: this.description,
      status: this.status,
      price: this.price,
      stock: this.stock,
      performer: this.performer,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      stats: this.stats,
      isBought: this.isBought
    };
  }

  public setPerformer(performer: PerformerDto) {
    if (!performer) return;
    this.performer = performer.toSearchResponse();
  }

  public setIsBought(value: boolean) {
    this.isBought = value;
  }

  public setImages(images: Array<FileDto>) {
    if (!images?.length) {
      this.images = [];
      return;
    }
    this.images = images.map((f) => f.toPublicResponse());
  }
}
