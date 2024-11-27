import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import { QueueEventService, QueueEvent } from 'src/kernel';
import {
  ORDER_PAID_SUCCESS_CHANNEL,
  ORDER_STATUS,
  PRODUCT_TYPE
} from 'src/modules/payment/constants';
import { EVENT } from 'src/kernel/constants';
import { PerformerService } from 'src/modules/performer/services';
import { SettingService } from 'src/modules/settings';
import { STATUSES } from 'src/modules/payout-request/constants';
import { UserService } from 'src/modules/user/services';
import { InjectModel } from '@nestjs/mongoose';
import { DBLoggerService } from 'src/modules/logger';
import { EarningDto } from '../dtos/earning.dto';
import { PAYMENT_STATUS } from '../../payment/constants';
import { SETTING_KEYS } from '../../settings/constants';
import { Earning } from '../schemas/earning.schema';

const UPDATE_EARNING_CHANNEL = 'EARNING_CHANNEL';

@Injectable()
export class TransactionEarningListener {
  constructor(
    @InjectModel(Earning.name) private readonly EarningModel: Model<Earning>,
    @Inject(forwardRef(() => SettingService))
    private readonly settingService: SettingService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => PerformerService))
    private readonly userService: UserService,
    private readonly queueEventService: QueueEventService,
    private readonly logger: DBLoggerService
  ) {
    this.queueEventService.subscribe(
      ORDER_PAID_SUCCESS_CHANNEL,
      UPDATE_EARNING_CHANNEL,
      this.handleListenEarning.bind(this)
    );
  }

  public async handleListenEarning(
    event: QueueEvent
  ): Promise<EarningDto> {
    try {
      if (event.eventName !== EVENT.CREATED) {
        return;
      }
      const { orderDetails, transaction } = event.data;
      if (transaction?.status !== PAYMENT_STATUS.SUCCESS) {
        return;
      }
      const [
        settingMonthlyCommission,
        settingYearlyCommission,
        settingProductCommission,
        settingVideoCommission,
        settingFeedCommission
      ] = await Promise.all([
        this.settingService.getKeyValue(SETTING_KEYS.MONTHLY_SUBSCRIPTION_COMMISSION),
        this.settingService.getKeyValue(SETTING_KEYS.YEARLY_SUBSCRIPTION_COMMISSION),
        this.settingService.getKeyValue(SETTING_KEYS.PRODUCT_SALE_COMMISSION),
        this.settingService.getKeyValue(SETTING_KEYS.VIDEO_SALE_COMMISSION),
        this.settingService.getKeyValue(SETTING_KEYS.FEED_SALE_COMMISSION)
      ]);

      // eslint-disable-next-line no-restricted-syntax
      for (const orderDetail of orderDetails) {
        if (orderDetail.sellerSource === 'performer' && orderDetail.status === ORDER_STATUS.PAID) {
          // eslint-disable-next-line no-await-in-loop
          const performerCommissions = await this.performerService.getCommissions(orderDetail.sellerId);

          // default commission
          let commission = 0.2;
          let sourceType = 'n/a';
          const defaultCommission = 0.2;
          switch (orderDetail.productType) {
            case PRODUCT_TYPE.PERFORMER_PRODUCT:
            case PRODUCT_TYPE.DIGITAL_PRODUCT:
            case PRODUCT_TYPE.PHYSICAL_PRODUCT:
              commission = performerCommissions?.productSaleCommission || settingProductCommission || defaultCommission;
              sourceType = 'product';
              break;
            case PRODUCT_TYPE.SALE_VIDEO:
              commission = performerCommissions?.videoSaleCommission || settingVideoCommission || defaultCommission;
              sourceType = 'video';
              break;
            case PRODUCT_TYPE.FEED:
              commission = performerCommissions?.feedSaleCommission || settingFeedCommission || defaultCommission;
              sourceType = 'feed';
              break;
            case PRODUCT_TYPE.YEARLY_SUBSCRIPTION:
              commission = performerCommissions?.yearlySubscriptionCommission || settingYearlyCommission || defaultCommission;
              sourceType = 'performer';
              break;
            case PRODUCT_TYPE.MONTHLY_SUBSCRIPTION:
              commission = performerCommissions?.monthlySubscriptionCommission || settingMonthlyCommission || defaultCommission;
              sourceType = 'performer';
              break;
            default: break;
          }

          const netPrice = (orderDetail.totalPrice - (orderDetail.totalPrice * commission)).toFixed(2);
          const newEarning = new this.EarningModel();
          newEarning.set('commission', commission);
          newEarning.set('grossPrice', orderDetail.totalPrice);
          newEarning.set('netPrice', netPrice);
          newEarning.set('performerId', orderDetail.sellerId);
          newEarning.set('userId', orderDetail.buyerId);
          newEarning.set('transactionId', transaction._id);
          newEarning.set('orderId', orderDetail._id);
          newEarning.set('type', orderDetail.productType);
          newEarning.set('sourceType', sourceType);
          newEarning.set('createdAt', new Date(transaction.createdAt));
          newEarning.set('isPaid', false);
          newEarning.set('transactionStatus', transaction.status);
          newEarning.set('paymentMethod', transaction.paymentGateway);
          newEarning.set('paymentStatus', orderDetail.paymentStatus);
          newEarning.set('payoutStatus', STATUSES.PENDING);
          try {
            // update model and user username
            // eslint-disable-next-line no-await-in-loop
            const [user, performer] = await Promise.all([
              this.userService.findById(orderDetail.buyerId),
              this.performerService.findById(orderDetail.sellerId)
            ]);
            newEarning.set('userUsername', user?.username);
            newEarning.set('performerUsername', performer?.username);
          } catch {
            newEarning.set('userUsername', 'N/A');
            newEarning.set('performerUsername', 'N/A');
          }

          // eslint-disable-next-line no-await-in-loop
          await newEarning.save();
          // eslint-disable-next-line no-await-in-loop
          await this.performerService.increaseBalance(orderDetail.sellerId, parseFloat(netPrice));
        }
      }
    } catch (e) {
      this.logger.error(e.stack || e, { context: 'TransactionEarningListener' });
    }
  }
}
