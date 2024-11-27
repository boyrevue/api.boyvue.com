import { Injectable } from '@nestjs/common';
import { Model, SortOrder } from 'mongoose';
import { EntityNotFoundException, PageableData } from 'src/kernel';
import { toObjectId } from 'src/kernel/helpers/string.helper';
import { STATUSES } from 'src/modules/payout-request/constants';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import * as moment from 'moment';
import {
  EarningSearchRequest,
  UpdateEarningStatusPayload
} from '../payloads';
import { UserService } from '../../user/services';
import { PerformerService } from '../../performer/services';
import { EarningDto, IEarningStatResponse } from '../dtos/earning.dto';
import { OrderService, PaymentService } from '../../payment/services';
import { Earning } from '../schemas/earning.schema';

@Injectable()
export class EarningService {
  constructor(
    @InjectModel(Earning.name) private readonly EarningModel: Model<Earning>,
    private readonly userService: UserService,
    private readonly performerService: PerformerService,
    private readonly paymentService: PaymentService,
    private readonly orderService: OrderService
  ) { }

  public async search(req: EarningSearchRequest): Promise<PageableData<EarningDto>> {
    const query: Record<string, any> = {};
    if (req.userId) query.userId = req.userId;
    if (req.performerId) query.performerId = req.performerId;
    if (req.transactionId) query.transactionId = req.transactionId;
    if (req.sourceType) query.sourceType = req.sourceType;
    if (req.type) query.type = req.type;
    if (req.payoutStatus) query.payoutStatus = req.payoutStatus;
    if (req.paymentStatus) query.paymentStatus = req.paymentStatus;
    if (req.isPaid !== null && req.isPaid !== undefined) query.isPaid = req.isPaid;
    if (req.userUsername) {
      query.userUsername = {
        $regex: new RegExp(
          req.userUsername.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''),
          'i'
        )
      };
    }

