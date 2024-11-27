import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { ConfigService } from 'nestjs-config';
import {
  StringHelper,
  QueueEventService,
  QueueEvent,
  getConfig,
  EntityNotFoundException
} from 'src/kernel';
import {
  writeFileSync, unlinkSync, existsSync, createReadStream
} from 'fs';
import { join } from 'path';
import * as jwt from 'jsonwebtoken';
import { toPosixPath } from 'src/kernel/helpers/string.helper';
import { InjectModel } from '@nestjs/mongoose';
import { IMulterUploadedFile } from '../lib/multer/multer.utils';
import { FileDto } from '../dtos';
import { IFileUploadOptions } from '../lib';
import { ImageService } from './image.service';
import { FileVideoService } from './video.service';
import { File } from '../schemas';

const VIDEO_QUEUE_CHANNEL = 'VIDEO_PROCESS';
const PHOTO_QUEUE_CHANNEL = 'PHOTO_PROCESS';

export const FILE_EVENT = {
  VIDEO_PROCESSED: 'VIDEO_PROCESSED',
  PHOTO_PROCESSED: 'PHOTO_PROCESSED'
};

@Injectable()
export class FileService {
  constructor(
    @InjectModel(File.name) private readonly FileModel: Model<File>,
    private readonly config: ConfigService,
    private readonly imageService: ImageService,
    private readonly videoService: FileVideoService,
    private readonly queueEventService: QueueEventService
  ) {
    this.queueEventService.subscribe(
      VIDEO_QUEUE_CHANNEL,
      'PROCESS_VIDEO',
      this._processVideo.bind(this)
    );

    this.queueEventService.subscribe(
      PHOTO_QUEUE_CHANNEL,
      'PROCESS_PHOTO',
      this._processPhoto.bind(this)
    );
  }

  public async findById(id: string | ObjectId | any): Promise<FileDto> {
    const model = await this.FileModel.findById(id);
    return FileDto.fromModel(model);
  }

  public async findByIds(ids: string[] | ObjectId[] | any[]): Promise<FileDto[]> {
    const items = await this.FileModel.find({
      _id: {
        $in: ids
      }
    });

    return items.map((i) => FileDto.fromModel(i));
  }

  public async countByRefType(itemType: string): Promise<any> {
    const count = await this.FileModel.countDocuments({
      refItems: { $elemMatch: { itemType } }
    });
    return count;
  }

  public async findByRefType(itemType: string, limit: number, offset: number): Promise<any> {
    const items = await this.FileModel.find({
      refItems: { $elemMatch: { itemType } }
    }).limit(limit).skip(offset * limit);
    return items.map((item) => FileDto.fromModel(item));
  }

