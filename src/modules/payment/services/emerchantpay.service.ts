/* eslint-disable camelcase */
import {
  BadRequestException, forwardRef, Inject, Injectable,
  OnModuleInit
} from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
// import * as https from 'https';
import * as genesis from 'genesis.js';
import * as config from 'config';
import { SettingService } from 'src/modules/settings';
import { SETTING_KEYS } from 'src/modules/settings/constants';
import { AgendaService, QueueEvent, QueueEventService } from 'src/kernel';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
// import * as bd from 'bigdecimal';
// import * as js2xml from 'js2xmlparser';
// import * as xmlObj from 'xml-object';
// import axios from 'axios';
// import * as fastXmlParser from 'fast-xml-parser';
// import * as _ from 'underscore';
import { UserService } from 'src/modules/user/services';
import { EVENT } from 'src/kernel/constants';
import moment = require('moment');
import axios from 'axios';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import { PaymentTransaction } from '../schemas';
import { PAYMENT_STATUS, TRANSACTION_SUCCESS_CHANNEL } from '../constants';

// const genesis = require('genesis.js');

const HANDLE_EMERCHANTPAY_PENDING_TRANSACTION = 'HANDLE_EMERCHANTPAY_PENDING_TRANSACTION';
const HANDLE_EMERCHANTPAY_SUBSEQUENT = 'HANDLE_EMERCHANTPAY_SUBSEQUENT';

