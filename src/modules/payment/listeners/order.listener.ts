import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import { QueueEventService, QueueEvent } from 'src/kernel';
import {
  TRANSACTION_SUCCESS_CHANNEL,
  PAYMENT_TYPE,
  ORDER_PAID_SUCCESS_CHANNEL,
  DELIVERY_STATUS
} from 'src/modules/payment/constants';
import { EVENT } from 'src/kernel/constants';
import { SettingService } from 'src/modules/settings/services';
import { PerformerService } from 'src/modules/performer/services';
import { UserService } from 'src/modules/user/services';
import { MailerService } from 'src/modules/mailer';
import { WalletPackageService } from 'src/modules/wallet-packages/services/wallet-package.service';
import { InjectModel } from '@nestjs/mongoose';
import { OrderDetailsDto, OrderDto, PaymentTransactionDto } from '../dtos';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants';
import { Order, OrderDetails } from '../schemas';

const ORDER_CHANNEL = 'ORDER_CHANNEL';

@Injectable()
export class OrderListener {
  constructor(
    @InjectModel(Order.name) private readonly OrderModel: Model<Order>,
    @InjectModel(OrderDetails.name) private readonly OrderDetailsModel: Model<OrderDetails>,

    @Inject(forwardRef(() => WalletPackageService))
    private readonly walletPackageService: WalletPackageService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly mailService: MailerService,
    private readonly queueEventService: QueueEventService
  ) {
    this.queueEventService.subscribe(
      TRANSACTION_SUCCESS_CHANNEL,
      ORDER_CHANNEL,
      this.handleListen.bind(this)
    );
  }

  private async handleEmailProducts(order: OrderDto, orderDetails: OrderDetailsDto[]): Promise<any> {
    const adminEmail = SettingService.getByKey('adminEmail').value || process.env.ADMIN_EMAIL;
    const performer = await this.performerService.findById(order.sellerId);
    const user = await this.userService.findById(order.buyerId);
    if (!user || !performer) {
      return false;
    }
    const data = {
      performer,
      user,
      order,
      orderDetails
    };
    // mail to performer
    if (performer.email) {
      await this.mailService.send({
        subject: 'New payment success',
        to: performer.email,
        data,
        template: 'performer-payment-success'
      });
    }
    // mail to admin
    if (adminEmail) {
      await this.mailService.send({
        subject: 'New payment success',
        to: adminEmail,
        data,
        template: 'admin-payment-success'
      });
    }
    // mail to user
    if (user.email) {
      await this.mailService.send({
        subject: 'New payment success',
        to: user.email,
        data,
        template: 'user-payment-success'
      });
    }

    return true;
  }

  private async handleEmailSubscription(order: OrderDto, orderDetails: OrderDetailsDto[]): Promise<any> {
    // TODO - define new emails templates
    const adminEmail = SettingService.getByKey('adminEmail').value || process.env.ADMIN_EMAIL;
    const performer = await this.performerService.findById(order.sellerId);
    const user = await this.userService.findById(order.buyerId);
    if (!user || !performer) {
      return false;
    }
    const data = {
      performer,
      user,
      order,
      orderDetails
    };
    // mail to admin
    if (adminEmail) {
      await this.mailService.send({
        subject: 'New payment success',
        to: adminEmail,
        data,
        template: 'admin-payment-success'
      });
    }
    // mail to user
    if (user.email) {
      await this.mailService.send({
        subject: 'New payment success',
        to: user.email,
        data,
        template: 'user-payment-success'
      });
    }

    return true;
  }

  private async handleWalletEmail(order: OrderDto, orderDetails: OrderDetailsDto[]): Promise<any> {
    // TODO - define new emails templates
    const adminEmail = SettingService.getByKey('adminEmail').value || process.env.ADMIN_EMAIL;
    const user = await this.userService.findById(order.buyerId);
    if (!user) {
      return false;
    }
    const data = {
      user,
      order,
      orderDetails
    };
    // mail to admin
    if (adminEmail) {
      await this.mailService.send({
        subject: 'New payment token package success',
        to: adminEmail,
        data,
        template: 'admin-payment-wallet-package-success.html'
      });
    }
    // mail to user
    if (user.email) {
      await this.mailService.send({
        subject: 'New payment token package success',
        to: user.email,
        data,
        template: 'user-payment-success.html'
      });
    }

    return true;
  }

  private async handleBalanceFromWallet(orderDetails: OrderDetailsDto[]) {
    await orderDetails.reduce(async (lp, orderDetail) => {
      await lp;
      let amount = orderDetail.totalPrice;
      if (orderDetail.productId) {
        const tokenPackage = await this.walletPackageService.findById(orderDetail.productId);
        if (tokenPackage) amount = tokenPackage.token;
      }
      await this.userService.increaseBalance(orderDetail.buyerId, amount, false);
      return Promise.resolve();
    }, Promise.resolve());
  }

  public async handleListen(
    event: QueueEvent
  ): Promise<OrderDto> {
    if (event.eventName !== EVENT.CREATED) {
      return;
    }
    const transaction = event.data as PaymentTransactionDto;
    if (transaction?.status !== PAYMENT_STATUS.SUCCESS) {
      return;
    }

    const order = await this.OrderModel.findById(transaction.orderId);
    if (!order) {
      // TODO - log me
      return;
    }
    order.status = ORDER_STATUS.PAID;
    order.paymentStatus = PAYMENT_STATUS.SUCCESS;
    await order.save();
    // update for sub order payment status
    const orderDetails = await this.OrderDetailsModel.find({ orderId: order._id });
    await orderDetails.reduce(async (lp, detail) => {
      await lp;
      detail.set('paymentStatus', PAYMENT_STATUS.SUCCESS);
      detail.set('status', ORDER_STATUS.PAID);
      detail.set('transactionId', transaction._id);
      if (detail.productType !== 'physical') {
        detail.set('deliveryStatus', DELIVERY_STATUS.DELIVERED);
      }
      await detail.save();
      return Promise.resolve();
    }, Promise.resolve());

    const orderDto = OrderDto.fromModel(order);
    const orderDetailsDtos = orderDetails.map((d) => OrderDetailsDto.fromModel(d));

    await this.queueEventService.publish(
      new QueueEvent({
        channel: ORDER_PAID_SUCCESS_CHANNEL,
        eventName: EVENT.CREATED,
        data: {
          order: orderDto,
          orderDetails: orderDetailsDtos,
          transaction
        }
      })
    );
    // TODO - send digital download link to user
    switch (order.type) {
      case PAYMENT_TYPE.PERFORMER_PRODUCT:
        await this.handleEmailProducts(orderDto, orderDetailsDtos);
        break;
      case PAYMENT_TYPE.SALE_VIDEO:
        await this.handleEmailProducts(orderDto, orderDetailsDtos);
        break;
      case PAYMENT_TYPE.YEARLY_SUBSCRIPTION:
        await this.handleEmailSubscription(orderDto, orderDetailsDtos);
        break;
      case PAYMENT_TYPE.MONTHLY_SUBSCRIPTION:
        await this.handleEmailSubscription(orderDto, orderDetailsDtos);
        break;
      case PAYMENT_TYPE.WALLET: {
        await this.handleBalanceFromWallet(orderDetailsDtos);
        await this.handleWalletEmail(orderDto, orderDetailsDtos);
        break;
      }
      default: break;
    }
  }
}
