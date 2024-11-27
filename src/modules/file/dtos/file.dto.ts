import { ObjectId } from 'mongodb';
import { getConfig } from 'src/kernel';
import { isUrl } from 'src/kernel/helpers/string.helper';
import { Expose, Transform, plainToInstance } from 'class-transformer';

interface IRefItem {
  itemType: string;
  itemId: ObjectId | any;
}

export class FileDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  type: string; // video, podcast, file, etc...

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  mimeType: string;

  @Expose()
  server: string; // eg: local, aws, etc... we can create a helper to filter and get direct link

  @Expose()
  path: string; // path of key in local or server

  @Expose()
  absolutePath: string;

  @Expose()
  width: number; // for video, img

  @Expose()
  height: number; // for video, img

  @Expose()
  duration: number; // for video, podcast

  @Expose()
  size: number; // in byte

  @Expose()
  status: string;

  @Expose()
  encoding: string;

  @Expose()
  thumbnails: Record<string, any>[];

  @Expose()
  blurImagePath: string;

  @Expose()
  @Transform(({ obj }) => obj.refItems)
  refItems: IRefItem[];

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

    return plainToInstance(FileDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  public getPublicPath() {
    if (this.absolutePath) {
      return this.absolutePath.replace(getConfig('file').publicDir, '');
    }

    return this.path || '';
  }

  public getUrl(): string {
    if (!this.path) return '';
    if (isUrl(this.path)) return this.path;

    return new URL(
      this.path,
      getConfig('app').baseUrl
    ).href;
  }

  public getThumbnails(): string[] {
    if (!this.thumbnails || !this.thumbnails.length) {
      return [];
    }

    return this.thumbnails.map((t) => {
      if (isUrl(t.path)) return t.path;

      return new URL(
        t.path,
        getConfig('app').baseUrl
      ).href;
    });
  }

  public getBlurImage(): string {
    if (!this.blurImagePath) return '';
    if (isUrl(this.blurImagePath)) return this.blurImagePath;

    return new URL(
      this.blurImagePath,
      getConfig('app').baseUrl
    ).href;
  }

  static getPublicUrl(filePath: string): string {
    if (!filePath) return '';
    if (isUrl(filePath)) return filePath;
    return new URL(filePath, getConfig('app').baseUrl).href;
  }

  public isVideo() {
    return (this.mimeType || '').toLowerCase().includes('video');
  }

  public isImage() {
    return (this.mimeType || '').toLowerCase().includes('image');
  }

  public toResponse() {
    const data = { ...this };
    delete data.absolutePath;
    delete data.path;
    return data;
  }

  public toPublicResponse() {
    return {
      _id: this._id,
      name: this.name,
      type: this.type,
      mimeType: this.mimeType,
      url: this.getUrl(),
      thumbnails: this.getThumbnails(),
      blurImage: this.getBlurImage(),
      width: this.width,
      height: this.height,
      size: this.size,
      duration: this.duration,
      status: this.status
    };
  }
}
