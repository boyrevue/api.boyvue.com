import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { PerformerDto } from 'src/modules/performer/dtos';
import { FileDto } from 'src/modules/file';

export class GalleryDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.performerId)
  performerId: ObjectId;

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
  processing: boolean;

  @Expose()
  @Transform(({ obj }) => obj.coverPhotoId)
  coverPhotoId: ObjectId;

  @Expose()
  price: number;

  @Expose()
  coverPhoto: Record<string, any>;

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
  isSale: boolean;

  @Expose()
  isLiked: boolean;

  @Expose()
  isSubscribed: boolean;

  @Expose()
  isBought: boolean;

  @Expose()
  numOfItems: number;

  @Expose()
  stats: {
    likes: number;
    favourites: number;
    comments: number;
    views: number;
  };

  @Expose()
  tags: string[];

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(GalleryDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  public setPerformer(performer: PerformerDto) {
    if (!performer) return;
    this.performer = performer.toSearchResponse();
  }

  public setCoverPhoto(file: FileDto) {
    if (!file) return;
    this.coverPhoto = file.toPublicResponse();
  }
}