    if (req.performerUsername) {
      query.userUsername = {
        $regex: new RegExp(
          req.performerUsername.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''),
          'i'
        )
      };
    }

    const sort: Record<string, SortOrder> | any = {
      [req.sortBy || 'createdAt']: req.sort || 1
    };

    if (req.fromDate && req.toDate) {
      query.createdAt = {
        $gt: new Date(req.fromDate),
        $lte: new Date(req.toDate)
      };
    }
    const [data, total] = await Promise.all([
      this.EarningModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.EarningModel.countDocuments(query)
    ]);
    const earnings = data.map((d) => EarningDto.fromModel(d));
    const PIds = data.map((d) => d.performerId);
    const UIds = data.map((d) => d.userId);
    const [performers, users] = await Promise.all([
      this.performerService.findByIds(PIds) || [],
      this.userService.findByIds(UIds) || []
    ]);

    earnings.forEach((earning: EarningDto) => {
      const performer = performers.find(
        (p) => p._id.toString() === earning.performerId.toString()
      );
      const user = users.find(
        (p) => p._id.toString() === earning.userId.toString()
      );
      earning.setPerformerInfo(performer);
      earning.setUserInfo(user);
    });
    return {
      data: earnings,
      total
    };
  }

  public async details(id: string) {
    const earning = await this.EarningModel.findById(toObjectId(id));
    if (!earning) throw new EntityNotFoundException();
    const transaction = await this.paymentService.findById(earning.transactionId);
    if (!transaction) {
      throw new EntityNotFoundException();
    }
    const [user, performer] = await Promise.all([
      this.userService.findById(earning.userId),
      this.performerService.findById(earning.performerId)
    ]);
    const data = EarningDto.fromModel(earning);
    data.setUserInfo(user);
    data.setPerformerInfo(performer);

    if (earning?.orderId) {
      const order = await this.orderService.getOrderDetails(earning.orderId);
      if (order) {
        data.order = order;
      }
    }
    data.transactionInfo = transaction;
    return data;
  }

  public async stats(req: EarningSearchRequest): Promise<IEarningStatResponse> {
    const query: Record<string, any> = {};
    if (req.performerId) query.performerId = toObjectId(req.performerId);
    if (req.userId) query.userId = toObjectId(req.userId);
    if (req.transactionId) query.transactionId = req.transactionId;
    if (req.sourceType) query.sourceType = req.sourceType;
    if (req.type) query.type = req.type;
    if (req.payoutStatus) query.payoutStatus = req.payoutStatus;
    if (req.fromDate && req.toDate) {
      query.createdAt = {
        $gt: new Date(req.fromDate),
        $lte: new Date(req.toDate)
      };
    }
    const [totalGrossPrice, totalNetPrice, paidPrice] = await Promise.all([
      this.EarningModel.aggregate<any>([
        {
          $match: query
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$grossPrice'
            }
          }
        }
      ]),
      this.EarningModel.aggregate<any>([
        {
          $match: query
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$netPrice'
            }
          }
        }
      ]),
      this.EarningModel.aggregate<any>([
        {
          $match: {
            ...query,
            isPaid: true
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$netPrice'
            }
          }
        }
      ])
    ]);
    const totalGross = (totalGrossPrice && totalGrossPrice.length && totalGrossPrice[0].total) || 0;
    const totalNet = (totalNetPrice && totalNetPrice.length && totalNetPrice[0].total) || 0;
    const totalCommission = totalGross && totalNet ? (totalGross - totalNet) : 0;
    const totalPaidPrice = (paidPrice && paidPrice.length && paidPrice[0].total) || 0;
    return {
      totalGrossPrice: totalGross,
      totalNetPrice: totalNet,
      paidPrice: totalPaidPrice,
      totalCommission
    };
  }

  public async updatePaidStatus(payload: UpdateEarningStatusPayload): Promise<boolean> {
    const query: Record<string, any> = {};

    if (payload.performerId) query.performerId = payload.performerId;
    if (payload.fromDate && payload.toDate) {
      query.createdAt = {
        $gte: new Date(payload.fromDate),
        $lte: new Date(payload.toDate)
      };
    }

    await this.EarningModel.updateMany(query, {
      $set: {
        payoutStatus: STATUSES.DONE,
        isPaid: true,
        paidAt: new Date()
      }
    });
    return true;
  }

  public async updatePayoutStatus(payload: UpdateEarningStatusPayload): Promise<any> {
    const query: Record<string, any> = {};

    if (payload.performerId) query.performerId = payload.performerId;
    if (payload.fromDate && payload.toDate) {
      query.createdAt = {
        $gte: new Date(payload.fromDate),
        $lte: new Date(payload.toDate)
      };
    }

    return this.EarningModel.updateMany(query, {
      $set: {
        payoutStatus: payload.payoutStatus
      }
    });
  }

  public async getPerformerBalance(performerId) {
    const data = await this.EarningModel.aggregate<any>([
      {
        $match: {
          performerId: toObjectId(performerId),
          isPaid: false
        }
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: '$netPrice'
          }
        }
      }
    ]);
    return data?.length ? data[0].total : 0;
  }

  /**
   * for stats
   * @returns
   */
  public async totalGrossAmount() {
    const data = await this.EarningModel.aggregate<any>([
      {
        $group: {
          _id: null,
          total: {
            $sum: '$grossPrice'
          }
        }
      }
    ]);

    return (data?.length && data[0]?.total) || 0;
  }

  /**
   * for stats
   * @returns
   */
  public async totalNetAmount() {
    const data = await this.EarningModel.aggregate<any>([
      {
        $group: {
          _id: null,
          total: {
            $sum: '$netPrice'
          }
        }
      }
    ]);

    return (data?.length && data[0]?.total) || 0;
  }

  public async totalUnpaidAmountByPerformerId(performerId: string | ObjectId | any, options?: Record<string, any>): Promise<number> {
    const {
      fromDate = null,
      toDate = null
    } = options || {};
    const matchQuery: Record<string, any> = {
      isPaid: false,
      performerId: toObjectId(performerId)
    };
    if (fromDate && toDate) {
      matchQuery.createdAt = {
        $gte: moment(fromDate).startOf('day').toDate(),
        $lte: moment(toDate).endOf('day').toDate()
      };
    }
    const unpaidPrice = await this.EarningModel.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: '$netPrice'
          }
        }
      }
    ]);

    return unpaidPrice?.length ? unpaidPrice[0].total : 0;
  }

  public async statsAll() {
    const [unpaidPrice, totalPrice] = await Promise.all([
      this.EarningModel.aggregate([
        {
          $match: {
            isPaid: false
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$netPrice'
            }
          }
        }
      ]),
      this.EarningModel.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: '$netPrice'
            }
          }
        }
      ])
    ]);

    const unpaid = unpaidPrice?.length ? unpaidPrice[0].total : 0;
    const paid = (totalPrice?.length ? totalPrice[0].total : 0) - unpaid;

    return {
      unpaidPrice: unpaid,
      paidPrice: paid,
      totalPrice: totalPrice?.length ? totalPrice[0].total : 0
    };
  }
}
