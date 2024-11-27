/* eslint-disable camelcase */
import {
  Injectable,
  Inject,
  forwardRef,
  BadRequestException
} from '@nestjs/common';
import { PerformerService } from 'src/modules/performer/services';
import {
  QueueEventService,
  QueueEvent
} from 'src/kernel';
import { EVENT } from 'src/kernel/constants';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { SETTING_KEYS } from 'src/modules/settings/constants';
import { SettingService } from 'src/modules/settings';
import { InjectModel } from '@nestjs/mongoose';
import {
  PAYMENT_STATUS, TRANSACTION_SUCCESS_CHANNEL
} from '../constants';
import { SubscriptionService } from '../../subscription/services/subscription.service';
import { CCBillService } from './ccbill.service';
import { OrderService } from './order.service';
import { MissingConfigPaymentException, MissingAdminConfigPaymentException } from '../exceptions';
import { VerotelService } from './verotel.service';
import { PaymentTransaction } from '../schemas';
import { OrderDto, PaymentTransactionDto } from '../dtos';
import { EmerchantpayService } from './emerchantpay.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(PaymentTransaction.name) private readonly PaymentTransactionModel: Model<PaymentTransaction>,

    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    private readonly ccbillService: CCBillService,
    private readonly queueEventService: QueueEventService,
    private readonly subscriptionService: SubscriptionService,
    private readonly orderService: OrderService,
    private readonly settingService: SettingService,
    private readonly verotelService: VerotelService,
    private readonly emerchantpayService: EmerchantpayService
  ) { }

  public async findById(id: string | ObjectId | any): Promise<PaymentTransactionDto> {
    const item = await this.PaymentTransactionModel.findById(id);
    if (!item) return null;

    return PaymentTransactionDto.fromModel(item);
  }

  public async create(payload: Record<string, any>): Promise<PaymentTransactionDto> {
    const item = await this.PaymentTransactionModel.create(payload);
    return PaymentTransactionDto.fromModel(item);
  }

  private async getPerformerSinglePaymentGatewaySetting(
    performerId,
    paymentGateway = 'ccbill'
  ) {
    const useGlobalSetting = SettingService.getValueByKey(SETTING_KEYS.CCBILL_FORCE_USE_GLOBAL_CONFIG);
    const defaultFlexformId = SettingService.getValueByKey(SETTING_KEYS.CCBILL_FLEXFORM_ID);
    const defaultSingleSubAccountNumber = SettingService.getValueByKey(SETTING_KEYS.CCBILL_SUB_ACCOUNT_NUMBER);
    const defaultSalt = SettingService.getValueByKey(SETTING_KEYS.CCBILL_SALT);

    if (useGlobalSetting) {
      return {
        flexformId: defaultFlexformId,
        subAccountNumber: defaultSingleSubAccountNumber,
        salt: defaultSalt
      };
    }

    const performerPaymentSetting = await this.performerService.getPaymentSetting(
      performerId,
      paymentGateway
    );
    const flexformId = performerPaymentSetting?.value?.flexformId || defaultFlexformId;
    const subAccountNumber = performerPaymentSetting?.value?.singlePurchaseSubAccountNumber || defaultSingleSubAccountNumber;
    const salt = performerPaymentSetting?.value?.salt || defaultSalt;

    if (!performerPaymentSetting || !flexformId || !subAccountNumber || !salt) {
      throw new MissingConfigPaymentException();
    }

    return {
      flexformId,
      subAccountNumber,
      salt
    };
  }

  private async getPerformerSubscriptionPaymentGatewaySetting(
    performerId,
    paymentGateway = 'ccbill'
  ) {
    const useGlobalSetting = SettingService.getValueByKey(SETTING_KEYS.CCBILL_FORCE_USE_GLOBAL_CONFIG);
    const defaultFlexformId = SettingService.getValueByKey(SETTING_KEYS.CCBILL_FLEXFORM_ID);
    const defaultRecurringSubAccountNumber = SettingService.getValueByKey(SETTING_KEYS.CCBILL_SUB_ACCOUNT_NUMBER_RECURRING);
    const defaultSalt = SettingService.getValueByKey(SETTING_KEYS.CCBILL_SALT);

    if (useGlobalSetting) {
      return {
        flexformId: defaultFlexformId,
        subAccountNumber: defaultRecurringSubAccountNumber,
        salt: defaultSalt
      };
    }

    const performerPaymentSetting = await this.performerService.getPaymentSetting(
      performerId,
      paymentGateway
    );
    const flexformId = performerPaymentSetting?.value?.flexformId || defaultFlexformId;
    const subAccountNumber = performerPaymentSetting?.value?.subscriptionSubAccountNumber || defaultRecurringSubAccountNumber;
    const salt = performerPaymentSetting?.value?.salt || defaultSalt;
    if (!performerPaymentSetting || !flexformId || !subAccountNumber || !salt) {
      throw new MissingConfigPaymentException();
    }
    return {
      flexformId,
      subAccountNumber,
      salt
    };
  }

  public async subscribePerformer(
    order: OrderDto,
    paymentGateway = 'ccbill'
  ) {
    if (paymentGateway === 'verotel') {
      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        products: [],
        status: PAYMENT_STATUS.PENDING
      });
      const orderDetails = await this.orderService.getDetails(order._id);
      const description = orderDetails?.map((o) => o.name).join('; ');
      const data = await this.verotelService.createRecurringRequestFromTransaction(PaymentTransactionDto.fromModel(transaction), {
        description,
        userId: order.buyerId,
        performerId: order.sellerId
      });
      await this.PaymentTransactionModel.updateOne({ _id: transaction._id }, {
        $set: {
          paymentToken: data.signature
        }
      });
      return data;
    }
    if (paymentGateway === 'ccbill') {
      const {
        flexformId,
        subAccountNumber,
        salt
      } = await this.getPerformerSubscriptionPaymentGatewaySetting(order.sellerId);

      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        products: [],
        status: PAYMENT_STATUS.PENDING
      });

      return this.ccbillService.subscription({
        salt,
        flexformId,
        subAccountNumber,
        price: parseFloat(order.totalPrice.toFixed(2)),
        transactionId: transaction._id,
        subscriptionType: order.type
      });
    }

    if (paymentGateway === 'emerchant') {
      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        products: [],
        status: PAYMENT_STATUS.PENDING
      });

      const { transaction_id, paymentUrl } = await this.emerchantpayService.subscription(transaction);
      transaction.paymentToken = transaction_id;
      await transaction.save();
      return {
        paymentUrl
      };
    }
    throw new MissingConfigPaymentException();
  }

  public async purchasePerformerProducts(
    order: OrderDto,
    paymentGateway = 'ccbill'
  ) {
    if (paymentGateway === 'verotel') {
      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        products: [],
        status: PAYMENT_STATUS.PENDING
      });
      const orderDetails = await this.orderService.getDetails(order._id);
      const description = orderDetails?.map((o) => o.name).join('; ');
      const data = await this.verotelService.createSingleRequestFromTransaction(PaymentTransactionDto.fromModel(transaction), {
        description,
        userId: order.buyerId
      });
      await this.PaymentTransactionModel.updateOne({ _id: transaction._id }, {
        $set: {
          paymentToken: data.signature
        }
      });
      return data;
    }
    if (paymentGateway === 'ccbill') {
      const {
        flexformId,
        subAccountNumber,
        salt
      } = await this.getPerformerSinglePaymentGatewaySetting(order.sellerId);
      const currencyCode = await this.settingService.getKeyValue(SETTING_KEYS.CCBILL_CURRENCY_CODE);

      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        status: PAYMENT_STATUS.PENDING,
        products: []
      });

      return this.ccbillService.singlePurchase({
        salt,
        flexformId,
        subAccountNumber,
        price: order.totalPrice,
        transactionId: transaction._id,
        currencyCode: currencyCode || '840'
      });
    }

    if (paymentGateway === 'emerchant') {
      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        products: [],
        status: PAYMENT_STATUS.PENDING
      });

      const { transaction_id, paymentUrl } = await this.emerchantpayService.singlePurchase(transaction);
      transaction.paymentToken = transaction_id;
      await transaction.save();
      return {
        paymentUrl
      };
    }
    throw new MissingConfigPaymentException();
  }

  public async purchasePerformerVOD(
    order: OrderDto,
    paymentGateway = 'ccbill'
  ) {
    if (paymentGateway === 'verotel') {
      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        products: [],
        status: PAYMENT_STATUS.PENDING
      });
      const orderDetails = await this.orderService.getDetails(order._id);
      const description = orderDetails?.map((o) => o.name).join('; ');
      const data = await this.verotelService.createSingleRequestFromTransaction(PaymentTransactionDto.fromModel(transaction), {
        description,
        userId: order.buyerId
      });
      await this.PaymentTransactionModel.updateOne({ _id: transaction._id }, {
        $set: {
          paymentToken: data.signature
        }
      });
      return data;
    }
    if (paymentGateway === 'ccbill') {
      const {
        flexformId,
        subAccountNumber,
        salt
      } = await this.getPerformerSinglePaymentGatewaySetting(order.sellerId);
      const currencyCode = await this.settingService.getKeyValue(SETTING_KEYS.CCBILL_CURRENCY_CODE);

      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        status: PAYMENT_STATUS.PENDING,
        products: []
      });

      return this.ccbillService.singlePurchase({
        salt,
        flexformId,
        subAccountNumber,
        price: order.totalPrice,
        transactionId: transaction._id,
        currencyCode: currencyCode || '840'
      });
    }

    if (paymentGateway === 'emerchant') {
      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        products: [],
        status: PAYMENT_STATUS.PENDING
      });

      const { transaction_id, paymentUrl } = await this.emerchantpayService.singlePurchase(transaction);
      transaction.paymentToken = transaction_id;
      await transaction.save();
      return {
        paymentUrl
      };
    }
    throw new MissingConfigPaymentException();
  }

  public async purchaseWalletPackage(order: OrderDto, paymentGateway = 'ccbill') {
    if (paymentGateway === 'verotel') {
      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        products: [],
        status: PAYMENT_STATUS.PENDING
      });
      const orderDetails = await this.orderService.getDetails(order._id);
      const description = orderDetails?.map((o) => o.name).join('; ');
      const data = await this.verotelService.createSingleRequestFromTransaction(PaymentTransactionDto.fromModel(transaction), {
        description,
        userId: order.buyerId
      });
      await this.PaymentTransactionModel.updateOne({ _id: transaction._id }, {
        $set: {
          paymentToken: data.signature
        }
      });
      return data;
    }
    if (paymentGateway === 'ccbill') {
      const [
        flexformId,
        subAccountNumber,
        salt,
        currencyCode
      ] = await Promise.all([
        this.settingService.getKeyValue(SETTING_KEYS.CCBILL_FLEXFORM_ID),
        this.settingService.getKeyValue(SETTING_KEYS.CCBILL_SUB_ACCOUNT_NUMBER),
        this.settingService.getKeyValue(SETTING_KEYS.CCBILL_SALT),
        this.settingService.getKeyValue(SETTING_KEYS.CCBILL_CURRENCY_CODE)
      ]);
      if (!flexformId || !subAccountNumber || !salt) {
        throw new MissingAdminConfigPaymentException();
      }

      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        status: PAYMENT_STATUS.PENDING,
        products: []
      });

      return this.ccbillService.singlePurchase({
        salt,
        flexformId,
        subAccountNumber,
        price: order.totalPrice,
        transactionId: transaction._id,
        currencyCode: currencyCode || '840'
      });
    }

    if (paymentGateway === 'emerchant') {
      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        products: [],
        status: PAYMENT_STATUS.PENDING
      });

      const { transaction_id, paymentUrl } = await this.emerchantpayService.singlePurchase(transaction);
      transaction.paymentToken = transaction_id;
      await transaction.save();
      return {
        paymentUrl
      };
    }
    throw new MissingAdminConfigPaymentException();
  }

  public async ccbillSinglePaymentSuccessWebhook(payload: Record<string, any>) {
    const transactionId = payload['X-transactionId'] || payload.transactionId;
    if (!transactionId) {
      throw new BadRequestException();
    }
    const checkForHexRegExp = /^[0-9a-fA-F]{24}$/;
    if (!checkForHexRegExp.test(transactionId)) {
      return { ok: false };
    }
    const transaction = await this.PaymentTransactionModel.findById(
      transactionId
    );
    if (!transaction || transaction.status !== PAYMENT_STATUS.PENDING) {
      return { ok: false };
    }
    transaction.status = PAYMENT_STATUS.SUCCESS;
    transaction.paymentResponseInfo = payload;
    transaction.updatedAt = new Date();
    await transaction.save();
    await this.queueEventService.publish(
      new QueueEvent({
        channel: TRANSACTION_SUCCESS_CHANNEL,
        eventName: EVENT.CREATED,
        data: transaction
      })
    );
    return { ok: true };
  }

  public async ccbillRenewalSuccessWebhook(payload: any) {
    const subscriptionId = payload.subscriptionId || payload.subscription_id;
    if (!subscriptionId) {
      throw new BadRequestException();
    }

    const subscription = await this.subscriptionService.findBySubscriptionId(
      subscriptionId
    );
    if (!subscription) {
      // TODO - should check in case admin delete subscription??
      // TODO - log me
      return { ok: false };
    }

    // create user order and transaction for this order
    const price = payload.billedAmount || payload.accountingAmount;
    const { userId, performerId } = subscription;
    const order = await this.orderService.createForPerformerSubscriptionRenewal(
      {
        userId,
        performerId,
        price,
        type: subscription.subscriptionType
      }
    );

    const transaction = await this.PaymentTransactionModel.create({
      paymentGateway: 'ccbill',
      orderId: order._id,
      source: order.buyerSource,
      sourceId: order.buyerId,
      type: order.type,
      totalPrice: order.totalPrice,
      status: PAYMENT_STATUS.SUCCESS,
      paymentResponseInfo: payload,
      products: []
    });

    await this.queueEventService.publish(
      new QueueEvent({
        channel: TRANSACTION_SUCCESS_CHANNEL,
        eventName: EVENT.CREATED,
        data: transaction
      })
    );
    return { ok: true };
  }

  public async verotelSuccessWebhook(payload: any) {
    const isValid = await this.verotelService.isValidSignatureFromQuery(payload);
    if (!isValid) throw new Error('Invalid signature');
    // TODO - in order we have to recalculate signature
    const transaction = await this.PaymentTransactionModel.findOne({
      _id: payload.referenceID
    });
    if (!transaction) throw new Error('Transaction not found!');
    // single payment success or first time for recurring request
    if (['purchase'].includes(payload.type) || (payload.subscriptionType === 'recurring' && payload.event === 'initial')) {
      if (transaction.status !== PAYMENT_STATUS.PENDING) throw new Error('Invalid transaction status');

      transaction.status = PAYMENT_STATUS.SUCCESS;
      transaction.paymentResponseInfo = payload;
      transaction.updatedAt = new Date();
      await transaction.save();
      await this.queueEventService.publish(
        new QueueEvent({
          channel: TRANSACTION_SUCCESS_CHANNEL,
          eventName: EVENT.CREATED,
          data: transaction
        })
      );
      return true;
    }

    if (payload.type === 'rebill') {
      // https://webhook.site/590a0cb6-5c4b-4973-b0c5-9b961af514b1?amount=12.31&currency=EUR&custom1=user&custom2=model&custom3=type&event=rebill&nextChargeOn=2021-07-11&paymentMethod=CC&referenceID=asdadad&saleID=456789&shopID=122468&subscriptionPhase=normal&subscriptionType=recurring&type=subscription&signature=1b5b8406f4f7a8067d198fad70c49ba377b09361
      const subscription = await this.subscriptionService.findBySubscriptionId(payload.referenceID);
      if (!subscription) {
        // TODO - check if need to create subscription from custom field in this case
        return false;
      }

      // create user order and transaction for this order
      const price = payload.amount;
      const { userId, performerId } = subscription;
      const order = await this.orderService.createForPerformerSubscriptionRenewal({
        userId,
        performerId,
        price,
        type: subscription.subscriptionType
      });

      const newTransaction = await this.PaymentTransactionModel.create({
        paymentGateway: 'verotel',
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        status: PAYMENT_STATUS.SUCCESS,
        paymentResponseInfo: payload,
        products: []
      });

      await this.queueEventService.publish(
        new QueueEvent({
          channel: TRANSACTION_SUCCESS_CHANNEL,
          eventName: EVENT.CREATED,
          data: newTransaction
        })
      );
    }

    return true;
  }

  public async purchasePerformerSinglePhoto(
    order: OrderDto,
    paymentGateway = 'ccbill'
  ) {
    if (paymentGateway === 'verotel') {
      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        products: [],
        status: PAYMENT_STATUS.PENDING
      });
      const orderDetails = await this.orderService.getDetails(order._id);
      const description = orderDetails?.map((o) => o.name).join('; ');
      const data = await this.verotelService.createSingleRequestFromTransaction(PaymentTransactionDto.fromModel(transaction), {
        description,
        userId: order.buyerId
      });
      await this.PaymentTransactionModel.updateOne({ _id: transaction._id }, {
        $set: {
          paymentToken: data.signature
        }
      });
      return data;
    }
    if (paymentGateway === 'ccbill') {
      const {
        flexformId,
        subAccountNumber,
        salt
      } = await this.getPerformerSinglePaymentGatewaySetting(order.sellerId);

      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        status: PAYMENT_STATUS.PENDING,
        products: []
      });

      return this.ccbillService.singlePurchase({
        salt,
        flexformId,
        subAccountNumber,
        price: order.totalPrice,
        transactionId: transaction._id
      });
    }

    if (paymentGateway === 'emerchant') {
      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        products: [],
        status: PAYMENT_STATUS.PENDING
      });

      const { transaction_id, paymentUrl } = await this.emerchantpayService.singlePurchase(transaction);
      transaction.paymentToken = transaction_id;
      await transaction.save();
      return {
        paymentUrl
      };
    }
    throw new MissingConfigPaymentException();
  }

  public async purchasePerformerFeed(order: OrderDto, paymentGateway = 'ccbill') {
    if (paymentGateway === 'verotel') {
      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        products: [],
        status: PAYMENT_STATUS.PENDING
      });
      const orderDetails = await this.orderService.getDetails(order._id);
      const description = orderDetails?.map((o) => o.name).join('; ');
      const data = await this.verotelService.createSingleRequestFromTransaction(PaymentTransactionDto.fromModel(transaction), {
        description,
        userId: order.buyerId
      });
      await this.PaymentTransactionModel.updateOne({ _id: transaction._id }, {
        $set: {
          paymentToken: data.signature
        }
      });
      return data;
    }
    if (paymentGateway === 'ccbill') {
      const {
        flexformId,
        subAccountNumber,
        salt
      } = await this.getPerformerSinglePaymentGatewaySetting(order.sellerId);
      const currencyCode = await this.settingService.getKeyValue(SETTING_KEYS.CCBILL_CURRENCY_CODE);

      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        status: PAYMENT_STATUS.PENDING,
        products: []
      });

      return this.ccbillService.singlePurchase({
        salt,
        flexformId,
        subAccountNumber,
        price: order.totalPrice,
        transactionId: transaction._id,
        currencyCode: currencyCode || '840'
      });
    }

    if (paymentGateway === 'emerchant') {
      const transaction = await this.PaymentTransactionModel.create({
        paymentGateway,
        orderId: order._id,
        source: order.buyerSource,
        sourceId: order.buyerId,
        type: order.type,
        totalPrice: order.totalPrice,
        products: [],
        status: PAYMENT_STATUS.PENDING
      });

      const { transaction_id, paymentUrl } = await this.emerchantpayService.singlePurchase(transaction);
      transaction.paymentToken = transaction_id;
      await transaction.save();
      return {
        paymentUrl
      };
    }
    throw new MissingConfigPaymentException();
  }
}