  public async createFromMulter(
    type: string,
    multerData: IMulterUploadedFile,
    options?: IFileUploadOptions
  ): Promise<FileDto> {
    // eslint-disable-next-line no-param-reassign
    options = options || {};
    const publicDir = this.config.get('file.publicDir');
    const photoDir = this.config.get('file.photoDir');
    const thumbnails = [];
    let blurImagePath = '';
    // replace new photo without exif, ignore video
    if (multerData.mimetype.includes('image')) {
      const buffer = await this.imageService.replaceWithoutExif(multerData.path);
      let thumbBuffer: any = null;
      let blurBuffer: any = null;
      if (options.generateThumbnail) {
        thumbBuffer = await this.imageService.createThumbnail(
          multerData.path,
          options?.thumbnailSize || { width: 350 }
        ) as Buffer;
        const thumbName = `${StringHelper.randomString(5)}_thumb${StringHelper.getExt(multerData.path)}`;
        !options?.replaceByThumbnail && writeFileSync(join(photoDir, thumbName), thumbBuffer);
        !options?.replaceByThumbnail && thumbnails.push({
          thumbnailSize: options.thumbnailSize,
          path: toPosixPath(join(photoDir, thumbName).replace(publicDir, '')),
          absolutePath: join(photoDir, thumbName)
        });

        // generate blur image
        blurBuffer = await this.imageService.blur(
          multerData.path
        ) as Buffer;
      }
      unlinkSync(multerData.path);
      writeFileSync(multerData.path, options?.replaceByThumbnail && thumbBuffer ? thumbBuffer : buffer);
      if (blurBuffer) {
        blurImagePath = toPosixPath(join(photoDir, `${StringHelper.randomString(5)}_blur_${StringHelper.getExt(multerData.path)}`));
        writeFileSync(blurImagePath, blurBuffer);
      }
    }

    const data = {
      type,
      name: multerData.filename,
      description: '', // TODO - get from options
      mimeType: multerData.mimetype,
      server: options.server || 'local',
      // todo - get path from public
      path: multerData.path.replace(publicDir, ''),
      absolutePath: multerData.path,
      blurImagePath: blurImagePath.replace(publicDir, ''),
      // TODO - update file size
      size: multerData.size,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: options.uploader ? options.uploader._id : null,
      updatedBy: options.uploader ? options.uploader._id : null
    };

    const file = await this.FileModel.create(data);
    // TODO - check option and process
    // eg create thumbnail, video converting, etc...
    return FileDto.fromModel(file);
  }

  public async addRef(
    fileId: string | ObjectId,
    ref: {
      itemId: ObjectId;
      itemType: string;
    }
  ) {
    return this.FileModel.updateOne(
      { _id: fileId },
      {
        $addToSet: {
          refItems: ref
        }
      }
    );
  }

  private async removePhysicalFile(file) {
    const filePaths = [
      {
        absolutePath: file.absolutePath,
        path: file.path
      },
      {
        absolutePath: file.blurImagePath,
        path: file.blurImagePath
      }
    ].concat(file.thumbnails || []);

    filePaths.forEach((fp) => {
      if (existsSync(fp.absolutePath)) {
        unlinkSync(fp.absolutePath);
      } else {
        const publicDir = this.config.get('file.publicDir');
        if (existsSync(fp.path)) {
          const filePublic = join(publicDir, fp.path);
          existsSync(filePublic) && unlinkSync(filePublic);
        }
      }
    });
  }

  public async remove(fileId: string | ObjectId | any) {
    const file = await this.FileModel.findOne({ _id: fileId });
    if (!file) {
      return false;
    }

    await file.deleteOne();
    await this.removePhysicalFile(file);
    // TODO - fire event
    return true;
  }

  public async removeIfNotHaveRef(fileId: string | ObjectId) {
    const file = await this.FileModel.findOne({ _id: fileId });
    if (!file) {
      return false;
    }

    if (file.refItems && !file.refItems.length) {
      return false;
    }

    await file.deleteOne();

    await this.removePhysicalFile(file);

    // TODO - fire event
    return true;
  }

  // TODO - fix here, currently we just support local server, need a better solution if scale?
  /**
   * generate mp4 video & thumbnail
   * @param fileId
   * @param options
   */
  public async queueProcessVideo(
    fileId: string | ObjectId | any,
    options?: {
      meta: Record<string, any>;
      publishChannel: string;
    }
  ) {
    // add queue and convert file to mp4 and generate thumbnail
    const file = await this.FileModel.findOne({ _id: fileId });
    if (!file || file.status === 'processing') {
      return false;
    }
    await this.queueEventService.publish(
      new QueueEvent({
        channel: VIDEO_QUEUE_CHANNEL,
        eventName: 'processVideo',
        data: {
          file: FileDto.fromModel(file),
          options
        }
      })
    );
    return true;
  }

