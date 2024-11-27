import {
  Injectable, Inject, forwardRef, HttpException
} from '@nestjs/common';
import { Model } from 'mongoose';
import { EntityNotFoundException } from 'src/kernel';
import { isObjectId } from 'src/kernel/helpers/string.helper';
import { CCBillService, VerotelService } from 'src/modules/payment/services';
import { SettingService } from 'src/modules/settings/services';
import { SETTING_KEYS } from 'src/modules/settings/constants';
import { MailerService } from 'src/modules/mailer';
import { PerformerService } from 'src/modules/performer/services';
import { UserService } from 'src/modules/user/services';
import { InjectModel } from '@nestjs/mongoose';
import { DBLoggerService } from 'src/modules/logger';
import { EmerchantpayService } from 'src/modules/payment/services/emerchantpay.service';
import { SUBSCRIPTION_STATUS } from '../constants';
import { Subscription } from '../schemas/subscription.schema';

@Injectable()
export class CancelSubscriptionService {
  constructor(
    @InjectModel(Subscription.name) private readonly SubsciptionModel: Model<Subscription>,

    @Inject(forwardRef(() => CCBillService))
    private readonly ccbillService: CCBillService,
    @Inject(forwardRef(() => VerotelService))
    private readonly verotelService: VerotelService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly settingService: SettingService,
    private readonly mailService: MailerService,
    private readonly logger: DBLoggerService,
    @Inject(forwardRef(() => EmerchantpayService))
    private readonly emerchantpayService: EmerchantpayService
  ) { }

  public async cancelSubscription(id: string) {
    if (!isObjectId(id)) {
      throw new EntityNotFoundException();
    }
    const subscription = await this.SubsciptionModel.findById(id);
    if (!subscription || subscription.status === SUBSCRIPTION_STATUS.DEACTIVATED
    ) throw new EntityNotFoundException();
    if (!subscription.subscriptionId) {
      subscription.expiredAt = new Date();
      subscription.status = SUBSCRIPTION_STATUS.DEACTIVATED;
      subscription.updatedAt = new Date();
      await subscription.save();
      await this.performerService.updateSubscriptionStat(
        subscription.performerId,
        -1
      );
      return { success: true };
    }
    const { paymentGateway } = subscription;
    if (paymentGateway === 'ccbill') {
      const [
        ccbillClientAccNo,
        ccbillDatalinkUsername,
        ccbillDatalinkPassword
      ] = await Promise.all([
        this.settingService.getKeyValue(SETTING_KEYS.CCBILL_CLIENT_ACCOUNT_NUMBER),
        this.settingService.getKeyValue(SETTING_KEYS.CCBILL_DATALINK_USERNAME),
        this.settingService.getKeyValue(SETTING_KEYS.CCBILL_DATALINK_PASSWROD)
      ]);
      if (!ccbillClientAccNo || !ccbillDatalinkUsername || !ccbillDatalinkPassword) {
        throw new EntityNotFoundException();
      }

      const status = await this.ccbillService.cancelSubscription({
        subscriptionId: subscription.subscriptionId,
        ccbillClientAccNo,
        ccbillDatalinkUsername,
        ccbillDatalinkPassword
      });
      if (!status) throw new HttpException('Could not cancel this subscription on CCbill, please try again later', 422);
    }
    if (paymentGateway === 'verotel') {
      const res = await this.verotelService.cancelSubscription(subscription.subscriptionId);
      this.logger.log(res, { context: 'Verotel:CancelSupscription' });
    }
    if (paymentGateway === 'emerchant') {
      const isCancel = await this.emerchantpayService.cancelSubscription(subscription._id);
      if (!isCancel) throw new HttpException('Could not cancel recurring on Emerchant, please try again later', 422);
    }
    subscription.status = SUBSCRIPTION_STATUS.DEACTIVATED;
    subscription.updatedAt = new Date();
    await subscription.save();
    await this.performerService.updateSubscriptionStat(
      subscription.performerId,
      -1
    );
    const performer = await this.performerService.findById(
      subscription.performerId
    );
    const user = await this.userService.findById(subscription.userId);
    if (performer && performer.email && user) {
      await this.mailService.send({
        subject: 'Cancel Subscription',
        to: performer.email,
        data: {
          performer,
          user
        },
        template: 'performer-cancel-subscription'
      });
    }

    return { success: true };
  }
}
