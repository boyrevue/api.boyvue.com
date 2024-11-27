import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { PerformerDto } from 'src/modules/performer/dtos';
import { FileDto } from 'src/modules/file';
import { GalleryDto } from './gallery.dto';

export class PhotoDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.performerId)
  performerId: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.galleryId)
  galleryId: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.fileId)
  fileId: ObjectId;

  @Expose()
  photo: Record<string, any>;

  @Expose()
  type: string;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  status: string;

  @Expose()
  processing: boolean;

  @Expose()
  isSale: boolean;

  @Expose()
  isBought: boolean;

  @Expose()
  price: number;

  @Expose()
  performer: Partial<PerformerDto>;

  @Expose()
  gallery: Partial<GalleryDto>;

  @Expose()
  isGalleryCover: boolean;

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

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(PhotoDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  public setPhoto(file: FileDto, canView = false, jwToken = '') {
    if (!file) {
      this.photo = null;
      return;
    }

    const _view = canView || !this.isSale || this.isBought;
    const resp: Record<string, any> = {
      width: file.width,
      height: file.height,
      mimeType: file.mimeType,
      blurImage: file.getBlurImage()
    };
    if (_view) {
      const url = file.getUrl();
      resp.thumbnails = file.getThumbnails();
      // TODO - reactor url
      resp.url = jwToken ? `${url}?photoId=${this._id}&token=${jwToken}` : url || null;
    }
    this.photo = resp;
  }
}
