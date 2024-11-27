import {
  Injectable, Inject, forwardRef, HttpException
} from '@nestjs/common';
import { Model, SortOrder } from 'mongoose';
import {
  EntityNotFoundException,
  PageableData,
  StringHelper
} from 'src/kernel';
import { PerformerService } from 'src/modules/performer/services';
import { ReactionService } from 'src/modules/reaction/services/reaction.service';
import { ObjectId } from 'mongodb';
import { merge } from 'lodash';
import { FileService } from 'src/modules/file/services';
import { REACTION } from 'src/modules/reaction/constants';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import { UserDto } from 'src/modules/user/dtos';
import { STATUS } from 'src/kernel/constants';
import { isObjectId } from 'src/kernel/helpers/string.helper';
import { CheckPaymentService, OrderService } from 'src/modules/payment/services';
import { ORDER_STATUS } from 'src/modules/payment/constants';
import { InjectModel } from '@nestjs/mongoose';
import { GalleryUpdatePayload } from '../payloads/gallery-update.payload';
import { GalleryDto } from '../dtos';
import { GalleryCreatePayload, GallerySearchRequest } from '../payloads';
import { PhotoService } from './photo.service';
import { Gallery, Photo } from '../schemas';

@Injectable()
export class GalleryService {
  constructor(
    @InjectModel(Gallery.name) private readonly GalleryModel: Model<Gallery>,
    @InjectModel(Photo.name) private readonly PhotoModel: Model<Photo>,

    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => ReactionService))
    private readonly reactionService: ReactionService,
    @Inject(forwardRef(() => PhotoService))
    private readonly photoService: PhotoService,
    @Inject(forwardRef(() => CheckPaymentService))
    private readonly checkPaymentService: CheckPaymentService,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
    private readonly fileService: FileService
  ) { }

  public async create(payload: GalleryCreatePayload, creator?: UserDto): Promise<GalleryDto> {
    if (payload.performerId) {
      const performer = await this.performerService.findById(
        payload.performerId
      );
      if (!performer) {
        throw new EntityNotFoundException('Performer not found!');
      }
    }

    // eslint-disable-next-line new-cap
    const model = new this.GalleryModel(payload);
    model.slug = StringHelper.createAlias(payload.name);
    const slugCheck = await this.GalleryModel.countDocuments({
      slug: model.slug
    });
    if (slugCheck) {
      model.slug = `${model.slug}-${StringHelper.randomString(8)}`;
    }
    model.createdAt = new Date();
    model.updatedAt = new Date();
    if (creator) {
      if (!model.performerId) {
        model.performerId = creator._id;
      }
      model.createdBy = creator._id;
      model.updatedBy = creator._id;
    }

    await model.save();
    return GalleryDto.fromModel(model);
  }

  public async update(id: string | ObjectId, payload: GalleryUpdatePayload, creator?: UserDto): Promise<GalleryDto> {
    const gallery = await this.GalleryModel.findById(id);
    if (!gallery) {
      throw new EntityNotFoundException('Gallery not found!');
    }
    let { slug } = gallery;
    if (payload.name !== gallery.name) {
      slug = StringHelper.createAlias(payload.name);
      const slugCheck = await this.GalleryModel.countDocuments({
        slug,
        _id: { $ne: gallery._id }
      });
      if (slugCheck) {
        slug = `${slug}-${StringHelper.randomString(8)}`;
      }
    }
    merge(gallery, payload);
    gallery.updatedAt = new Date();
    if (creator) {
      gallery.updatedBy = creator._id;
    }
    gallery.slug = slug;
    await gallery.save();
    return GalleryDto.fromModel(gallery);
  }

  public async findByIds(ids: string[] | ObjectId[] | any[]): Promise<GalleryDto[]> {
    const galleries = await this.GalleryModel.find({
      _id: {
        $in: ids
      }
    });

    return galleries.map((g) => GalleryDto.fromModel(g));
  }

  public async findById(id: string | ObjectId | any): Promise<GalleryDto> {
    const gallery = await this.GalleryModel.findOne({ _id: id });
    return GalleryDto.fromModel(gallery);
  }

  public async details(id: string, user: UserDto) {
    const query = isObjectId(id) ? { _id: id } : { slug: id };
    const gallery = await this.GalleryModel.findOne(query);
    if (!gallery) {
      throw new EntityNotFoundException();
    }
    const dto = GalleryDto.fromModel(gallery);
    if (gallery.performerId) {
      const performer = await this.performerService.findById(
        gallery.performerId
      );
      dto.setPerformer(performer);
    }
    if (gallery.coverPhotoId) {
      const coverPhoto = await this.PhotoModel.findById(
        gallery.coverPhotoId
      );
      if (coverPhoto) {
        const file = await this.fileService.findById(coverPhoto.fileId);
        dto.setCoverPhoto(file);
      }
    }
    const isLiked = user ? await this.reactionService.checkExisting(dto._id, user._id, REACTION.LIKE) : null;
    dto.isLiked = !!isLiked;
    const subscribed = user && !gallery.isSale && await this.subscriptionService.checkSubscribed(dto.performerId, user._id);
    dto.isSubscribed = !!subscribed;
    const isBought = user && gallery.isSale && await this.checkPaymentService.checkBoughtGallery(dto, user);
    dto.isBought = !!isBought;
    if (user && user.roles && user.roles.includes('admin')) {
      dto.isSubscribed = true;
      dto.isBought = true;
    }
    // TODO - move to controller and handle
    if (!user || (user && !user.roles?.includes('admin') && user._id.toString() !== gallery.performerId.toString())) {
      await this.GalleryModel.updateOne({ _id: gallery._id }, { $inc: { 'stats.views': 1 } });
    }
    return dto;
  }

  public async updatePhotoStats(id: string | ObjectId | any, num = 1) {
    await this.GalleryModel.findOneAndUpdate(
      { _id: id },
      {
        $inc: { numOfItems: num }
      }
    );
    return true;
  }

  public async downloadZipPhotos(galleryId: string | ObjectId, user: UserDto) {
    const gallery = await this.GalleryModel.findOne({ _id: galleryId });
    if (!gallery) {
      throw new EntityNotFoundException();
    }
    if (!gallery.isSale) {
      const isSubscribed = await this.subscriptionService.checkSubscribed(gallery.performerId, user._id);
      if (!isSubscribed) throw new HttpException('Please subscribe model before downloading', 403);
    }
    if (gallery.isSale) {
      const isBought = await this.checkPaymentService.checkBoughtGallery(GalleryDto.fromModel(gallery), user);
      if (!isBought) throw new HttpException('Please unlock gallery before downloading', 403);
    }
    const photos = await this.PhotoModel.find({ galleryId });
    const fileIds = photos.map((d) => d.fileId);
    const files = await this.fileService.findByIds(fileIds);
    return files.map((f) => ({ path: f.getUrl(), name: f.name }));
  }

  public async adminSearch(req: GallerySearchRequest): Promise<PageableData<GalleryDto>> {
    const query: Record<string, any> = {};
    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''),
        'i'
      );
      query.$or = [
        {
          name: { $regex: regexp }
        },
        {
          description: { $regex: regexp }
        }
      ];
    }
    if (req.performerId) query.performerId = req.performerId;
    if (req.status) query.status = req.status;
    let sort: Record<string, SortOrder> = {
      createdAt: -1
    };
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.GalleryModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.GalleryModel.countDocuments(query)
    ]);

    const performerIds = data.map((d) => d.performerId);
    const galleries = data.map((g) => GalleryDto.fromModel(g));
    const coverPhotoIds = data.map((d) => d.coverPhotoId);

    const [performers, coverPhotos] = await Promise.all([
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      coverPhotoIds.length
        ? this.PhotoModel
          .find({ _id: { $in: coverPhotoIds } })
          .lean()
          .exec()
        : []
    ]);
    const fileIds = coverPhotos.map((c) => c.fileId);
    const files = await this.fileService.findByIds(fileIds);

    galleries.forEach((g) => {
      const performer = performers.find(
        (p) => p._id.toString() === g.performerId.toString()
      );
      g.setPerformer(performer);
      if (g.coverPhotoId) {
        const coverPhoto = coverPhotos.find(
          (c) => c._id.toString() === g.coverPhotoId.toString()
        );
        if (coverPhoto) {
          const file = files.find(
            (f) => f._id.toString() === coverPhoto.fileId.toString()
          );
          g.setCoverPhoto(file);
        }
      }
    });

    return {
      data: galleries,
      total
    };
  }

  public async performerSearch(req: GallerySearchRequest, user: UserDto): Promise<PageableData<GalleryDto>> {
    const query: Record<string, any> = {};
    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''),
        'i'
      );
      query.$or = [
        {
          name: { $regex: regexp }
        },
        {
          description: { $regex: regexp }
        }
      ];
    }
    query.performerId = user._id;
    if (req.status) query.status = req.status;
    let sort: Record<string, SortOrder> = {
      createdAt: -1
    };
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.GalleryModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.GalleryModel.countDocuments(query)
    ]);

    const galleries = data.map((g) => GalleryDto.fromModel(g));
    const coverPhotoIds = data.map((d) => d.coverPhotoId);

    const [coverPhotos] = await Promise.all([
      coverPhotoIds.length
        ? this.PhotoModel
          .find({ _id: { $in: coverPhotoIds } })
          .lean()
          .exec()
        : []
    ]);
    const fileIds = coverPhotos.map((c) => c.fileId);
    const files = await this.fileService.findByIds(fileIds);

    galleries.forEach((g) => {
      if (g.coverPhotoId) {
        const coverPhoto = coverPhotos.find(
          (c) => c._id.toString() === g.coverPhotoId.toString()
        );
        if (coverPhoto) {
          const file = files.find(
            (f) => f._id.toString() === coverPhoto.fileId.toString()
          );
          if (file) {
            // eslint-disable-next-line no-param-reassign
            g.coverPhoto = {
              url: file.getUrl(),
              thumbnails: file.getThumbnails()
            };
          }
        }
      }
    });

    return {
      data: galleries,
      total
    };
  }

  public async userSearch(
    req: GallerySearchRequest,
    user: UserDto
  ): Promise<PageableData<GalleryDto>> {
    const query: Record<string, any> = {
      status: STATUS.ACTIVE,
      numOfItems: { $gt: 0 }
    };
    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''),
        'i'
      );
      query.$or = [
        {
          name: { $regex: regexp }
        },
        {
          description: { $regex: regexp }
        }
      ];
    }
    if (req.performerId) query.performerId = req.performerId;
    if (req.excludedId) {
      query._id = { $ne: req.excludedId };
    }
    let sort: Record<string, SortOrder> = {
      createdAt: -1
    };
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.GalleryModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.GalleryModel.countDocuments(query)
    ]);

    const performerIds = data.map((d) => d.performerId);
    const coverPhotoIds = data.map((d) => d.coverPhotoId);
    const galleryIds = data.map((d) => d._id);

    const [performers, coverPhotos, subscriptions, transactions] = await Promise.all([
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      coverPhotoIds.length
        ? this.PhotoModel
          .find({ _id: { $in: coverPhotoIds } })
          .lean()
          .exec()
        : [],
      user && user._id ? this.subscriptionService.findSubscriptionList({
        userId: user._id, performerId: { $in: performerIds }, expiredAt: { $gt: new Date() }
      }) : [],
      user && user._id ? this.orderService.findDetailsByQuery({
        buyerId: user._id,
        productId: { $in: galleryIds },
        status: ORDER_STATUS.PAID
      }) : []
    ]);
    const fileIds = coverPhotos.map((c) => c.fileId);
    const files = await this.fileService.findByIds(fileIds);

    const galleries = data.map((item) => {
      const g = GalleryDto.fromModel(item);
      // TODO - should get picture (thumbnail if have?)
      const performer = performers.find((p) => p._id.toString() === g.performerId.toString());
      g.setPerformer(performer);
      const subscribed = subscriptions.find((s) => `${s.performerId}` === `${g.performerId}`);
      g.isSubscribed = !!subscribed;
      const isBought = transactions.find((t) => `${t.productId}` === `${g._id}`);
      g.isBought = !!isBought;
      if (g.coverPhotoId) {
        const coverPhoto = coverPhotos.find(
          (c) => c._id.toString() === g.coverPhotoId.toString()
        );
        if (coverPhoto) {
          const file = files.find(
            (f) => f._id.toString() === coverPhoto.fileId.toString()
          );
          g.setCoverPhoto(file);
        }
      }
      if ((user && `${user._id}` === `${g.performerId}`) || (user && user.roles && user.roles.includes('admin'))) {
        g.isSubscribed = true;
        g.isBought = true;
      }
      return g;
    });

    return {
      data: galleries,
      total
    };
  }

  public async updateCover(galleryId: string | ObjectId | any, photoId: ObjectId | any): Promise<boolean> {
    await this.GalleryModel.updateOne(
      { _id: galleryId },
      {
        coverPhotoId: photoId
      }
    );
    return true;
  }

  public async delete(id: string | ObjectId) {
    const gallery = await this.GalleryModel.findById(id);
    if (!gallery) {
      throw new EntityNotFoundException();
    }
    await gallery.deleteOne();
    await this.photoService.deleteByGallery(gallery._id);
    return true;
  }

  public async updateCommentStats(id: string | ObjectId, num = 1) {
    return this.GalleryModel.updateOne(
      { _id: id },
      {
        $inc: { 'stats.comments': num }
      }
    );
  }

  public async updateLikeStats(id: string | ObjectId, num = 1) {
    return this.GalleryModel.updateOne(
      { _id: id },
      {
        $inc: { 'stats.likes': num }
      }
    );
  }

  public async countByQuery(query: Record<string, any>) {
    return this.GalleryModel.countDocuments(query);
  }
}
