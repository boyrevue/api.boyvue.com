import {
  Injectable, Inject, forwardRef, HttpException
} from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import {
  QueueEventService, QueueEvent, EntityNotFoundException, ForbiddenException
} from 'src/kernel';
import { FileDto } from 'src/modules/file';
import { FileService, FILE_EVENT } from 'src/modules/file/services';
import { merge } from 'lodash';
import { PerformerService } from 'src/modules/performer/services';
import { EVENT } from 'src/kernel/constants';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import { REF_TYPE } from 'src/modules/file/constants';
import { UserDto } from 'src/modules/user/dtos';
import { CheckPaymentService } from 'src/modules/payment/services';
import { InjectModel } from '@nestjs/mongoose';
import { PHOTO_STATUS } from '../constants';
import { PhotoDto } from '../dtos';
import { PhotoCreatePayload, PhotoUpdatePayload } from '../payloads';
import { GalleryService } from './gallery.service';
import { Photo } from '../schemas';

export const PERFORMER_COUNT_PHOTO_CHANNEL = 'PERFORMER_COUNT_PHOTO_CHANNEL';
const PHOTO_CONVERT_CHANNEL = 'PHOTO_CONVERT_CHANNEL';
const FILE_PROCESSED_TOPIC = 'FILE_PROCESSED';

