import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model, SortOrder } from 'mongoose';
import { PageableData } from 'src/kernel/common';
import * as moment from 'moment';
import { PerformerBlockService } from 'src/modules/block/services';
import { UserDto } from 'src/modules/user/dtos';
import { OFFLINE } from 'src/modules/stream/constant';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import { InjectModel } from '@nestjs/mongoose';
import { PerformerDto } from '../dtos';
import { PerformerSearchPayload } from '../payloads';
import { PERFORMER_STATUSES } from '../constants';
import { PerformerCacheService } from './performer-cache.service';
import { Performer } from '../schemas';

@Injectable()
export class PerformerSearchService {
  constructor(
    @InjectModel(Performer.name) private readonly PerformerModel: Model<Performer>,
    @Inject(forwardRef(() => PerformerBlockService))
    private readonly performerBlockService: PerformerBlockService,
    private readonly performerCacheService: PerformerCacheService,
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService
  ) { }

  public async adminSearch(req: PerformerSearchPayload): Promise<PageableData<Partial<PerformerDto>>> {
    const query: Record<string, any> = {};
    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''),
        'i'
      );
      query.$or = [
        {
          firstName: { $regex: regexp }
        },
        {
          lastName: { $regex: regexp }
        },
        {
          name: { $regex: regexp }
        },
        {
          email: { $regex: regexp }
        },
        {
          username: { $regex: regexp }
        }
      ];
    }
    if (req.performerIds) {
      query._id = Array.isArray(req.performerIds) ? { $in: req.performerIds } : { $in: [req.performerIds] };
    }
    if (req.status) {
      query.status = req.status;
    }
    if (req.gender) {
      query.gender = req.gender;
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
      this.PerformerModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.PerformerModel.countDocuments(query)
    ]);
    return {
      data: data.map((item) => PerformerDto.fromModel(item).toResponse(true)),
      total
    };
  }

  public async search(req: PerformerSearchPayload, user: UserDto, countryCode: string): Promise<PageableData<Partial<PerformerDto>>> {
    const query: Record<string, any> = {
      status: PERFORMER_STATUSES.ACTIVE
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
          username: { $regex: regexp }
        }
      ];
    }
    [
      'hair',
      'pubicHair',
      'ethnicity',
      'country',
      'bodyType',
      'gender',
      'height',
      'weight',
      'eyes',
      'butt',
      'agentId',
      'sexualPreference'
    ].forEach((f) => {
      if (req[f]) {
        query[f] = req[f];
      }
    });
    if (user) {
      query._id = { $ne: user._id };
    }
    if (req.performerIds) {
      query._id = Array.isArray(req.performerIds) ? { $in: req.performerIds } : { $in: [req.performerIds] };
    }
    if (req.categoryIds) {
      query.categoryIds = Array.isArray(req.categoryIds) ? { $in: req.categoryIds } : req.categoryIds;
    }
    if (req.age) {
      const fromAge = req.age.split('_')[0];
      const toAge = req.age.split('_')[1];
      const fromDate = moment().subtract(toAge, 'years').startOf('day').toDate();
      const toDate = moment().subtract(fromAge, 'years').startOf('day').toDate();
      query.dateOfBirth = {
        $gte: fromDate,
        $lte: toDate
      };
    }
    if (req.gender) {
      query.gender = req.gender;
    }
    if (countryCode) {
      const blockCountries = await this.performerBlockService.findBlockCountriesByQuery({ countryCodes: { $in: [countryCode] } });
      const performerIds = blockCountries.map((b) => b.sourceId);
      if (performerIds.length > 0) {
        query._id = { $nin: performerIds };
      }
    }
    if (user) {
      const blockUsers = await this.performerBlockService.listByQuery({ targetId: user._id });
      if (blockUsers.length) {
        const performerIds = blockUsers.map((b) => b.sourceId);
        if (!query.$and) {
          query.$and = [];
        }
        query.$and.push({
          _id: { $nin: performerIds }
        });
      }
    }
    const activePerformers = await this.performerCacheService.getActivePerformers();
    if (query.performerId || query.performerIds) {
      // check if exist in the active list
      const hasItem = activePerformers.includes(
        query.performerId || query.performerIds
      );
      if (!hasItem) {
        return {
          data: [],
          total: 0
        };
      }
    } else {
      query._id = {
        $in: activePerformers
      };
    }
    if (req.type === 'live') {
      query.streamingStatus = {
        $ne: OFFLINE
      };
    }
    if (req.type === 'subscribed') {
      if (!user?._id) {
        return {
          data: [],
          total: 0
        };
      }
      const subscriptions = await this.subscriptionService.findSubscriptionList({
        userId: user._id,
        expiredAt: { $gt: new Date() }
      });
      if (subscriptions.length === 0) {
        return {
          data: [],
          total: 0
        };
      }
      const performerIds = subscriptions.map((s) => s.performerId);
      query._id = {
        $in: performerIds
      };
    }
    let sort: Record<string, SortOrder> | string = {
      createdAt: -1
    };
    if (req.sortBy === 'latest') {
      sort = '-createdAt';
    }
    if (req.sortBy === 'oldest') {
      sort = 'createdAt';
    }
    if (req.sortBy === 'popular') {
      sort = '-score';
    }
    if (req.sortBy === 'subscriber') {
      sort = '-stats.subscribers';
    }

    const [data, total] = await Promise.all([
      this.PerformerModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.PerformerModel.countDocuments(query)
    ]);
    return {
      data: data.map((item) => PerformerDto.fromModel(item).toResponse()),
      total
    };
  }

  public async searchByKeyword(
    req: PerformerSearchPayload
  ): Promise<any> {
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
          email: { $regex: regexp }
        },
        {
          username: { $regex: regexp }
        }
      ];
    }

    const [data] = await Promise.all([
      this.PerformerModel
        .find(query)
    ]);
    return data;
  }
}
