import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import { QueueEventService, QueueEvent, AgendaService } from 'src/kernel';
import {
  PAYMENT_TYPE,
  ORDER_PAID_SUCCESS_CHANNEL
} from 'src/modules/payment/constants';
import { EVENT, STATUS } from 'src/kernel/constants';
import * as moment from 'moment';
import { PerformerService } from 'src/modules/performer/services';
import { UserService } from 'src/modules/user/services';
import { MailerService } from 'src/modules/mailer';
import { InjectModel } from '@nestjs/mongoose';
import { OrderDto, PaymentTransactionDto } from 'src/modules/payment/dtos';
import { plainToInstance } from 'class-transformer';
import { SubscriptionDto } from '../dtos/subscription.dto';
import {
  SUBSCRIPTION_TYPE, SUBSCRIPTION_STATUS
} from '../constants';
import { Subscription } from '../schemas/subscription.schema';

const UPDATE_SUBSCRIPTION_CHANNEL = 'UPDATE_SUBSCRIPTION_CHANNEL';
const HANDLE_EMERCHANTPAY_SUBSEQUENT = 'HANDLE_EMERCHANTPAY_SUBSEQUENT';

@Injectable()
export class OrderSubscriptionListener {
  constructor(
    @InjectModel(Subscription.name) private readonly SubscriptionModel: Model<Subscription>,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly queueEventService: QueueEventService,
    private readonly mailService: MailerService,
    @Inject(forwardRef(() => AgendaService))
    private readonly agendaService: AgendaService
  ) {
    this.queueEventService.subscribe(
      ORDER_PAID_SUCCESS_CHANNEL,
      UPDATE_SUBSCRIPTION_CHANNEL,
      this.handleListenSubscription.bind(this)
    );
  }

  public async handleListenSubscription(
    event: QueueEvent
  ): Promise<any> {
    if (![EVENT.CREATED, EVENT.DELETED].includes(event.eventName)) {
      return;
    }
    const { transaction, order } = event.data;
    if (![PAYMENT_TYPE.YEARLY_SUBSCRIPTION, PAYMENT_TYPE.MONTHLY_SUBSCRIPTION].includes(order.type)) {
      return;
    }
    // not support for other gateway
    if (transaction.paymentGateway === 'ccbill') {
      await this.handleCCBillSubscription(order, transaction);
    } else if (transaction.paymentGateway === 'verotel') {
      await this.handleVerotelSubscription(order, transaction);
    } else if (transaction.paymentGateway === 'emerchant') {
      await this.handleEmerChantpaySubscription(order, transaction);
    }
  }