  private async _processVideo(event: QueueEvent) {
    if (event.eventName !== 'processVideo') {
      return;
    }
    const fileData = event.data.file as FileDto;
    const options = event.data.options || {};
    try {
      await this.FileModel.updateOne(
        { _id: fileData._id },
        {
          $set: {
            status: 'processing'
          }
        }
      );

      // get thumb of the file, then convert to mp4
      const publicDir = this.config.get('file.publicDir');
      const videoDir = this.config.get('file.videoDir');
      // eslint-disable-next-line no-nested-ternary
      const videoPath = existsSync(fileData.absolutePath)
        ? fileData.absolutePath
        : existsSync(join(publicDir, fileData.path))
          ? join(publicDir, fileData.path)
          : null;

      if (!videoPath) {
        // eslint-disable-next-line no-throw-literal
        throw 'No file file!';
      }

      // convert to mp4 if it is not support html5
      const isSupportHtml5 = await this.videoService.isSupportHtml5(videoPath);
      let deleteOriginalFile = false;
      let respVideo = {
        toPath: videoPath
      };
      if (!isSupportHtml5) {
        deleteOriginalFile = true;
        respVideo = await this.videoService.convert2Mp4(videoPath);
      }
      // delete old video and replace with new one
      const newAbsolutePath = respVideo.toPath;
      const newPath = respVideo.toPath.replace(publicDir, '');
      const meta = await this.videoService.getMetaData(videoPath);
      const videoMeta = meta.streams.find((s) => s.codec_type === 'video');
      const { width, height } = videoMeta || {};
      const respThumb = await this.videoService.createThumbs(videoPath, {
        toFolder: videoDir,
        size: options?.size || '350x?', // thumnail dimension
        count: options?.count || 3 // number of thumbnails-screenshots
      });
      const thumbnails = respThumb.map((name) => ({
        absolutePath: join(videoDir, name),
        path: join(videoDir, name).replace(publicDir, '')
      }));

      // generate blur image
      let blurImagePath;
      if (thumbnails.length) {
        const blurBuffer = await this.imageService.blur(thumbnails[0].absolutePath);
        const photoDir = this.config.get('file.photoDir');
        blurImagePath = join(photoDir, `${StringHelper.randomString(5)}_blur_${StringHelper.getExt(thumbnails[0].absolutePath)}`);
        writeFileSync(blurImagePath, blurBuffer);
      }

      if (deleteOriginalFile && existsSync(videoPath)) unlinkSync(videoPath);
      await this.FileModel.updateOne(
        { _id: fileData._id },
        {
          $set: {
            status: 'finished',
            absolutePath: newAbsolutePath,
            path: toPosixPath(newPath),
            thumbnails,
            blurImagePath: toPosixPath(blurImagePath.replace(publicDir, '')),
            duration: parseInt(meta.format.duration, 10),
            width,
            height
          }
        }
      );
    } catch (e) {
      const error = await e;
      await this.FileModel.updateOne(
        { _id: fileData._id },
        {
          $set: {
            status: 'error',
            error: error?.stack || e
          }
        }
      );
    } finally {
      // TODO - fire event to subscriber
      if (options.publishChannel) {
        await this.queueEventService.publish(
          new QueueEvent({
            channel: options.publishChannel,
            eventName: FILE_EVENT.VIDEO_PROCESSED,
            data: {
              meta: options.meta,
              fileId: fileData._id
            }
          })
        );
      }
    }
  }

  /**
   * process to create photo thumbnails
   * @param fileId file item
   * @param options
   */
  public async queueProcessPhoto(
    fileId: string | ObjectId,
    options?: {
      meta?: Record<string, any>;
      publishChannel?: string;
      thumbnailSize?: {
        width?: number;
        height?: number;
      };
    }
  ) {
    // add queue and convert file to mp4 and generate thumbnail
    const file = await this.FileModel.findOne({ _id: fileId });
    if (!file || file.status === 'processing') {
      return false;
    }
    await this.queueEventService.publish(
      new QueueEvent({
        channel: PHOTO_QUEUE_CHANNEL,
        eventName: 'processPhoto',
        data: {
          file: FileDto.fromModel(file),
          options
        }
      })
    );
    return true;
  }

