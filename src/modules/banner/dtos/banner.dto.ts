import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { FileDto } from 'src/modules/file';

export class BannerDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.fileId)
  fileId: ObjectId;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  link: string;

  @Expose()
  status: string;

  @Expose()
  position: string;

  @Expose()
  photo?: any;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(BannerDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  setPhoto(file: FileDto) {
    this.photo = {
      thumbnails: file.getThumbnails(),
      url: file.getUrl(),
      width: file.width,
      height: file.height,
      mimeType: file.mimeType
    };
  }
}