  private async handleCCBillSubscription(order: OrderDto, transaction: PaymentTransactionDto) {
    const existSubscription = await this.SubscriptionModel.findOne({
      userId: order.buyerId,
      performerId: order.sellerId
    });
    let days = 30;
    switch (transaction.type) {
      case PAYMENT_TYPE.MONTHLY_SUBSCRIPTION:
        days = 30;
        break;
      case PAYMENT_TYPE.YEARLY_SUBSCRIPTION:
        days = 365;
        break;
      default: break;
    }
    // ccbill rules, today is the first day
    const expiredAt = moment().add(days, 'days').toDate();
    const subscriptionType = transaction.type === PAYMENT_TYPE.MONTHLY_SUBSCRIPTION
      ? SUBSCRIPTION_TYPE.MONTHLY
      : SUBSCRIPTION_TYPE.YEARLY;
    const subscriptionId = transaction?.paymentResponseInfo?.subscriptionId
      || transaction?.paymentResponseInfo?.subscription_id || null;
    const paymentResponseInfo: Record<string, any> = transaction?.paymentResponseInfo || {};
    const { paymentGateway } = transaction;
    const startRecurringDate = new Date();
    const nextRecurringDate = expiredAt;
    if (existSubscription) {
      existSubscription.expiredAt = new Date(expiredAt);
      existSubscription.updatedAt = new Date();
      existSubscription.subscriptionType = subscriptionType;
      existSubscription.transactionId = transaction._id;
      existSubscription.meta = paymentResponseInfo;
      existSubscription.subscriptionId = subscriptionId;
      existSubscription.paymentGateway = paymentGateway;
      existSubscription.startRecurringDate = startRecurringDate;
      existSubscription.nextRecurringDate = nextRecurringDate;
      existSubscription.status = STATUS.ACTIVE;
      if (existSubscription.status === SUBSCRIPTION_STATUS.DEACTIVATED) {
        await this.performerService.updateSubscriptionStat(
          existSubscription.performerId,
          1
        );
      }
      await existSubscription.save();
      const dto = SubscriptionDto.fromModel(existSubscription);
      await this.handleMailerSubscription(dto);
      return dto;
    }

    const newSubscription = await this.SubscriptionModel.create({
      performerId: order.sellerId,
      userId: order.buyerId,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiredAt: new Date(expiredAt),
      subscriptionType,
      subscriptionId,
      meta: paymentResponseInfo,
      paymentGateway,
      startRecurringDate,
      nextRecurringDate,
      transactionId: transaction._id,
      status: STATUS.ACTIVE
    });

    const dto = SubscriptionDto.fromModel(newSubscription);
    await this.handleMailerSubscription(dto);
    await this.performerService.updateSubscriptionStat(
      newSubscription.performerId,
      1
    );
    return dto;
  }

  private async handleVerotelSubscription(order: OrderDto, transaction: PaymentTransactionDto) {
    const existSubscription = await this.SubscriptionModel.findOne({
      userId: order.buyerId,
      performerId: order.sellerId
    });
    const expiredAt = transaction.type === PAYMENT_TYPE.MONTHLY_SUBSCRIPTION
      ? moment()
        .add(30, 'days')
        .toDate()
      : moment()
        .add(365, 'days')
        .toDate();
    const subscriptionType = transaction.type === PAYMENT_TYPE.MONTHLY_SUBSCRIPTION
      ? SUBSCRIPTION_TYPE.MONTHLY
      : SUBSCRIPTION_TYPE.YEARLY;
    const subscriptionId = transaction?.paymentResponseInfo?.referenceID;
    const paymentResponseInfo: Record<string, any> = transaction?.paymentResponseInfo || {};
    const { paymentGateway } = transaction;
    if (existSubscription) {
      existSubscription.expiredAt = new Date(expiredAt);
      existSubscription.updatedAt = new Date();
      existSubscription.subscriptionType = subscriptionType;
      existSubscription.transactionId = transaction._id;
      existSubscription.meta = paymentResponseInfo;
      existSubscription.subscriptionId = subscriptionId;
      existSubscription.paymentGateway = paymentGateway;
      existSubscription.startRecurringDate = new Date();
      existSubscription.nextRecurringDate = moment(new Date(expiredAt)).add(1, 'day').toDate();
      existSubscription.status = STATUS.ACTIVE;
      if (existSubscription.status === SUBSCRIPTION_STATUS.DEACTIVATED) {
        await this.performerService.updateSubscriptionStat(
          existSubscription.performerId,
          1
        );
      }
      await existSubscription.save();

      const dto = SubscriptionDto.fromModel(existSubscription);
      await this.handleMailerSubscription(dto);
      return dto;
    }

    const newSubscription = await this.SubscriptionModel.create({
      performerId: order.sellerId,
      userId: order.buyerId,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiredAt: new Date(expiredAt),
      subscriptionType,
      subscriptionId,
      meta: paymentResponseInfo,
      paymentGateway,
      startRecurringDate: new Date(),
      nextRecurringDate: moment(new Date(expiredAt)).add(1, 'day').toDate(),
      transactionId: transaction._id,
      status: STATUS.ACTIVE
    });

    const dto = SubscriptionDto.fromModel(newSubscription);
    await this.handleMailerSubscription(dto);
    await this.performerService.updateSubscriptionStat(
      newSubscription.performerId,
      1
    );
    return dto;
  }

