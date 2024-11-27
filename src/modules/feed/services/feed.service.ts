import {
  Injectable, Inject, forwardRef, HttpException
} from '@nestjs/common';
import { Model, SortOrder } from 'mongoose';
import { ObjectId } from 'mongodb';
import {
  EntityNotFoundException, AgendaService,
  QueueEventService, QueueEvent, ForbiddenException
} from 'src/kernel';
import { uniq, difference } from 'lodash';
import { PerformerService } from 'src/modules/performer/services';
import { FileService, FILE_EVENT } from 'src/modules/file/services';
import { ReactionService } from 'src/modules/reaction/services/reaction.service';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import { OrderService } from 'src/modules/payment/services';
import { UserDto } from 'src/modules/user/dtos';
import { EVENT, STATUS } from 'src/kernel/constants';
import { REACTION } from 'src/modules/reaction/constants';
import {
  ORDER_STATUS, PAYMENT_STATUS, PRODUCT_TYPE
} from 'src/modules/payment/constants';
import { SUBSCRIPTION_STATUS } from 'src/modules/subscription/constants';
import { REF_TYPE } from 'src/modules/file/constants';
import * as moment from 'moment';
import { InjectModel } from '@nestjs/mongoose';
import { DBLoggerService } from 'src/modules/logger';
import { FeedDto, PollDto, VoteDto } from '../dtos';
import { InvalidFeedTypeException, AlreadyVotedException, PollExpiredException } from '../exceptions';
import {
  FEED_SOURCE, FEED_TYPES, POLL_TARGET_SOURCE,
  PERFORMER_FEED_CHANNEL, VOTE_FEED_CHANNEL, FEED_VIDEO_CHANNEL
} from '../constants';
import { FeedCreatePayload, FeedSearchRequest, PollCreatePayload } from '../payloads';
import { Feed, Poll, Vote } from '../schemas';

const CHECK_REF_REMOVE_FEED_FILE_AGENDA = 'CHECK_REF_REMOVE_FEED_FILE_AGENDA';
const FEED_FILE_PROCESSED_TOPIC = 'FEED_FILE_PROCESSED_TOPIC';

