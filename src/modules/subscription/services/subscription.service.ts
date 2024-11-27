import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import * as moment from 'moment';
import {
  PageableData,
  EntityNotFoundException
} from 'src/kernel';
import { ObjectId } from 'mongodb';
import { UserService } from 'src/modules/user/services';
import { PerformerService } from 'src/modules/performer/services';
import { UserDto } from 'src/modules/user/dtos';
import { InjectModel } from '@nestjs/mongoose';
import {
  SubscriptionCreatePayload,
  SubscriptionSearchRequestPayload
} from '../payloads';
import { SubscriptionDto } from '../dtos/subscription.dto';
import {
  SUBSCRIPTION_TYPE,
  SUBSCRIPTION_STATUS
} from '../constants';
import { Subscription } from '../schemas/subscription.schema';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(Subscription.name) private readonly SubsciptionModel: Model<Subscription>,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService
  ) { }

  public async findSubscriptionList(query: Record<string, any>) {
    const items = await this.SubsciptionModel.find(query);
    return items.map((item) => SubscriptionDto.fromModel(item));
  }

  public async countSubscriptions(query: Record<string, any>) {
    return this.SubsciptionModel.countDocuments(query);
  }

  public async adminCreate(
    data: SubscriptionCreatePayload
  ): Promise<SubscriptionDto> {
    const payload: Record<string, any> = { ...data };
    const existSubscription = await this.SubsciptionModel.findOne({
      userId: payload.userId,
      performerId: payload.performerId
    });

    if (existSubscription) {
      const oldStatus = existSubscription.status;
      // existSubscription.nextRecurringDate = null;
      // existSubscription.startRecurringDate = new Date();
      existSubscription.expiredAt = new Date(payload.expiredAt);
      existSubscription.updatedAt = new Date();
      existSubscription.subscriptionType = payload.subscriptionType || SUBSCRIPTION_TYPE.SYSTEM;
      existSubscription.status = payload.status;
      existSubscription.subscriptionId = payload.subscriptionId;
      await existSubscription.save();
      if (oldStatus !== existSubscription.status && existSubscription.status === SUBSCRIPTION_STATUS.DEACTIVATED) {
        await this.performerService.updateSubscriptionStat(existSubscription.performerId, -1);
      } else if (oldStatus !== existSubscription.status && existSubscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
        await this.performerService.updateSubscriptionStat(existSubscription.performerId, 1);
      }
      return SubscriptionDto.fromModel(existSubscription);
    }
    // payload.startRecurringDate = new Date();
    payload.createdAt = new Date();
    payload.updatedAt = new Date();
    const newSubscription = await this.SubsciptionModel.create(payload);
    if (newSubscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
      await this.performerService.updateSubscriptionStat(newSubscription.performerId, 1);
    }
    return SubscriptionDto.fromModel(newSubscription);
  }

  public async adminSearch(
    req: SubscriptionSearchRequestPayload
  ): Promise<PageableData<SubscriptionDto>> {
    const query: Record<string, any> = {};
    if (req.userId) {
      query.userId = req.userId;
    }
    if (req.performerId) {
      query.performerId = req.performerId;
    }
    if (req.subscriptionType) {
      query.subscriptionType = req.subscriptionType;
    }
    const sort = {
      [req.sortBy || 'updatedAt']: req.sort || 'desc'
    };

    const [data, total] = await Promise.all([
      this.SubsciptionModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.SubsciptionModel.countDocuments(query)
    ]);
    const subscriptions = data.map((d) => SubscriptionDto.fromModel(d));
    const UIds = data.map((d) => d.userId);
    const PIds = data.map((d) => d.performerId);
    const [users, performers] = await Promise.all([
      UIds.length ? this.userService.findByIds(UIds) : [],
      PIds.length ? this.performerService.findByIds(PIds) : []
    ]);
    subscriptions.forEach((subscription: SubscriptionDto) => {
      const performer = performers.find(
        (p) => p._id.equals(subscription.performerId)
      );
      const user = users.find(
        (u) => u._id.equals(subscription.userId)
      );
      subscription.setUserInfo(user);
      subscription.setPerformerInfo(performer);
    });
    return {
      data: subscriptions,
      total
    };
  }

  public async performerSearch(
    req: SubscriptionSearchRequestPayload,
    user: UserDto
  ): Promise<PageableData<SubscriptionDto>> {
    const query: Record<string, any> = {
      performerId: user._id
    };
    if (req.userId) {
      query.userId = req.userId;
    }
    if (req.subscriptionType) {
      query.subscriptionType = req.subscriptionType;
    }
    const sort = {
      [req.sortBy || 'updatedAt']: req.sort || -1
    };
    const [data, total] = await Promise.all([
      this.SubsciptionModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.SubsciptionModel.countDocuments(query)
    ]);
    const subscriptions = data.map((d) => SubscriptionDto.fromModel(d));
    const UIds = data.map((d) => d.userId);
    const [users] = await Promise.all([
      UIds.length ? this.userService.findByIds(UIds) : []
    ]);
    subscriptions.forEach((subscription: SubscriptionDto) => {
      const userSearch = users.find(
        (u) => u._id.toString() === subscription.userId.toString()
      );
      subscription.setUserInfo(userSearch);
    });
    return {
      data: subscriptions,
      total
    };
  }

  public async userSearch(
    req: SubscriptionSearchRequestPayload,
    user: UserDto
  ): Promise<PageableData<SubscriptionDto>> {
    const query: Record<string, any> = {
      userId: user._id
    };
    if (req.performerId) {
      query.performerId = req.performerId;
    }
    if (req.subscriptionType) {
      query.subscriptionType = req.subscriptionType;
    }
    const sort = {
      [req.sortBy || 'updatedAt']: req.sort || -1
    };
    const [data, total] = await Promise.all([
      this.SubsciptionModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.SubsciptionModel.countDocuments(query)
    ]);
    const subscriptions = data.map((d) => SubscriptionDto.fromModel(d));
    const UIds = data.map((d) => d.userId);
    const PIds = data.map((d) => d.performerId);
    const [users, performers] = await Promise.all([
      UIds.length ? this.userService.findByIds(UIds) : [],
      PIds.length ? this.performerService.findByIds(PIds) : []
    ]);
    subscriptions.forEach((subscription: SubscriptionDto) => {
      const performer = performers.find(
        (p) => p._id.equals(subscription.performerId)
      );
      const userSearch = users.find(
        (u) => u._id.equals(subscription.userId)
      );
      subscription.setPerformerInfo(performer);
      subscription.setUserInfo(userSearch);
    });
    return {
      data: subscriptions,
      total
    };
  }

  public async checkSubscribed(
    performerId: string | ObjectId | any,
    userId: string | ObjectId
  ): Promise<any> {
    if (performerId.toString() === userId.toString()) {
      return 1;
    }
    const item = await this.SubsciptionModel.findOne({
      performerId,
      userId
    });
    if (!item) return false;
    // from payment gateway, even deactivate -> still allow subscription
    if (['verotel', 'ccbill', 'emerchant'].includes(item.paymentGateway) && moment(item.expiredAt).endOf('day').isAfter(new Date())) {
      return true;
    }

    return item.status === 'active' && moment(item.expiredAt).endOf('day').isAfter(new Date());
  }

  public async findOneSubscription(
    performerId: string | ObjectId,
    userId: string | ObjectId
  ) {
    const subscription = await this.SubsciptionModel.findOne({
      performerId,
      userId
    });
    return subscription;
  }

  public async performerTotalSubscriptions(performerId: string | ObjectId) {
    return this.SubsciptionModel.countDocuments({ performerId, expiredAt: { $gt: new Date() } });
  }

  public async findById(id: string | ObjectId): Promise<SubscriptionDto> {
    const data = await this.SubsciptionModel.findById(id);
    return SubscriptionDto.fromModel(data);
  }

  public async delete(id: string | ObjectId): Promise<boolean> {
    const subscription = await this.SubsciptionModel.findById(id);
    if (!subscription) {
      throw new EntityNotFoundException();
    }
    await subscription.deleteOne();
    await this.performerService.updateSubscriptionStat(subscription.performerId, -1);
    return true;
  }

  public async findBySubscriptionId(subscriptionId: string): Promise<SubscriptionDto> {
    const item = await this.SubsciptionModel.findOne({
      subscriptionId
    });
    if (!item) return null;
    return SubscriptionDto.fromModel(item);
  }

  public async getAllSubscribers(performerId) {
    return this.SubsciptionModel.find({
      performerId,
      expiredAt: { $gt: new Date() }
    }).select('userId');
  }

  public async totalSubscribers() {
    return this.SubsciptionModel.countDocuments();
  }

  public async totalActiveSubscribers() {
    return this.SubsciptionModel.countDocuments({ expiredAt: { $gt: new Date() } });
  }
}
