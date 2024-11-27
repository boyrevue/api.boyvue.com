import {
  Injectable, Inject, ForbiddenException, forwardRef, HttpException
} from '@nestjs/common';
import { Model, SortOrder } from 'mongoose';
import { ObjectId } from 'mongodb';
import { PerformerDto } from 'src/modules/performer/dtos';
import { PerformerService } from 'src/modules/performer/services';
import { MailerService } from 'src/modules/mailer';
import { SettingService } from 'src/modules/settings';
import { SETTING_KEYS } from 'src/modules/settings/constants';
import {
  EntityNotFoundException,
  QueueEventService,
  QueueEvent
} from 'src/kernel';
import { merge, uniq } from 'lodash';
import { toObjectId } from 'src/kernel/helpers/string.helper';
import * as moment from 'moment';
import { UserDto } from 'src/modules/user/dtos';
import { EVENT } from 'src/kernel/constants';
import { EarningService } from 'src/modules/earning/services/earning.service';
import { InjectModel } from '@nestjs/mongoose';
import {
  PAYMENT_ACCOUNT_TYPE,
  PAYOUT_REQUEST_CHANEL, SOURCE_TYPE, STATUSES
} from '../constants';
import { DuplicateRequestException } from '../exceptions';
import { PayoutRequestDto } from '../dtos/payout-request.dto';
import {
  PayoutRequestCreatePayload,
  PayoutRequestSearchPayload,
  PayoutRequestUpdatePayload,
  PayoutRequestPerformerUpdatePayload
} from '../payloads/payout-request.payload';
import { PayoutRequest } from '../schemas/payout-request.schema';

