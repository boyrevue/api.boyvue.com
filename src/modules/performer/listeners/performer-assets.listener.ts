import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { QueueEventService, QueueEvent } from 'src/kernel';
import {
  PERFORMER_COUNT_PHOTO_CHANNEL, PERFORMER_COUNT_PRODUCT_CHANNEL, PERFORMER_COUNT_VIDEO_CHANNEL, PhotoService, ProductService, VideoService
} from 'src/modules/performer-assets/services';
import { Model } from 'mongoose';
import { EVENT } from 'src/kernel/constants';
import { PERFORMER_FEED_CHANNEL } from 'src/modules/feed/constants';
import { FeedService } from 'src/modules/feed/services';
import { InjectModel } from '@nestjs/mongoose';
import { DBLoggerService } from 'src/modules/logger';
import { Performer } from '../schemas';

const HANDLE_PHOTO_COUNT_FOR_PERFORMER = 'HANDLE_PHOTO_COUNT_FOR_PERFORMER';
const HANDLE_VIDEO_COUNT_FOR_PERFORMER = 'HANDLE_VIDEO_COUNT_FOR_PERFORMER';
const HANDLE_PRODUCT_COUNT_FOR_PERFORMER = 'HANDLE_PRODUCT_COUNT_FOR_PERFORMER';
const PERFORMER_COUNT_FEED_TOPIC = 'PERFORMER_COUNT_FEED_TOPIC';

@Injectable()
export class PerformerAssetsListener {
  constructor(
    @InjectModel(Performer.name) private readonly PerformerModel: Model<Performer>,
    private readonly queueEventService: QueueEventService,

    @Inject(PhotoService)
    private readonly photoService: PhotoService,
    @Inject(VideoService)
    private readonly videoService: VideoService,
    @Inject(ProductService)
    private readonly productService: ProductService,
    @Inject(forwardRef(() => FeedService))
    private readonly feedService: FeedService,
    private readonly logger: DBLoggerService
  ) {
    this.queueEventService.subscribe(
      PERFORMER_COUNT_VIDEO_CHANNEL,
      HANDLE_VIDEO_COUNT_FOR_PERFORMER,
      this.handleVideoCount.bind(this)
    );
    this.queueEventService.subscribe(
      PERFORMER_COUNT_PHOTO_CHANNEL,
      HANDLE_PHOTO_COUNT_FOR_PERFORMER,
      this.handlePhotoCount.bind(this)
    );
    this.queueEventService.subscribe(
      PERFORMER_COUNT_PRODUCT_CHANNEL,
      HANDLE_PRODUCT_COUNT_FOR_PERFORMER,
      this.handleProductCount.bind(this)
    );
    this.queueEventService.subscribe(
      PERFORMER_FEED_CHANNEL,
      PERFORMER_COUNT_FEED_TOPIC,
      this.handleFeedCount.bind(this)
    );
  }

  public async handlePhotoCount(event: QueueEvent) {
    try {
      const { eventName } = event;
      if (![EVENT.CREATED, EVENT.DELETED, EVENT.UPDATED].includes(eventName)) {
        return;
      }

      const { performerId } = event.data;
      const count = await this.photoService.countPhotosByPerformer(performerId, {
        status: 'active'
      });
      await this.PerformerModel.updateOne(
        { _id: performerId },
        {
          $set: {
            'stats.totalPhotos': count
          }
        }
      );
    } catch (e) {
      this.logger.error(e.stack || e, { context: 'PerformerAssetsListener' });
    }
  }

  public async handleVideoCount(event: QueueEvent) {
    try {
      const { eventName } = event;
      if (![EVENT.CREATED, EVENT.DELETED, EVENT.UPDATED].includes(eventName)) {
        return;
      }
      const { performerId } = event.data;
      const count = await this.videoService.countVideosByPerformer(performerId, {
        status: 'active'
      });
      await this.PerformerModel.updateOne(
        { _id: performerId },
        {
          $set: {
            'stats.totalVideos': count
          }
        }
      );
    } catch (e) {
      this.logger.error(e.stack || e, { context: 'PerformerAssetsListener' });
    }
  }

  public async handleProductCount(event: QueueEvent) {
    try {
      const { eventName } = event;
      if (![EVENT.CREATED, EVENT.DELETED, EVENT.UPDATED].includes(eventName)) {
        return;
      }
      const { performerId } = event.data;
      const count = await this.productService.countProductsByPerformer(performerId, {
        status: 'active'
      });
      await this.PerformerModel.updateOne(
        { _id: performerId },
        {
          $set: {
            'stats.totalProducts': count
          }
        }
      );
    } catch (e) {
      this.logger.error(e.stack || e, { context: 'PerformerAssetsListener' });
    }
  }

  public async handleFeedCount(event: QueueEvent) {
    try {
      const { eventName } = event;
      if (![EVENT.CREATED, EVENT.DELETED, EVENT.UPDATED].includes(eventName)) {
        return;
      }
      const {
        performerId, fromSourceId
      } = event.data;
      const id = fromSourceId || performerId;
      const count = await this.feedService.countFeedsByPerformer(id, {
        status: 'active'
      });
      await this.PerformerModel.updateOne(
        { _id: performerId },
        {
          $set: {
            'stats.totalFeeds': count
          }
        }
      );
    } catch (e) {
      this.logger.error(e.stack || e, { context: 'PerformerAssetsListener' });
    }
  }
}