  private async _processPhoto(event: QueueEvent) {
    if (event.eventName !== 'processPhoto') {
      return;
    }
    const fileData = event.data.file as FileDto;
    const options = event.data.options || {};
    try {
      await this.FileModel.updateOne(
        { _id: fileData._id },
        {
          $set: {
            status: 'processing'
          }
        }
      );

      // get thumb of the file, then convert to mp4
      const publicDir = this.config.get('file.publicDir');
      const photoDir = this.config.get('file.photoDir');
      // eslint-disable-next-line no-nested-ternary
      const photoPath = existsSync(fileData.absolutePath)
        ? fileData.absolutePath
        : existsSync(join(publicDir, fileData.path))
          ? join(publicDir, fileData.path)
          : null;

      if (!photoPath) {
        // eslint-disable-next-line no-throw-literal
        throw 'No file!';
      }

      const meta = await this.imageService.getMetaData(photoPath);
      const buffer = await this.imageService.createThumbnail(
        photoPath,
        options.thumbnailSize || {
          width: 350,
          height: null
        }
      ) as Buffer;

      // store to a file
      const thumbName = `${StringHelper.randomString(5)}_thumb${StringHelper.getExt(photoPath)}`;
      writeFileSync(join(photoDir, thumbName), buffer);

      // create blury image
      const blurBuffer = await this.imageService.blur(buffer as Buffer);
      const blurImagePath = join(photoDir, `${StringHelper.randomString(5)}_blur_${StringHelper.getExt(thumbName)}`);
      writeFileSync(blurImagePath, blurBuffer);

      await this.FileModel.updateOne(
        { _id: fileData._id },
        {
          $set: {
            status: 'finished',
            width: meta.width,
            height: meta.height,
            thumbnails: [
              {
                path: toPosixPath(join(photoDir, thumbName).replace(publicDir, '') as string),
                absolutePath: join(photoDir, thumbName)
              }
            ],
            blurImagePath: toPosixPath(blurImagePath.replace(publicDir, ''))
          }
        }
      );
    } catch (e) {
      const error = await e;
      await this.FileModel.updateOne(
        { _id: fileData._id },
        {
          $set: {
            status: 'error',
            error: error?.stack || error
          }
        }
      );
    } finally {
      // fire event to subscriber
      if (options.publishChannel) {
        await this.queueEventService.publish(
          new QueueEvent({
            channel: options.publishChannel,
            eventName: FILE_EVENT.PHOTO_PROCESSED,
            data: {
              meta: options.meta,
              fileId: fileData._id
            }
          })
        );
      }
    }
  }

  /**
   * just generate key for
   */
  private generateJwt(fileId: string | ObjectId) {
    // 3h
    const expiresIn = 60 * 60 * 3;
    return jwt.sign(
      {
        fileId
      },
      process.env.TOKEN_SECRET,
      {
        expiresIn
      }
    );
  }

  /**
   * generate download file url with expired time check
   * @param fileId
   * @param param1
   */
  public async generateDownloadLink(fileId: string | ObjectId) {
    const newUrl = new URL('files/download', getConfig('app').baseUrl);
    newUrl.searchParams.append('key', this.generateJwt(fileId));
    return newUrl.href;
  }

  public async getStreamToDownload(key: string) {
    try {
      const decoded = jwt.verify(key, process.env.TOKEN_SECRET);
      const file = await this.FileModel.findById(decoded.fileId);
      if (!file) throw new EntityNotFoundException();
      let filePath;
      const publicDir = this.config.get('file.publicDir');
      if (existsSync(file.absolutePath)) {
        filePath = file.absolutePath;
      } else if (existsSync(join(publicDir, file.path))) {
        filePath = join(publicDir, file.path);
      } else {
        throw new EntityNotFoundException();
      }

      return {
        file,
        stream: createReadStream(filePath)
      };
    } catch (e) {
      throw new EntityNotFoundException();
    }
  }
}
