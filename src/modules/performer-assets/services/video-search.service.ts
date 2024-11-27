import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model, SortOrder } from 'mongoose';
import { PageableData } from 'src/kernel';
import { PerformerService } from 'src/modules/performer/services';
import { FileService } from 'src/modules/file/services';
import { UserDto } from 'src/modules/user/dtos';
import { STATUS } from 'src/kernel/constants';
import { OrderService } from 'src/modules/payment/services';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import { InjectModel } from '@nestjs/mongoose';
import { VideoDto } from '../dtos';
import { VideoSearchRequest } from '../payloads';
import { Video } from '../schemas';

@Injectable()
export class VideoSearchService {
  constructor(
    @InjectModel(Video.name) private readonly VideoModel: Model<Video>,

    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    private readonly fileService: FileService,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService
  ) { }

  public async adminSearch(
    req: VideoSearchRequest
  ): Promise<PageableData<VideoDto>> {
    const query: Record<string, any> = {};
    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''),
        'i'
      );
      query.$or = [
        {
          title: { $regex: regexp }
        },
        {
          description: { $regex: regexp }
        },
        { tags: { $elemMatch: { $regex: regexp } } }
      ];
    }
    if (req.performerId) query.performerId = req.performerId;
    if (req.status) query.status = req.status;
    if (req.isSaleVideo) query.isSaleVideo = req.isSaleVideo === 'true';
    let sort: Record<string, SortOrder> = {
      createdAt: -1
    };
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.VideoModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.VideoModel.countDocuments(query)
    ]);

    const performerIds = [];
    const fileIds = [];
    data.forEach((v) => {
      v.performerId && performerIds.push(v.performerId);
      v.thumbnailId && fileIds.push(v.thumbnailId);
      v.fileId && fileIds.push(v.fileId);
    });

    const [performers, files] = await Promise.all([
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      fileIds.length ? this.fileService.findByIds(fileIds) : []
    ]);

    const videos = data.map((v) => VideoDto.fromModel(v));
    videos.forEach((v) => {
      if (v.performerId) {
        const performer = performers.find(
          (p) => p._id.toString() === v.performerId.toString()
        );
        v.setPerformer(performer);
      }

      if (v.thumbnailId) {
        const thumbnail = files.find(
          (f) => f._id.toString() === v.thumbnailId.toString()
        );
        v.setThumbnail(thumbnail);
      }
      if (v.fileId) {
        const video = files.find((f) => f._id.toString() === v.fileId.toString());
        v.setVideo(video);
      }
    });

    return {
      data: videos,
      total
    };
  }

  public async performerSearch(
    req: VideoSearchRequest,
    performer?: UserDto
  ): Promise<PageableData<VideoDto>> {
    const query: Record<string, any> = {};
    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''),
        'i'
      );
      query.$or = [
        {
          title: { $regex: regexp }
        },
        {
          description: { $regex: regexp }
        },
        { tags: { $elemMatch: { $regex: regexp } } }
      ];
    }
    query.performerId = performer._id;
    if (req.isSaleVideo) query.isSaleVideo = req.isSaleVideo === 'true';
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
      this.VideoModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.VideoModel.countDocuments(query)
    ]);
    const fileIds = [];
    data.forEach((v) => {
      v.thumbnailId && fileIds.push(v.thumbnailId);
      v.fileId && fileIds.push(v.fileId);
      v.teaserId && fileIds.push(v.teaserId);
    });

    const [files] = await Promise.all([
      fileIds.length ? this.fileService.findByIds(fileIds) : []
    ]);

    const videos = data.map((v) => VideoDto.fromModel(v));
    videos.forEach((v) => {
      if (v.thumbnailId) {
        const thumbnail = files.find(
          (f) => f._id.toString() === v.thumbnailId.toString()
        );
        if (thumbnail) {
          // eslint-disable-next-line no-param-reassign
          v.thumbnail = {
            url: thumbnail.getUrl(),
            thumbnails: thumbnail.getThumbnails(),
            blurImage: thumbnail.getBlurImage()
          };
        }
      }
      if (v.teaserId) {
        const teaser = files.find(
          (f) => f._id.toString() === v.teaserId.toString()
        );
        if (teaser) {
          // eslint-disable-next-line no-param-reassign
          v.teaser = {
            url: teaser.getUrl(),
            thumbnails: teaser.getThumbnails(),
            blurImage: teaser.getBlurImage()
          };
        }
      }
      if (v.fileId) {
        const video = files.find((f) => f._id.toString() === v.fileId.toString());
        if (video) {
          // eslint-disable-next-line no-param-reassign
          v.video = {
            url: video.getUrl(),
            thumbnails: video.getThumbnails(),
            blurImage: video.getBlurImage(),
            duration: video.duration
          };
        }
      }
    });

    return {
      data: videos,
      total
    };
  }

  public async userSearch(
    req: VideoSearchRequest,
    user: UserDto
  ): Promise<PageableData<VideoDto>> {
    const query: Record<string, any> = {
      status: STATUS.ACTIVE
    };
    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''),
        'i'
      );
      query.$or = [
        {
          title: { $regex: regexp }
        },
        {
          description: { $regex: regexp }
        },
        { tags: { $elemMatch: { $regex: regexp } } }
      ];
    }
    if (req.performerId) query.performerId = req.performerId;
    if (req.isSaleVideo) query.isSaleVideo = req.isSaleVideo === 'true';
    if (req.excludedId) query._id = { $ne: req.excludedId };
    if (req.ids && Array.isArray(req.ids)) {
      query._id = {
        $in: req.ids
      };
    }

    query.status = 'active';
    query.isSchedule = false;
    let sort: Record<string, SortOrder> = {
      createdAt: -1
    };
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.VideoModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.VideoModel.countDocuments(query)
    ]);
    const fileIds = [];
    data.forEach((v) => {
      v.thumbnailId && fileIds.push(v.thumbnailId);
      v.fileId && fileIds.push(v.fileId);
      v.teaserId && fileIds.push(v.teaserId);
    });

    const performerIds = data.map((v) => v.performerId);
    const videoIds = data.map((v) => v._id);

    const [files, subscriptions, orders] = await Promise.all([
      fileIds.length ? this.fileService.findByIds(fileIds) : [],
      user?._id && performerIds.length ? this.subscriptionService.findSubscriptionList({
        userId: user?._id,
        performerId: { $in: performerIds },
        expiredAt: { $gt: new Date() }
      }) : [],
      user?._id && videoIds.length ? await this.orderService.findDetailsByQuery({
        buyerId: user?._id,
        status: 'paid',
        productType: 'sale_video',
        productId: { $in: videoIds }
      }) : []
    ]);
    const videos = data.map((v) => VideoDto.fromModel(v));
    videos.forEach((v) => {
      if (user?._id) {
        const subscription = subscriptions.filter((s) => s.performerId.equals(v.performerId));
        // eslint-disable-next-line no-param-reassign
        v.isSubscribed = !!subscription || user?._id.equals(v.performerId);

        const order = orders.filter((o) => o.productId.equals(v._id));
        // eslint-disable-next-line no-param-reassign
        v.isBought = !!order || user?._id.equals(v.performerId);
      }
      if (v.thumbnailId) {
        const thumbnail = files.find(
          (f) => f._id.toString() === v.thumbnailId.toString()
        );
        if (thumbnail) {
          // eslint-disable-next-line no-param-reassign
          v.thumbnail = {
            url: thumbnail.getUrl(),
            thumbnails: thumbnail.getThumbnails(),
            blurImage: thumbnail.getBlurImage()
          };
        }
      }
      if (v.teaserId) {
        const teaser = files.find(
          (f) => f._id.toString() === v.teaserId.toString()
        );
        if (teaser) {
          // eslint-disable-next-line no-param-reassign
          v.teaser = {
            url: null, // teaser.getUrl(),
            thumbnails: teaser.getThumbnails(),
            blurImage: teaser.getBlurImage(),
            duration: teaser.duration
          };
        }
      }
      if (v.fileId) {
        const video = files.find((f) => f._id.toString() === v.fileId.toString());
        if (video) {
          // eslint-disable-next-line no-param-reassign
          v.video = {
            url: null, // video.getUrl(),
            thumbnails: video.getThumbnails(),
            blurImage: video.getBlurImage(),
            duration: video.duration
          };
        }
      }
    });

    return {
      data: videos,
      total
    };
  }

  public async getPurchasedItems(userId, req: VideoSearchRequest) {
    const { data, total } = await this.orderService.getPurchasedVideos({
      userId,
      limit: req.limit,
      offset: req.offset
    });
    if (!data.length) {
      return {
        data,
        total
      };
    }
    const videoIds = data.map((d) => d.productId);
    const videosDb = await this.VideoModel
      .find({
        _id: {
          $in: videoIds
        }
      })
      .lean();

    const fileIds = [];
    videosDb.forEach((v) => {
      v.thumbnailId && fileIds.push(v.thumbnailId);
      v.fileId && fileIds.push(v.fileId);
      v.teaserId && fileIds.push(v.teaserId);
    });

    const [files] = await Promise.all([
      fileIds.length ? this.fileService.findByIds(fileIds) : []
    ]);

    const videos = videosDb.map((v) => VideoDto.fromModel(v));
    videos.forEach((v) => {
      // check login & subscriber filter data
      if (v.thumbnailId) {
        const thumbnail = files.find(
          (f) => f._id.toString() === v.thumbnailId.toString()
        );
        if (thumbnail) {
          // eslint-disable-next-line no-param-reassign
          v.thumbnail = {
            url: thumbnail.getUrl(),
            blurImage: thumbnail.getBlurImage(),
            thumbnails: thumbnail.getThumbnails()
          };
        }
      }
      if (v.teaserId) {
        const teaser = files.find(
          (f) => f._id.toString() === v.teaserId.toString()
        );
        if (teaser) {
          // eslint-disable-next-line no-param-reassign
          v.teaser = {
            url: null, // teaser.getUrl(),
            thumbnails: teaser.getThumbnails(),
            blurImage: teaser.getBlurImage(),
            duration: teaser.duration
          };
        }
      }
      if (v.fileId) {
        const video = files.find((f) => f._id.toString() === v.fileId.toString());
        if (video) {
          // eslint-disable-next-line no-param-reassign
          v.video = {
            url: null, // video.getUrl(),
            thumbnails: video.getThumbnails(),
            blurImage: video.getBlurImage(),
            duration: video.duration
          };
        }
      }
    });

    return {
      data: videos,
      total
    };
  }
}