@Injectable()
export class EmerchantpayService implements OnModuleInit {
  constructor(
    @InjectModel(PaymentTransaction.name) private readonly PaymentTransactionModel: Model<PaymentTransaction>,
    @Inject(forwardRef(() => SettingService))
    private readonly settingService: SettingService,
    @Inject(forwardRef(() => QueueEventService))
    private readonly queueEventService: QueueEventService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => AgendaService))
    private readonly agendaService: AgendaService,
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService
  ) { }

  onModuleInit() {
    this.defineJobs();
  }

  private async defineJobs() {
    const collection = (this.agendaService as any)._collection;
    await collection.deleteMany({
      name: {
        $in: [HANDLE_EMERCHANTPAY_PENDING_TRANSACTION]
      }
    });

    this.agendaService.define(
      HANDLE_EMERCHANTPAY_PENDING_TRANSACTION,
      this.checkPendingTransaction.bind(this)
    );
    this.agendaService.schedule(
      'in 15 second',
      HANDLE_EMERCHANTPAY_PENDING_TRANSACTION,
      {}
    );

    this.agendaService.define(
      HANDLE_EMERCHANTPAY_SUBSEQUENT,
      {},
      this.handleSubsequentEmerchantpay.bind(this)
    );
  }

  public async getConfig() {
    const [enabled, enviroment, username, password, currency, emerchantTerminalToken] = await Promise.all([
      this.settingService.getKeyValue(SETTING_KEYS.EMERCHANT_ENABLED),
      this.settingService.getKeyValue(SETTING_KEYS.EMERCHANT_API_ENVIROMENT),
      this.settingService.getKeyValue(SETTING_KEYS.EMERCHANT_USERNAME),
      this.settingService.getKeyValue(SETTING_KEYS.EMERCHANT_PASSWORD),
      this.settingService.getKeyValue(SETTING_KEYS.EMERCHANT_CURRENCY),
      this.settingService.getKeyValue(SETTING_KEYS.EMERCHANT_TEMINAL_TOKEN)
    ]);

    if (!enabled || !username || !password || !currency || !emerchantTerminalToken) {
      throw new BadRequestException('Missing config');
    }

    return {
      currency,
      customer: {
        username,
        password
      },
      gateway: {
        protocol: 'https',
        hostname: 'emerchantpay.net',
        timeout: '60000',
        testing: enviroment
      },
      notifications: {
        host: process.env.USER_URL,
        path: process.env.BASE_URL
      },
      emerchantTerminalToken
    };
  }

  public async singlePurchase(transaction: any) {
    const adminConfig = await this.getConfig();

    config.customer.username = adminConfig.customer.username;
    config.customer.password = adminConfig.customer.password;
    config.customer.token = `${adminConfig.customer.username}:${adminConfig.customer.password}`;
    config.gateway.testing = adminConfig.gateway.testing;
    config.notifications.host = adminConfig.notifications.host;
    config.notifications.path = adminConfig.notifications.path;

    const user = await this.userService.findById(transaction.sourceId);

    const retrieveConsumer = await this.retrieveConsumer(user?.email || 'example@yopmail.com');

    const transaction_id = crypto.randomBytes(16).toString('hex');

    // eslint-disable-next-line new-cap
    const transactionIntance = new genesis.transaction();
    const resp = await transactionIntance.wpf_create({
      locale: 'en',
      transaction_id,
      usage: 'Demo WPF Transaction',
      description: 'This is my first WPF transaction',
      // remote_ip: '127.0.0.1',
      amount: transaction.totalPrice,
      currency: adminConfig.currency || 'EUR',
      customer_email: user.email || 'email@example.com',
      customer_phone: user.phone || '0123456789',
      consumer_id: retrieveConsumer?.data.consumer_id,
      notification_url: `${config.notifications.path}/payment/emerchantpay/callhook`,
      return_success_url: `${config.notifications.host}/payment/success`,
      return_failure_url: `${config.notifications.host}/payment/failure`,
      return_cancel_url: `${config.notifications.host}/payment/cancel`,
      billing_address: {
        first_name: user.firstName || 'John',
        last_name: user.lastName || 'Doe',
        address1: user.country || '123 Str.',
        zip_code: user.phone || '10000',
        city: user.country || 'New York',
        country: user.country || 'US'
      },
      transaction_types: ['sale']
    })
      .send();

    return {
      paymentUrl: resp.redirect_url,
      transaction_id: resp.unique_id
    };
  }

  public async retrieveConsumer(email?: string) {
    const adminConfig = await this.getConfig();
    const requestUrl = 'https://staging.gate.emerchantpay.net/v1/retrieve_consumer';
    return axios.post(
      requestUrl,
      `<?xml version="1.0" encoding="UTF-8"?>
      <retrieve_consumer_request>
        <email>${email}</email>
      </retrieve_consumer_request>`,
      {
        headers: {
          Content_Type: 'application/xml'
        },
        auth: {
          username: adminConfig.customer.username,
          password: adminConfig.customer.password
        }
      }
    );
  }

  public async subscription(transaction: any) {
    const adminConfig = await this.getConfig();

    config.customer.username = adminConfig.customer.username;
    config.customer.password = adminConfig.customer.password;
    config.customer.token = `${adminConfig.customer.username}:${adminConfig.customer.password}`;
    config.gateway.testing = adminConfig.gateway.testing;
    config.notifications.host = adminConfig.notifications.host;
    config.notifications.path = adminConfig.notifications.path;

    const user = await this.userService.findById(transaction.sourceId);

    const retrieveConsumer = await this.retrieveConsumer(user?.email || 'example@yopmail.com');

    const transaction_id = crypto.randomBytes(16).toString('hex');
    // eslint-disable-next-line new-cap
    const transactionIntance = new genesis.transaction();
    const resp = await transactionIntance.wpf_create({
      locale: 'en',
      transaction_id,
      usage: 'Demo WPF Transaction',
      description: 'This is my first WPF transaction',
      // remote_ip: '127.0.0.1',
      amount: transaction.totalPrice,
      consumer_id: retrieveConsumer?.data.consumer_id,
      currency: config.currency || 'EUR',
      customer_email: user.email || 'email@example.com',
      customer_phone: user.phone || '0123456789',
      notification_url: `${config.notifications.path}/payment/emerchantpay/callhook`,
      // notification_url: 'https://webhook.site/d3c30fae-06b8-40b5-bb26-94353f6bcec6',
      return_success_url: `${config.notifications.host}/payment/success`,
      return_failure_url: `${config.notifications.host}/payment/failure`,
      return_cancel_url: `${config.notifications.host}/payment/cancel`,
      billing_address: {
        first_name: user.firstName || 'John',
        last_name: user.lastName || 'Doe',
        address1: user.country || '123 Str.',
        zip_code: user.phone || '10000',
        city: user.country || 'New York',
        country: user.country || 'US'
      },
      transaction_types: [
        {
          sale3d: {
            recurring_type: 'initial'
          }
        }
      ]
    })
      .send();

    return {
      paymentUrl: resp.redirect_url,
      transaction_id: resp.unique_id
    };
  }

  public async reconcile(unique_id: string) {
    // eslint-disable-next-line new-cap
    const transactionIntance = new genesis.transaction();
    const resp = await transactionIntance.wpf_reconcile({ unique_id }).send();
    return resp;
  }

  public async callback(payload) {
    const {
      wpf_unique_id, wpf_status
    } = payload;

    if (!['approved'].includes(wpf_status)) return;

    const transaction = await this.PaymentTransactionModel.findOne({ paymentToken: wpf_unique_id });

    if (!transaction) return;

    if (transaction.status !== PAYMENT_STATUS.PENDING) return;

    transaction.status = PAYMENT_STATUS.SUCCESS;
    transaction.paymentResponseInfo = payload;
    await transaction.save();

    const res = await this.reconcile(wpf_unique_id);
    res.status = 'approved';

    await this.queueEventService.publish(
      new QueueEvent({
        channel: TRANSACTION_SUCCESS_CHANNEL,
        eventName: EVENT.CREATED,
        data: transaction
      })
    );
  }

  public async checkPendingTransaction(_job, done) {
    try {
      const transactions = await this.PaymentTransactionModel.find({
        status: 'pending',
        paymentGateway: 'emerchant',
        $and: [
          {
            createdAt: {
              $gt: moment().subtract(3, 'hours').toDate()
            }
          },
          {
            createdAt: {
              $lt: moment().subtract(1, 'hours').toDate()
            }
          }
        ]
      });
      if (transactions.length) {
        done();
        return;
      }
      // eslint-disable-next-line no-restricted-syntax
      for (const transaction of transactions) {
        // eslint-disable-next-line no-undef, no-await-in-loop
        const res = await this.reconcile(transaction.paymentToken);
        if (res.status === 'approved') {
          transaction.status = PAYMENT_STATUS.SUCCESS;
          transaction.updatedAt = new Date();
          transaction.paymentResponseInfo = res;
          // eslint-disable-next-line no-await-in-loop
          await transaction.save();
          // eslint-disable-next-line no-await-in-loop
          await this.queueEventService.publish(
            new QueueEvent({
              channel: TRANSACTION_SUCCESS_CHANNEL,
              eventName: EVENT.CREATED,
              data: transaction
            })
          );
        }
      }
    } catch (e) {
      done(e);
    } finally {
      this.agendaService.schedule(
        'in 15 minutes',
        HANDLE_EMERCHANTPAY_PENDING_TRANSACTION,
        {}
      );
    }
  }

  public async handleSubsequentEmerchantpay(_job, done) {
    try {
      const { performerId, userId } = _job.attrs.data;
      const adminConfig = await this.getConfig();
      const requestUrl = `https://${adminConfig.customer.username}:${adminConfig.customer.password}:@staging.gate.emerchantpay.net/process/${adminConfig.emerchantTerminalToken}`;
      const currentSubscription = await this.subscriptionService.findOneSubscription(performerId, userId);
      const currentTransaction = await this.PaymentTransactionModel.findById(currentSubscription.transactionId);
      const res = await this.reconcile(currentTransaction.paymentToken);
      const { payment_transaction } = res;
      if (payment_transaction.recurring_type === 'initial') {
        await axios.post(
          requestUrl,
          `<?xml version="1.0" encoding="UTF-8"?>
          <payment_transaction>
            <transaction_type>sale</transaction_type>
            <recurring_type>subsequent</recurring_type>
            <usage>test</usage>
            <reference_id>${currentTransaction.paymentResponseInfo.payment_transaction_unique_id}</reference_id>
            <transaction_id>${currentTransaction._id}</transaction_id>
            <amount>${currentTransaction.totalPrice}</amount>
            <currency>${adminConfig.currency || 'EUR'}</currency>
          </payment_transaction>`,
          {
            headers: {
              Content_Type: 'application/xml'
              // Authorization: `Bearer ${adminConfig.customer.username}:${adminConfig.customer.password}`
            },
            auth: {
              username: adminConfig.customer.username,
              password: adminConfig.customer.password
            }
          }
        );
      }
    } catch (e) {
      done(e);
    }
  }

  async cancelSubscription(subscriptionId: string | ObjectId) {
    try {
      const currentSubscription = await this.subscriptionService.findById(subscriptionId);
      const currentTransaction = await this.PaymentTransactionModel.findById(currentSubscription.transactionId);
      const res = await this.reconcile(currentTransaction.paymentToken);
      const { payment_transaction } = res;
      if (payment_transaction.recurring_type === 'initial') {
        const collection = (this.agendaService as any)._collection;
        await collection.deleteOne({
          name: HANDLE_EMERCHANTPAY_SUBSEQUENT,
          'data.performerId': currentSubscription.performerId,
          'data.userId': currentSubscription.userId,
          'data.paymentGateway': 'emerchant'
        });
      }
      return true;
    } catch (e) {
      return false;
    }
  }
}