@Injectable()
export class PhotoService {
  constructor(
    @InjectModel(Photo.name) private readonly PhotoModel: Model<Photo>,

    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => GalleryService))
    private readonly galleryService: GalleryService,
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => CheckPaymentService))
    private readonly checkPaymentService: CheckPaymentService,
    private readonly queueEventService: QueueEventService,
    private readonly fileService: FileService

  ) {
    this.queueEventService.subscribe(
      PHOTO_CONVERT_CHANNEL,
      FILE_PROCESSED_TOPIC,
      this.handleFileProcessed.bind(this)
    );
  }

  public async handleFileProcessed(event: QueueEvent) {
    if (event.eventName !== FILE_EVENT.PHOTO_PROCESSED) return;

    const { photoId } = event.data.meta;
    const [photo, file] = await Promise.all([
      this.PhotoModel.findById(photoId),
      this.fileService.findById(event.data.fileId)
    ]);
    if (!photo) {
      // TODO - delete file?
      await this.fileService.remove(event.data.fileId);
      return;
    }
    photo.processing = false;
    if (file.status === 'error') {
      photo.status = PHOTO_STATUS.FILE_ERROR;
    }
    await photo.save();
    // add default cover photo to gallery
    if (file.status === 'error' || !photo.galleryId) return;
    await this.galleryService.updatePhotoStats(photo.galleryId);
    // update cover field in the photo list
    const photoCover = await this.PhotoModel.findOne({
      galleryId: photo.galleryId,
      isGalleryCover: true
    });
    if (photoCover) return;
    const defaultCover = await this.PhotoModel.findOne({
      galleryId: photo.galleryId,
      status: PHOTO_STATUS.ACTIVE
    });
    if (!defaultCover || (photoCover && photoCover._id.toString() === defaultCover.toString())) return;
    await this.galleryService.updateCover(photo.galleryId, defaultCover._id);
    await this.PhotoModel.updateOne(
      { _id: defaultCover._id },
      {
        isGalleryCover: true
      }
    );
  }

  public async create(file: FileDto, payload: PhotoCreatePayload, creator?: UserDto): Promise<PhotoDto> {
    if (!file) throw new HttpException('File is valid!', 400);
    if (!file.isImage()) {
      await this.fileService.removeIfNotHaveRef(file._id);
      throw new HttpException('Invalid image!', 400);
    }

    // process to create thumbnails
    // eslint-disable-next-line new-cap
    const photo = new this.PhotoModel(payload);
    if (!photo.title) photo.title = file.name;
    photo.fileId = file._id;
    photo.createdAt = new Date();
    photo.updatedAt = new Date();
    if (creator) {
      if (!photo.performerId) {
        photo.performerId = creator._id;
      }
      photo.createdBy = creator._id;
      photo.updatedBy = creator._id;
    }
    photo.processing = true;
    await photo.save();
    await Promise.all([
      this.fileService.addRef(file._id, {
        itemType: REF_TYPE.PHOTO,
        itemId: photo._id
      }),
      this.fileService.queueProcessPhoto(file._id, {
        meta: {
          photoId: photo._id
        },
        publishChannel: PHOTO_CONVERT_CHANNEL,
        thumbnailSize: {
          width: 280,
          height: 220
        }
      })
    ]);

    const dto = PhotoDto.fromModel(photo);
    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_COUNT_PHOTO_CHANNEL,
        eventName: EVENT.CREATED,
        data: dto
      })
    );

    return dto;
  }

  public async updateInfo(id: string | ObjectId, payload: PhotoUpdatePayload, updater?: UserDto): Promise<PhotoDto> {
    const photo = await this.PhotoModel.findById(id);
    if (!photo) {
      throw new EntityNotFoundException();
    }

    const oldStatus = photo.status;

    merge(photo, payload);
    if (photo.status !== PHOTO_STATUS.FILE_ERROR && payload.status !== PHOTO_STATUS.FILE_ERROR) {
      photo.status = payload.status;
    }
    updater && photo.set('updatedBy', updater._id);
    photo.updatedAt = new Date();
    await photo.save();
    const dto = PhotoDto.fromModel(photo);
    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_COUNT_PHOTO_CHANNEL,
        eventName: EVENT.UPDATED,
        data: {
          ...dto,
          oldStatus
        }
      })
    );

    return dto;
  }

  public async setCoverGallery(id: string | ObjectId, updater: UserDto): Promise<PhotoDto> {
    const photo = await this.PhotoModel.findById(id);
    if (!photo) {
      throw new EntityNotFoundException();
    }
    if (updater.roles && !updater.roles.includes('admin') && `${updater._id}` !== `${photo.performerId}`) {
      throw new ForbiddenException();
    }
    await this.PhotoModel.updateMany({
      galleryId: photo.galleryId
    }, {
      isGalleryCover: false
    });
    photo.isGalleryCover = true;
    await photo.save();
    photo.galleryId && await this.galleryService.updateCover(photo.galleryId, photo._id);
    return PhotoDto.fromModel(photo);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async details(id: string | ObjectId, user?: UserDto): Promise<PhotoDto> {
    const photo = await this.PhotoModel.findOne({ _id: id });
    if (!photo) {
      throw new EntityNotFoundException();
    }

    const dto = PhotoDto.fromModel(photo);
    const [performer, gallery, file] = await Promise.all([
      photo.performerId ? this.performerService.findById(photo.performerId) : null,
      photo.galleryId ? this.galleryService.findById(photo.galleryId) : null,
      photo.fileId ? this.fileService.findById(photo.fileId) : null
    ]);
    if (performer) dto.performer = { username: performer.username };
    if (gallery) dto.gallery = gallery;
    if (file) {
      dto.photo = {
        url: file.getUrl(),
        thumbnails: file.getThumbnails(),
        width: file.width,
        height: file.height
      };
    }

    return dto;
  }

  public async delete(id: string | ObjectId) {
    const photo = await this.PhotoModel.findById(id);
    if (!photo) {
      throw new EntityNotFoundException();
    }

    const dto = PhotoDto.fromModel(photo);

    await photo.deleteOne();
    // TODO - should check ref and remove
    await this.fileService.remove(photo.fileId);
    photo.galleryId && await this.galleryService.updatePhotoStats(photo.galleryId, -1);
    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_COUNT_PHOTO_CHANNEL,
        eventName: EVENT.DELETED,
        data: dto
      })
    );

    return true;
  }

  public async deleteByGallery(galleryId: string | ObjectId | any) {
    const photos = await this.PhotoModel.find({ galleryId });
    if (photos.length) {
      await photos.reduce(async (lp, photo) => {
        await lp;
        await photo.deleteOne();
        await this.queueEventService.publish(
          new QueueEvent({
            channel: PERFORMER_COUNT_PHOTO_CHANNEL,
            eventName: EVENT.DELETED,
            data: PhotoDto.fromModel(photo)
          })
        );
        await this.fileService.remove(photo.fileId);
        return Promise.resolve();
      }, Promise.resolve());
    }
    return true;
  }

  public async checkAuth(req: any, user: UserDto) {
    const { query } = req;
    if (!query.photoId) {
      throw new ForbiddenException();
    }
    if (user.roles && user.roles.indexOf('admin') > -1) {
      return true;
    }
    // check type video
    const photo = await this.PhotoModel.findById(query.photoId);
    if (!photo) throw new EntityNotFoundException();
    if (user._id.toString() === photo.performerId.toString()) {
      return true;
    }
    const gallery = await this.galleryService.findById(photo.galleryId);
    // check subscription
    if (!gallery.isSale) {
      const checkSubscribed = await this.subscriptionService.checkSubscribed(
        photo.performerId,
        user._id
      );
      if (!checkSubscribed) {
        throw new ForbiddenException();
      }
    }
    if (gallery.isSale) {
      const checkBought = await this.checkPaymentService.checkBoughtGallery(gallery, user);
      if (!checkBought) {
        throw new ForbiddenException();
      }
    }
    return true;
  }

  public async findById(id: string | ObjectId) {
    const photo = await this.PhotoModel.findById(id);
    if (!photo) return null;
    return PhotoDto.fromModel(photo);
  }

  public async countPhotosByPerformer(performerId, options = {}) {
    return this.PhotoModel.countDocuments({
      performerId,
      ...options
    });
  }

  public async countByQuery(query: Record<string, any>) {
    return this.PhotoModel.countDocuments(query);
  }
}