@Injectable()
export class PayoutRequestService {
  constructor(
    @InjectModel(PayoutRequest.name) private readonly PayoutRequestModel: Model<PayoutRequest>,

    @Inject(forwardRef(() => QueueEventService))
    private readonly queueEventService: QueueEventService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => EarningService))
    private readonly earningService: EarningService,
    @Inject(forwardRef(() => MailerService))
    private readonly mailService: MailerService,
    @Inject(forwardRef(() => SettingService))
    private readonly settingService: SettingService
  ) { }

  public async search(
    req: PayoutRequestSearchPayload,
    user?: UserDto
  ): Promise<any> {
    const query: Record<string, any> = {};
    if (req.sourceId) {
      query.sourceId = toObjectId(req.sourceId);
    }

    if (req.source) {
      query.source = req.source;
    }

    if (req.status) {
      query.status = req.status;
    }

    let sort: Record<string, SortOrder> = {
      updatedAt: -1
    };

    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }

    if (req.fromDate && req.toDate) {
      query.createdAt = {
        $gte: moment(req.fromDate).startOf('day').toDate(),
        $lte: moment(req.toDate).endOf('day').toDate()
      };
    }

    const [data, total] = await Promise.all([
      this.PayoutRequestModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(Number(req.limit))
        .skip(Number(req.offset)),
      this.PayoutRequestModel.countDocuments(query)
    ]);
    const requests = data.map((d) => PayoutRequestDto.fromModel(d));
    if (user?.roles?.includes('admin')) {
      const sourceIds = uniq(requests.map((r) => r.sourceId));
      const sources = await this.performerService.findByIds(sourceIds);
      requests.forEach((request: PayoutRequestDto) => {
        const sourceInfo = sources.find((s) => s && s._id.toString() === request.sourceId.toString());
        request.setSourceInfo(sourceInfo);
      });
    }
    return {
      total,
      data: requests
    };
  }

  public async findById(id: string | object): Promise<PayoutRequestDto> {
    const request = await this.PayoutRequestModel.findById(id);
    if (!request) return null;

    return PayoutRequestDto.fromModel(request);
  }

  public async performerCreate(
    payload: PayoutRequestCreatePayload,
    user: PerformerDto
  ): Promise<PayoutRequestDto> {
    const query = {
      sourceId: user._id,
      status: STATUSES.PENDING
    };
    const request = await this.PayoutRequestModel.findOne(query);
    if (request) {
      throw new DuplicateRequestException();
    }
    const unpaidPrice = await this.earningService.totalUnpaidAmountByPerformerId(user._id, {
      fromDate: payload.fromDate,
      toDate: payload.toDate
    });

    if (!unpaidPrice) {
      throw new HttpException('There is no balance for this request!', 400);
    }

    const data = {
      ...payload,
      fromDate: moment(payload.fromDate).startOf('day').toDate(),
      toDate: moment(payload.toDate).endOf('day').toDate(),
      sourceId: user._id,
      sourceUsername: user.username,
      updatedAt: new Date(),
      createdAt: new Date()
    } as Record<string, any>;

    data.requestedPrice = unpaidPrice;
    if (data.paymentAccountType === PAYMENT_ACCOUNT_TYPE.BANKING) {
      data.paymentAccountInfo = await this.performerService.getBankingSettings(user._id);
      if (!data.paymentAccountInfo || !data.paymentAccountInfo.firstName || !data.paymentAccountInfo.lastName || !data.paymentAccountInfo.bankAccount) {
        throw new HttpException('Missing banking informations', 404);
      }
    }
    if (data.paymentAccountType === PAYMENT_ACCOUNT_TYPE.PAYPAL) {
      const paymentAccountInfo = await this.performerService.getPaymentSetting(user._id, 'paypal');
      if (!paymentAccountInfo || !paymentAccountInfo.value || !paymentAccountInfo.value.email) {
        throw new HttpException('Missing paypal account information', 404);
      }
      data.paymentAccountInfo = paymentAccountInfo?.value || null;
    }
    const resp = await this.PayoutRequestModel.create(data);
    const adminEmail = (await this.settingService.getKeyValue(SETTING_KEYS.ADMIN_EMAIL)) || process.env.ADMIN_EMAIL;
    adminEmail && await this.mailService.send({
      subject: 'New payout request',
      to: adminEmail,
      data: {
        request: resp,
        requestName: user?.name || user?.username || 'N/A'
      },
      template: 'admin-payout-request'
    });
    return PayoutRequestDto.fromModel(resp);
  }

  public async calculateByDate(performer: PerformerDto, req: Record<string, any>): Promise<any> {
    const [unpaidPrice] = await Promise.all([
      this.earningService.totalUnpaidAmountByPerformerId(performer._id, req)
    ]);

    return {
      unpaidPrice
    };
  }

  public async calculateStats(
    user: PerformerDto & UserDto,
    req: PayoutRequestSearchPayload
  ): Promise<any> {
    let performerId = user._id;
    if (user.roles && user.roles.includes('admin') && req.sourceId) {
      performerId = req.sourceId;
    }
    const [paidPrice] = await Promise.all([
      this.PayoutRequestModel.aggregate([
        {
          $match: {
            status: 'done',
            sourceId: toObjectId(performerId)
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$requestedPrice'
            }
          }
        }
      ])
    ]);

    const performer = await this.performerService.findById(performerId);

    const lastPaid = await this.PayoutRequestModel.find({
      status: 'done',
      sourceId: performerId
    }).limit(1).sort({
      createdAt: -1
    });

    const paid = paidPrice?.length ? paidPrice[0].total : 0;
    const unpaid = performer?.balance || 0;
    const lastpaid = lastPaid.length ? lastPaid[0].requestedPrice : 0;

    return {
      paidPrice: paid,
      unpaidPrice: unpaid,
      totalPrice: (performer?.balance || 0) + paid,
      lastPaid: lastpaid
    };
  }

  public async totalRequestedPrice(
    performerId
  ): Promise<any> {
    const requestedPrice = await this.PayoutRequestModel.aggregate([
      {
        $match: {
          sourceId: toObjectId(performerId),
          status: {
            $nin: ['rejected']
          }
        }
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: '$requestedPrice'
          }
        }
      }
    ]);

    return {
      totalRequestedPrice: requestedPrice?.length ? requestedPrice[0].total : 0
    };
  }

  public async calculateStatsAll(): Promise<Record<string, any>> {
    return this.earningService.statsAll();
  }

  public async performerUpdate(
    id: string,
    payload: PayoutRequestPerformerUpdatePayload,
    user: PerformerDto
  ): Promise<PayoutRequestDto> {
    const payout = await this.PayoutRequestModel.findOne({ _id: id });
    if (!payout) {
      throw new EntityNotFoundException();
    }
    if (user._id.toString() !== payout.sourceId.toString() || payout.status !== STATUSES.PENDING) {
      throw new ForbiddenException();
    }
    const data: Record<string, any> = { ...payload };
    const unpaidPrice = await this.earningService.totalUnpaidAmountByPerformerId(user._id, {
      fromDate: payload.fromDate,
      toDate: payload.toDate
    });
    data.fromDate = moment(payload.fromDate).startOf('day').toDate();
    data.toDate = moment(payload.toDate).endOf('day').toDate();
    data.requestedPrice = unpaidPrice;
    if (data.paymentAccountType === PAYMENT_ACCOUNT_TYPE.BANKING) {
      data.paymentAccountInfo = await this.performerService.getBankingSettings(payout.sourceId);
      if (!data.paymentAccountInfo || !data.paymentAccountInfo.firstName || !data.paymentAccountInfo.lastName || !data.paymentAccountInfo.bankAccount) {
        throw new HttpException('Missing banking informations', 404);
      }
    }
    if (data.paymentAccountType === PAYMENT_ACCOUNT_TYPE.PAYPAL) {
      const paymentAccountInfo = await this.performerService.getPaymentSetting(payout.sourceId, 'paypal');
      if (!paymentAccountInfo || !paymentAccountInfo.value || !paymentAccountInfo.value.email) {
        throw new HttpException('Missing paypal account information', 404);
      }
      data.paymentAccountInfo = paymentAccountInfo?.value || null;
    }
    merge(payout, data);
    await payout.save();
    return PayoutRequestDto.fromModel(payout);
  }

  public async details(id: string, user: PerformerDto) {
    const payout = await this.PayoutRequestModel.findById(id);
    if (!payout) {
      throw new EntityNotFoundException();
    }

    if (user._id.toString() !== payout.sourceId.toString()) {
      throw new ForbiddenException();
    }

    const data = PayoutRequestDto.fromModel(payout);
    data.setSourceInfo(user);
    return data;
  }

  public async adminDetails(id: string) {
    const payout = await this.PayoutRequestModel.findById(id);
    if (!payout) {
      throw new EntityNotFoundException();
    }
    const dto = PayoutRequestDto.fromModel(payout);
    const { sourceId, source } = dto;
    if (source === SOURCE_TYPE.PERFORMER) {
      const sourceInfo = await this.performerService.findById(sourceId);
      dto.setSourceInfo(sourceInfo);
    }
    return dto;
  }

  public async adminDelete(id: string) {
    const payout = await this.PayoutRequestModel.findById(id);
    if (!payout) {
      throw new EntityNotFoundException();
    }
    if ([STATUSES.DONE, STATUSES.REJECTED].includes(payout.status)) {
      throw new ForbiddenException();
    }
    await payout.deleteOne();
    return { deleted: true };
  }

  public async adminUpdateStatus(
    id: string | ObjectId,
    payload: PayoutRequestUpdatePayload
  ): Promise<any> {
    const request = await this.PayoutRequestModel.findById(id);
    if (!request) {
      throw new EntityNotFoundException();
    }

    const oldStatus = request.status;
    merge(request, payload);
    request.updatedAt = new Date();
    await request.save();

    const event: QueueEvent = {
      channel: PAYOUT_REQUEST_CHANEL,
      eventName: EVENT.UPDATED,
      data: {
        request,
        oldStatus
      }
    };
    await this.queueEventService.publish(event);
    return request;
  }

  public async checkHasPending(sourceId) {
    const count = await this.PayoutRequestModel.countDocuments({
      sourceId,
      status: STATUSES.PENDING
    });
    return count > 0;
  }
}
