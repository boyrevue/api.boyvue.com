/* eslint-disable no-param-reassign */
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model, SortOrder } from 'mongoose';
import { PageableData, QueueEventService, QueueEvent } from 'src/kernel';
import { EVENT } from 'src/kernel/constants';
import { ObjectId } from 'mongodb';
import { VideoService } from 'src/modules/performer-assets/services';
import { uniq } from 'lodash';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import { FeedService } from 'src/modules/feed/services';
import { OrderService } from 'src/modules/payment/services';
import { ORDER_STATUS, PRODUCT_TYPE } from 'src/modules/payment/constants';
import { FileService } from 'src/modules/file/services';
import { InjectModel } from '@nestjs/mongoose';
import {
  ReactionCreatePayload, ReactionSearchRequestPayload
} from '../payloads';
import { UserDto } from '../../user/dtos';
import { ReactionDto } from '../dtos/reaction.dto';
import { UserService } from '../../user/services';
import { PerformerService } from '../../performer/services';
import { REACTION_CHANNEL, REACTION_TYPE } from '../constants';
import { Reaction } from '../schemas';

@Injectable()
export class ReactionService {
  constructor(
    @InjectModel(Reaction.name) private readonly ReactionModel: Model<Reaction>,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => VideoService))
    private readonly videoService: VideoService,
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
    @Inject(forwardRef(() => FeedService))
    private readonly feedService: FeedService,
    @Inject(forwardRef(() => FileService))
    private readonly fileService: FileService,
    private readonly queueEventService: QueueEventService,
    private readonly userService: UserService
  ) { }

  public async findByQuery(query): Promise<ReactionDto[]> {
    const items = await this.ReactionModel.find(query);
    return items.map((item) => ReactionDto.fromModel(item));
  }

  public async create(data: ReactionCreatePayload, user: UserDto): Promise<ReactionDto> {
    const reaction: Record<string, any> = { ...data };
    const existReact = await this.ReactionModel.findOne({
      objectType: reaction.objectType,
      objectId: reaction.objectId,
      createdBy: user._id,
      action: reaction.action
    });
    if (existReact) {
      return ReactionDto.fromModel(existReact);
    }
    reaction.createdBy = user._id;
    reaction.createdAt = new Date();
    reaction.updatedAt = new Date();
    const newReaction = await this.ReactionModel.create(reaction);

    const dto = ReactionDto.fromModel(newReaction);
    dto.creator = user;
    await this.queueEventService.publish(
      new QueueEvent({
        channel: REACTION_CHANNEL,
        eventName: EVENT.CREATED,
        data: dto
      })
    );
    return dto;
  }

  public async remove(payload: ReactionCreatePayload, user: UserDto) {
    const reaction = await this.ReactionModel.findOne({
      objectType: payload.objectType || REACTION_TYPE.VIDEO,
      objectId: payload.objectId,
      createdBy: user._id,
      action: payload.action
    });
    if (!reaction) {
      return false;
    }
    await reaction.deleteOne();
    await this.queueEventService.publish(
      new QueueEvent({
        channel: REACTION_CHANNEL,
        eventName: EVENT.DELETED,
        data: ReactionDto.fromModel(reaction)
      })
    );
    return true;
  }

  public async search(req: ReactionSearchRequestPayload): Promise<PageableData<ReactionDto>> {
    const query: Record<string, any> = {};
    if (req.objectId) {
      query.objectId = req.objectId;
    }
    const sort = {
      createdAt: -1
    } as Record<string, SortOrder>;
    const [data, total] = await Promise.all([
      this.ReactionModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.ReactionModel.countDocuments(query)
    ]);
    const reactions = data.map((d) => ReactionDto.fromModel(d));
    const UIds = data.map((d) => d.createdBy);
    const [users, performers] = await Promise.all([
      UIds.length ? this.userService.findByIds(UIds) : [],
      UIds.length ? this.performerService.findByIds(UIds) : []
    ]);
    reactions.forEach((reaction: ReactionDto) => {
      const performer = performers.find(
        (p) => p._id.toString() === reaction.createdBy.toString()
      );
      const user = users.find(
        (u) => u._id.toString() === reaction.createdBy.toString()
      );
      // eslint-disable-next-line no-param-reassign
      reaction.creator = performer || user;
    });
    return {
      data: reactions,
      total
    };
  }

  public async getListVideos(req: ReactionSearchRequestPayload, user: UserDto, jwToken: string) {
    const query: Record<string, any> = {};
    if (req.createdBy) query.createdBy = req.createdBy;
    if (req.action) query.action = req.action;
    query.objectType = REACTION_TYPE.VIDEO;

    const sort = {
      [req.sortBy || 'createdAt']: req.sort === 'desc' ? -1 : 1
    } as Record<string, SortOrder>;
    const [items, total] = await Promise.all([
      this.ReactionModel
        .find(query)
        .sort(sort)
        .limit(Number(req.limit))
        .skip(Number(req.offset)),
      this.ReactionModel.countDocuments(query)
    ]);
    const videoIds = uniq(items.map((i) => i.objectId));
    const videos = videoIds.length > 0 ? await this.videoService.findByIds(videoIds) : [];
    const fileIds = [];
    videos.forEach((v) => {
      v.thumbnailId && fileIds.push(v.thumbnailId);
      v.fileId && fileIds.push(v.fileId);
    });
    const performerIds = uniq(videos.map((v) => v.performerId));
    const [files, subscriptions, orders] = await Promise.all([
      fileIds.length ? this.fileService.findByIds(fileIds) : [],
      performerIds ? this.subscriptionService.findSubscriptionList({
        userId: user._id,
        performerIds: { $in: performerIds },
        expiredAt: { $gt: new Date() }
      }) : [],
      videoIds.length ? this.orderService.findDetailsByQuery({
        buyerId: user._id,
        productId: { $in: videoIds },
        status: ORDER_STATUS.PAID,
        productType: PRODUCT_TYPE.SALE_VIDEO
      }) : []
    ]);

    const reactions = items.map((v) => ReactionDto.fromModel(v));
    reactions.forEach((item) => {
      const video = videos.find((p) => `${p._id}` === `${item.objectId}`);
      const subscribed = video && subscriptions.find((s) => `${s.performerId}` === `${video.performerId}`);
      const bought = video && orders.find((o) => `${o.productId}` === `${video._id}`);
      if (video) {
        item.objectInfo = video || null;
        item.objectInfo.isSubscribed = !!subscribed;
        item.objectInfo.isBought = !!bought;
        if (video && video.thumbnailId) {
          const thumbnail = files.find((f) => f._id.toString() === video.thumbnailId.toString());
          if (thumbnail) {
            item.objectInfo.thumbnail = thumbnail.getUrl();
          }
        }
        if (video && video.fileId) {
          const file = files.find((f) => f._id.toString() === video.fileId.toString());
          if (file) {
            item.objectInfo.video = this.videoService.getVideoForView(file, video, jwToken);
          }
        }
      }
    });

    return {
      data: reactions,
      total
    };
  }

  public async checkExisting(objectId: string | ObjectId, userId: string | ObjectId, action: string) {
    return this.ReactionModel.countDocuments({
      objectId,
      action,
      createdBy: userId
    });
  }

  public async getListFeeds(req: ReactionSearchRequestPayload, user: UserDto, jwToken: string) {
    const query: Record<string, any> = {};
    if (req.createdBy) query.createdBy = req.createdBy;
    if (req.action) query.action = req.action;
    if (req.objectType) {
      query.objectType = req.objectType;
    }
    if (!req.objectType) {
      query.objectType = { $in: ['feed', 'feed_photo', 'feed_video'] };
    }
    const sort = {
      [req.sortBy || 'createdAt']: req.sort === 'desc' ? -1 : 1
    } as Record<string, SortOrder>;
    const [items, total] = await Promise.all([
      this.ReactionModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.ReactionModel.countDocuments(query)
    ]);
    const feedIds = uniq(items.map((i) => i.objectId));
    const feeds = await this.feedService.findByIds(feedIds, user, jwToken);
    const reactions = items.map((reaction) => ReactionDto.fromModel(reaction));
    reactions.forEach((item) => {
      const feed = feeds.find((p) => `${p._id}` === `${item.objectId}`);
      item.objectInfo = feed;
    });
    return {
      data: reactions,
      total
    };
  }
}