@Injectable()
export class FeedService {
  constructor(
    @InjectModel(Feed.name) private readonly FeedModel: Model<Feed>,
    @InjectModel(Poll.name) private readonly PollModel: Model<Poll>,
    @InjectModel(Vote.name) private readonly VoteModel: Model<Vote>,

    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
    @Inject(forwardRef(() => ReactionService))
    private readonly reactionService: ReactionService,
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => FileService))
    private readonly fileService: FileService,
    private readonly queueEventService: QueueEventService,
    private readonly agenda: AgendaService,
    private readonly logger: DBLoggerService
  ) {
    this.queueEventService.subscribe(
      FEED_VIDEO_CHANNEL,
      FEED_FILE_PROCESSED_TOPIC,
      this.handleFileProcessed.bind(this)
    );
    this.defindJobs();
  }

  private async defindJobs() {
    const collection = (this.agenda as any)._collection;
    await collection.deleteMany({
      name: {
        $in: [
          CHECK_REF_REMOVE_FEED_FILE_AGENDA
        ]
      }
    });
    this.agenda.define(CHECK_REF_REMOVE_FEED_FILE_AGENDA, {}, this.checkRefAndRemoveFile.bind(this));
    this.agenda.every('24 hours', CHECK_REF_REMOVE_FEED_FILE_AGENDA, {});
  }

  private async handleFileProcessed(event: QueueEvent) {
    const { eventName } = event;
    if (eventName !== FILE_EVENT.VIDEO_PROCESSED) {
      return false;
    }
    return false;
  }

  private async checkRefAndRemoveFile(job: any, done: any): Promise<void> {
    try {
      const total = await this.fileService.countByRefType(REF_TYPE.FEED);
      for (let i = 0; i <= total / 99; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const files = await this.fileService.findByRefType(REF_TYPE.FEED, 99, i);
        const feedIds = files.map((f) => f.refItems[0].itemId.toString());
        // eslint-disable-next-line no-await-in-loop
        const videos = await this.FeedModel.find({ _id: { $in: feedIds } });
        const Ids = videos.map((v) => v._id.toString());
        const difIds = difference(feedIds, Ids);
        const difFileIds = files.filter((file) => difIds.includes(file.refItems[0].itemId.toString()));
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(difFileIds.map(async (fileId) => this.fileService.remove(fileId)));
      }
    } catch (e) {
      this.logger.error(e.stack || e, { context: 'FeedService' });
    } finally {
      done();
    }
  }

  public async findById(id): Promise<FeedDto> {
    const data = await this.FeedModel.findById(id);
    return FeedDto.fromModel(data);
  }

  public async findByIds(ids, user, jwToken?: string) {
    const data = await this.FeedModel.find({ _id: { $in: ids } });
    const dtos = data.map((item) => FeedDto.fromModel(item));
    return this.populateFeedData(dtos, user, jwToken);
  }

  public async countFeedsByPerformer(fromSourceId, options = {}) {
    return this.FeedModel.countDocuments({
      fromSourceId,
      ...options
    });
  }

  public async handleCommentStat(feedId: string, num = 1) {
    await this.FeedModel.updateOne({ _id: feedId }, { $inc: { totalComment: num } }, { upsert: true });
  }

  private async _validatePayload(payload: FeedCreatePayload) {
    if (!FEED_TYPES.includes(payload.type)) {
      throw new InvalidFeedTypeException();
    }
  }

  private async populateFeedData(feeds: FeedDto[], user: UserDto, jwtToken = '') {
    const performerIds = uniq(
      feeds.map((f) => f.fromSourceId.toString())
    );
    const feedIds = feeds.map((f) => f._id);
    let pollIds = [];
    let fileIds = [];
    feeds.forEach((f) => {
      if (f.fileIds && f.fileIds.length) {
        fileIds = uniq(fileIds.concat(f.fileIds.concat([f?.thumbnailId || null, f?.teaserId || null])));
      }
      if (f.pollIds && f.pollIds.length) {
        pollIds = pollIds.concat(f.pollIds);
      }
    });
    const filteredIds = fileIds.filter((f) => !!f);
    const [performers, files, actions, subscriptions, orders, polls] = await Promise.all([
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      filteredIds.length ? this.fileService.findByIds(filteredIds) : [],
      user && user._id ? this.reactionService.findByQuery({ objectId: { $in: feedIds }, createdBy: user._id }) : [],
      user && user._id ? this.subscriptionService.findSubscriptionList({
        userId: user._id,
        performerId: { $in: performerIds },
        expiredAt: { $gt: new Date() },
        status: SUBSCRIPTION_STATUS.ACTIVE
      }) : [],
      user && user._id ? this.orderService.findDetailsByQuery({
        paymentStatus: PAYMENT_STATUS.SUCCESS,
        status: ORDER_STATUS.PAID,
        buyerId: user._id,
        productType: PRODUCT_TYPE.FEED,
        productId: { $in: feedIds }
      }) : [],
      pollIds.length ? this.PollModel.find({ _id: { $in: pollIds } }) : []
    ]);

    return feeds.map((feed) => {
      const performer = performers.find((p) => p._id.toString() === feed.fromSourceId.toString());
      feed.setPerformer(performer);
      const like = actions.find((l) => l.objectId.toString() === feed._id.toString() && l.action === REACTION.LIKE);
      feed.setIsLiked(!!like);
      const bookmarked = actions.find((l) => l.objectId.toString() === feed._id.toString() && l.action === REACTION.BOOKMARK);
      feed.setIsBookmarked(bookmarked);
      const subscribed = subscriptions.find((s) => `${s.performerId}` === `${feed.fromSourceId}`);
      feed.setIsSubscribed(
        !!((subscribed || (user && user._id && `${user._id}` === `${feed.fromSourceId}`) || (user && user.roles && user.roles.includes('admin'))))
      );
      const bought = orders.find((order) => `${order.productId}` === `${feed._id}`);
      feed.setIsBought(
        !!((bought || (user && user._id && `${user._id}` === `${feed.fromSourceId}`) || (user && user.roles && user.roles.includes('admin'))))
      );
      const feedFileStringIds = (feed.fileIds || []).map((fileId) => fileId.toString());
      feed.setPolls(polls);
      const feedFiles = files.filter((file) => feedFileStringIds.includes(file._id.toString()));
      feed.setFiles(feedFiles, {
        token: jwtToken
      });
      if (feed.thumbnailId) {
        const thumbnail = files.find((file) => file._id.toString() === feed.thumbnailId.toString());
        feed.setThumbnail(thumbnail);
      }
      if (feed.teaserId) {
        const teaser = files.find((file) => file._id.toString() === feed.teaserId.toString());
        feed.setTeaser(teaser);
      }
      return feed;
    });
  }

  public async findOne(id, user, jwtToken): Promise<FeedDto> {
    const feed = await this.findById(id);
    if (!feed) {
      throw new EntityNotFoundException();
    }
    const newFeed = await this.populateFeedData([feed], user, jwtToken);
    return newFeed[0];
  }

  public async create(payload: FeedCreatePayload, user: UserDto): Promise<FeedDto> {
    // TODO - validate with the feed type?
    await this._validatePayload(payload);
    const fromSourceId = user.roles && user.roles.includes('admin') && payload.fromSourceId ? payload.fromSourceId : user._id;
    const performer = await this.performerService.findById(fromSourceId);
    if (!performer) throw new EntityNotFoundException();
    const feed = await this.FeedModel.create({
      ...payload,
      orientation: performer.gender,
      fromSource: 'performer',
      fromSourceId
    });
    if (feed.fileIds && feed.fileIds.length) {
      await Promise.all(feed.fileIds.map(async (fileId) => {
        await this.fileService.addRef(fileId, {
          itemId: feed._id,
          itemType: REF_TYPE.FEED
        });
      }));
    }
    feed.teaserId && await this.fileService.addRef(feed.teaserId, {
      itemId: feed._id,
      itemType: REF_TYPE.FEED
    });
    feed.thumbnailId && await this.fileService.addRef(feed.thumbnailId, {
      itemId: feed._id,
      itemType: REF_TYPE.FEED
    });

    const dto = FeedDto.fromModel(feed);

    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_FEED_CHANNEL,
        eventName: EVENT.CREATED,
        data: dto
      })
    );
    return dto;
  }

  public async search(req: FeedSearchRequest, user: UserDto, jwtToken) {
    const query: Record<string, any> = {
      // fromSource: FEED_SOURCE.PERFORMER
    };

    if (!user.roles || !user.roles.includes('admin')) {
      query.fromSourceId = user._id;
    }

    if (user.roles && user.roles.includes('admin') && req.performerId) {
      query.fromSourceId = req.performerId;
    }

    if (req.fromDate && req.toDate) {
      query.createdAt = {
        $gte: moment(req.fromDate).startOf('date'),
        $lte: moment(req.toDate).endOf('date')
      };
    }

    if (req.orientation) {
      query.orientation = req.orientation;
    }

    if (req.type) {
      query.type = req.type;
    }

    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''),
        'i'
      );
      const searchValue = { $regex: regexp };
      query.$or = [
        { text: searchValue },
        { tagline: searchValue }
      ];
    }

    let sort: Record<string, SortOrder> = {
      updatedAt: -1
    };
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }

    const [data, total] = await Promise.all([
      this.FeedModel
        .find(query)
        .sort(user?.roles?.includes('admin') ? sort : { isPinned: -1, pinnedAt: -1, ...sort })
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.FeedModel.countDocuments(query)
    ]);

    // populate video, photo, etc...
    const dtos = data.map((feed) => FeedDto.fromModel(feed));
    return {
      data: await this.populateFeedData(dtos, user, jwtToken),
      total
    };
  }

  public async userSearchFeeds(req: FeedSearchRequest, user: UserDto, jwtToken) {
    const query: Record<string, any> = {
      fromSource: FEED_SOURCE.PERFORMER,
      status: STATUS.ACTIVE
    };

    if (req.performerId) {
      query.fromSourceId = req.performerId;
    }
    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9]/g, ''),
        'i'
      );
      const searchValue = { $regex: regexp };
      query.$or = [
        { text: searchValue },
        { tagline: searchValue }
      ];
    }
    if (req.orientation) {
      query.orientation = req.orientation;
    }
    if (req.type) {
      query.type = req.type;
    }
    if (req.fromDate && req.toDate) {
      query.createdAt = {
        $gte: moment(req.fromDate).startOf('date'),
        $lte: moment(req.toDate).endOf('date')
      };
    }
    if (req.ids) {
      query._id = { $in: req.ids };
    }
    const sort = {
      ...(req.performerId && !user?.roles?.includes('admin') && {
        isPinned: -1,
        pinnedAt: -1
      }),
      updatedAt: -1
    } as Record<string, SortOrder>;
    const [data, total] = await Promise.all([
      this.FeedModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.FeedModel.countDocuments(query)
    ]);
    // populate video, photo, etc...
    const dtos = data.map((feed) => FeedDto.fromModel(feed));
    return {
      data: await this.populateFeedData(dtos, user, jwtToken),
      total
    };
  }

  public async searchSubscribedPerformerFeeds(req: FeedSearchRequest, user: UserDto, jwtToken: string) {
    const query: Record<string, any> = {
      fromSource: FEED_SOURCE.PERFORMER,
      status: STATUS.ACTIVE
    };

    const [subscriptions] = await Promise.all([
      user && user._id ? this.subscriptionService.findSubscriptionList({
        userId: user._id,
        expiredAt: { $gt: new Date() },
        status: SUBSCRIPTION_STATUS.ACTIVE
      }) : []
    ]);
    const performerIds = subscriptions.map((s) => s.performerId);
    query.fromSourceId = { $in: performerIds };
    if (user && user.isPerformer) delete query.fromSourceId;
    if (req.q) {
      query.$or = [
        {
          text: { $regex: new RegExp(req.q, 'i') }
        }
      ];
    }
    if (req.type) {
      query.type = req.type;
    }
    if (req.orientation) {
      query.orientation = req.orientation;
    }
    if (req.fromDate && req.toDate) {
      query.createdAt = {
        $gte: moment(req.fromDate).startOf('date'),
        $lte: moment(req.toDate).endOf('date')
      };
    }
    const sort = {
      ...(req.performerId && !user?.roles?.includes('admin') && {
        isPinned: -1,
        pinnedAt: -1
      }),
      updatedAt: -1
    } as Record<string, SortOrder>;
    const [data, total] = await Promise.all([
      this.FeedModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.FeedModel.countDocuments(query)
    ]);
    // populate video, photo, etc...
    const dtos = data.map((feed) => FeedDto.fromModel(feed));
    return {
      data: await this.populateFeedData(dtos, user, jwtToken),
      total
    };
  }

  public async updateFeed(id: string, user: UserDto, payload: FeedCreatePayload): Promise<FeedDto> {
    const feed = await this.FeedModel.findById(id);
    const oldStatus = feed.status;
    if (!feed || ((!user.roles || !user.roles.includes('admin')) && feed.fromSourceId.toString() !== user._id.toString())) throw new EntityNotFoundException();
    const data = {
      ...payload,
      updatedAt: new Date()
    };
    await this.FeedModel.updateOne({ _id: id }, data, { upsert: true });
    if (payload.fileIds && payload.fileIds.length) {
      const ids = feed.fileIds.map((_id) => _id.toString());
      const Ids = payload.fileIds.filter((_id) => !ids.includes(_id));
      Ids.forEach((fileId) => {
        this.fileService.addRef(fileId, {
          itemId: feed._id,
          itemType: REF_TYPE.FEED
        });
      });
    }

    // new data
    const newData = await this.findById(feed._id);
    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_FEED_CHANNEL,
        eventName: EVENT.UPDATED,
        data: {
          ...newData,
          oldStatus
        }
      })
    );

    return newData;
  }

  public async deleteFeed(id: string | ObjectId | any, user: UserDto) {
    const query = { _id: id, fromSourceId: user._id };
    if (user.roles && user.roles.includes('admin')) delete query.fromSourceId;

    const feed = await this.findById(id);
    if (!feed) {
      throw new EntityNotFoundException();
    }
    if (!user.roles?.includes('admin') && feed.fromSourceId.toString() !== user._id.toString()) throw new ForbiddenException();

    await this.FeedModel.deleteOne({ _id: id });

    // delete files
    if (feed.fileIds && feed.fileIds.length > 0) {
      await feed.fileIds.reduce(async (lp, fileId) => {
        await lp;
        await this.fileService.remove(fileId);
        return Promise.resolve();
      }, Promise.resolve());
    }
    feed.thumbnailId && (await this.fileService.remove(feed.thumbnailId));
    feed.teaserId && (await this.fileService.remove(feed.teaserId));

    // delete poll & vote
    await this.PollModel.deleteMany({ _id: { $in: feed.pollIds } });
    await this.VoteModel.deleteMany({ targetId: { $in: feed.pollIds } });

    // update assets count
    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_FEED_CHANNEL,
        eventName: EVENT.DELETED,
        data: feed
      })
    );
    return { success: true };
  }

  public async deleteFeedToReport(id: string | ObjectId) {
    const feed = await this.FeedModel.findById(id);
    if (!feed) throw new EntityNotFoundException();
    await this.FeedModel.deleteOne({ _id: id });

    // delete files
    if (feed.fileIds && feed.fileIds.length > 0) {
      await feed.fileIds.reduce(async (lp, fileId) => {
        await lp;
        await this.fileService.remove(fileId);
        return Promise.resolve();
      }, Promise.resolve());
    }
    feed.thumbnailId && (await this.fileService.remove(feed.thumbnailId));
    feed.teaserId && (await this.fileService.remove(feed.teaserId));

    // delete poll & vote
    await this.PollModel.deleteMany({ _id: { $in: feed.pollIds } });
    await this.VoteModel.deleteMany({ targetId: { $in: feed.pollIds } });

    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_FEED_CHANNEL,
        eventName: EVENT.DELETED,
        data: feed
      })
    );
    return { success: true };
  }

  public async checkAuth(req: any, user: UserDto) {
    const { query } = req;
    if (!query.feedId) {
      throw new ForbiddenException();
    }
    if (user.roles && user.roles.indexOf('admin') > -1) {
      return true;
    }
    // check type video
    const feed = await this.FeedModel.findById(query.feedId);
    if (!feed) throw new EntityNotFoundException();
    if (user._id.toString() === feed.fromSourceId.toString()) {
      return true;
    }
    if (!feed.isSale) {
      // check subscription
      const subscribed = await this.subscriptionService.checkSubscribed(
        feed.fromSourceId,
        user._id
      );
      if (!subscribed) {
        throw new ForbiddenException();
      }
      return true;
    } if (feed.isSale) {
      // check bought
      const bought = await this.orderService.findOneOderDetails({
        paymentStatus: PAYMENT_STATUS.SUCCESS,
        status: ORDER_STATUS.PAID,
        buyerId: user._id,
        productType: PRODUCT_TYPE.FEED,
        productId: feed._id
      });
      if (!bought) {
        throw new ForbiddenException();
      }
      return true;
    }
    throw new ForbiddenException();
  }

  public async createPoll(payload: PollCreatePayload, user: UserDto) {
    if (payload.description.trim() === '') {
      throw new HttpException('Invalid poll name', 406);
    }
    const poll = new this.PollModel({
      ...payload,
      description: payload.description.trimStart(),
      createdBy: user.roles && user.roles.includes('admin') && payload.performerId ? payload.performerId : user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await poll.save();
    return PollDto.fromModel(poll);
  }

  public async votePollFeed(pollId: string | ObjectId, user: UserDto): Promise<any> {
    const poll = await this.PollModel.findById(pollId);
    if (!poll || !poll.refId) {
      throw new EntityNotFoundException();
    }
    if (new Date(poll.expiredAt) < new Date()) {
      throw new PollExpiredException();
    }
    const vote = await this.VoteModel.findOne({
      targetSource: POLL_TARGET_SOURCE.FEED,
      refId: poll.refId,
      fromSourceId: user._id
    });

    if (vote) {
      throw new AlreadyVotedException();
    }

    const newVote = await this.VoteModel.create({
      targetSource: POLL_TARGET_SOURCE.FEED,
      targetId: pollId,
      refId: poll.refId,
      fromSource: 'user',
      fromSourceId: user._id
    });
    const dto = VoteDto.fromModel(newVote);
    await this.queueEventService.publish(
      new QueueEvent({
        channel: VOTE_FEED_CHANNEL,
        eventName: EVENT.CREATED,
        data: dto
      })
    );

    return { voted: true };
  }

  public async pinToProfile(id: string, user: UserDto) {
    const feed = await this.FeedModel.findById(id);
    if (!feed) throw new EntityNotFoundException();
    if (((!user.roles || !user.roles.includes('admin')) && feed.fromSourceId.toString() !== user._id.toString())) throw new ForbiddenException();
    if (feed.isPinned) return true;
    await this.FeedModel.updateOne({ _id: feed._id }, { $set: { isPinned: true, pinnedAt: new Date() } });
    return true;
  }

  public async unpinToProfile(id: string, user: UserDto) {
    const feed = await this.FeedModel.findById(id);
    if (!feed) throw new EntityNotFoundException();
    if (((!user.roles || !user.roles.includes('admin')) && feed.fromSourceId.toString() !== user._id.toString())) throw new ForbiddenException();
    if (!feed.isPinned) return true;
    await this.FeedModel.updateOne({ _id: feed._id }, { $set: { isPinned: false, pinnedAt: null } });
    return true;
  }
}