  private async handleEmerChantpaySubscription(order: OrderDto, transaction: PaymentTransactionDto) {
    const existSubscription = await this.SubscriptionModel.findOne({
      userId: order.buyerId,
      performerId: order.sellerId
    });
    let days = 30;
    switch (transaction.type) {
      case PAYMENT_TYPE.MONTHLY_SUBSCRIPTION:
        days = 30;
        break;
      case PAYMENT_TYPE.YEARLY_SUBSCRIPTION:
        days = 365;
        break;
      default: break;
    }
    const expiredAt = moment().add(days, 'days').toDate();
    const subscriptionType = transaction.type === PAYMENT_TYPE.MONTHLY_SUBSCRIPTION
      ? SUBSCRIPTION_TYPE.MONTHLY
      : SUBSCRIPTION_TYPE.YEARLY;
    const subscriptionId = transaction?.paymentResponseInfo?.subscriptionId
      || transaction?.paymentResponseInfo?.subscription_id || transaction?.paymentResponseInfo?.wpf_unique_id || null;
    const paymentResponseInfo: Record<string, any> = transaction?.paymentResponseInfo || {};
    const { paymentGateway } = transaction;
    const startRecurringDate = new Date();
    const nextRecurringDate = expiredAt;
    if (existSubscription) {
      existSubscription.expiredAt = new Date(expiredAt);
      existSubscription.updatedAt = new Date();
      existSubscription.subscriptionType = subscriptionType;
      existSubscription.transactionId = transaction._id;
      existSubscription.meta = paymentResponseInfo;
      existSubscription.subscriptionId = subscriptionId;
      existSubscription.paymentGateway = paymentGateway;
      existSubscription.startRecurringDate = startRecurringDate;
      existSubscription.nextRecurringDate = nextRecurringDate;
      existSubscription.status = STATUS.ACTIVE;
      if (existSubscription.status === SUBSCRIPTION_STATUS.DEACTIVATED) {
        await this.performerService.updateSubscriptionStat(
          existSubscription.performerId,
          1
        );
      }
      await existSubscription.save();
      const dto = plainToInstance(SubscriptionDto, existSubscription.toObject());
      await this.handleMailerSubscription(dto);
      return dto;
    }

    const newSubscription = await this.SubscriptionModel.create({
      performerId: order.sellerId,
      userId: order.buyerId,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiredAt: new Date(expiredAt),
      subscriptionType,
      subscriptionId,
      meta: paymentResponseInfo,
      paymentGateway,
      startRecurringDate,
      nextRecurringDate,
      transactionId: transaction._id,
      status: STATUS.ACTIVE
    });

    const dto = plainToInstance(SubscriptionDto, newSubscription.toObject());
    await this.handleMailerSubscription(dto);
    await this.performerService.updateSubscriptionStat(
      newSubscription.performerId,
      1
    );

    await this.agendaService.schedule(
      moment().add(transaction.type === PAYMENT_TYPE.MONTHLY_SUBSCRIPTION ? 30 : 365, 'days').toDate(),
      HANDLE_EMERCHANTPAY_SUBSEQUENT,
      {
        performerId: newSubscription.performerId,
        paymentGateway: 'emerchant',
        userId: newSubscription.userId
      }
    );

    return dto;
  }

  public async handleMailerSubscription(subscription: SubscriptionDto) {
    const [user, performer] = await Promise.all([
      this.userService.findById(subscription.userId),
      this.performerService.findById(subscription.performerId)
    ]);
    if (!user || !performer) return;
    if (performer.email) {
      await this.mailService.send({
        subject: 'New Subscription',
        to: performer.email,
        data: {
          performer,
          user
        },
        template: 'performer-new-subscription'
      });
    }
  }
}
