/* eslint-disable no-param-reassign */
import {
  Injectable,
  Inject,
  forwardRef,
  ForbiddenException,
  HttpException
} from '@nestjs/common';
import { PerformerService } from 'src/modules/performer/services';
import {
  ProductService,
  VideoService,
  PhotoService
} from 'src/modules/performer-assets/services';
import { UserDto } from 'src/modules/user/dtos';
import { EntityNotFoundException, StringHelper } from 'src/kernel';
import { Model, SortOrder } from 'mongoose';
import { ObjectId } from 'mongodb';
import * as moment from 'moment';
import { pick } from 'lodash';
import { UserService } from 'src/modules/user/services';
import { MailerService } from 'src/modules/mailer';
import { CouponService } from 'src/modules/coupon/services';
import { SUBSCRIPTION_TYPE } from 'src/modules/subscription/constants';
import { WalletPackageService } from 'src/modules/wallet-packages/services/wallet-package.service';
import { FeedService } from 'src/modules/feed/services';
import { toObjectId } from 'src/kernel/helpers/string.helper';
import { InjectModel } from '@nestjs/mongoose';
import { SettingService } from 'src/modules/settings';
import { SETTING_KEYS } from 'src/modules/settings/constants';
import {
  OrderSearchPayload,
  OrderUpdatePayload,
  PurchaseProductsPayload,
  PurchaseVideoPayload,
  SubscribePerformerPayload,
  PurchaseTokenPayload,
  PurchaseSinglePhotoPayload,
  PurchaseTokenCustomAmountPayload,
  PurchaseFeedPayload
} from '../payloads';
import {
  DELIVERY_STATUS,
  ORDER_STATUS,
  PAYMENT_TYPE,
  PRODUCT_TYPE,
  PAYMENT_GATEWAY,
  PAYMENT_STATUS
} from '../constants';
import { OrderDetailsDto, OrderDto } from '../dtos';
import { DifferentPerformerException } from '../exceptions';
import { Order, OrderDetails } from '../schemas';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private readonly OrderModel: Model<Order>,
    @InjectModel(OrderDetails.name) private readonly OrderDetailsModel: Model<OrderDetails>,

    @Inject(forwardRef(() => FeedService))
    private readonly feedService: FeedService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
    @Inject(forwardRef(() => VideoService))
    private readonly videoService: VideoService,
    @Inject(forwardRef(() => PhotoService))
    private readonly photoService: PhotoService,
    private readonly walletPackageService: WalletPackageService,
    @Inject(forwardRef(() => CouponService))
    private readonly couponService: CouponService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly mailService: MailerService
  ) { }

  public async findById(id: string | ObjectId): Promise<OrderDto> {
    const item = await this.OrderModel.findById(id);
    if (!item) return null;
    return OrderDto.fromModel(item);
  }

  public async findByIds(ids: string[] | ObjectId[]): Promise<OrderDto[]> {
    const items = await this.OrderModel.find({ _id: { $in: ids } });
    return items.map((item) => OrderDto.fromModel(item));
  }

  public async findByQuery(payload: Record<string, any>): Promise<OrderDto[]> {
    const items = await this.OrderModel.find(payload);
    return items.map((item) => OrderDto.fromModel(item));
  }

  public async findDetailsByQuery(payload: Record<string, any>): Promise<OrderDetailsDto[]> {
    const items = await this.OrderDetailsModel.find(payload);
    return items.map((item) => OrderDetailsDto.fromModel(item));
  }

  public async delete(orderId: string | ObjectId): Promise<boolean> {
    await this.OrderModel.deleteOne({ _id: orderId });
    await this.OrderDetailsModel.deleteMany({ orderId });
    return true;
  }

  public async findOneOderDetails(payload: Record<string, any>) {
    const data = await this.OrderDetailsModel.findOne(payload);
    if (!data) return null;
    return OrderDetailsDto.fromModel(data);
  }

  public async countOrderDetailsByQuery(payload: Record<string, any>) {
    return this.OrderDetailsModel.countDocuments(payload);
  }

  public async countOrderByQuery(payload: Record<string, any>) {
    return this.OrderModel.countDocuments(payload);
  }

  /**
   * search in order collections
   * @param req
   * @param user
   */
  public async search(req: OrderSearchPayload) {
    const query: Record<string, any> = {};
    if (req.sellerId) query.sellerId = req.sellerId;
    if (req.buyerId) query.buyerId = req.buyerId;
    if (req.userId) query.buyerId = req.userId;
    if (req.status) query.status = req.status;
    if (req.deliveryStatus) query.deliveryStatus = req.deliveryStatus;
    if (req.paymentGateway) query.paymentGateway = req.paymentGateway;
    if (req.paymentStatus) query.paymentStatus = req.paymentStatus;
    if (req.fromDate && req.toDate) {
      query.createdAt = {
        $gt: moment(req.fromDate),
        $lt: moment(req.toDate)
      };
    }
    const sort = {
      [req.sortBy || 'updatedAt']: req.sort || -1
    };
    const [orders, total] = await Promise.all([
      this.OrderModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.OrderModel.countDocuments(query)
    ]);
    const data = orders.map((o) => OrderDto.fromModel(o));
    const orderIds = orders.map((o) => o._id);
    const performerIds = [
      ...orders.filter((o) => o.buyerSource === 'performer').map((o) => o.buyerId),
      ...orders.filter((o) => o.sellerSource === 'performer').map((o) => o.sellerId)
    ];
    const userIds = orders
      .filter((o) => o.buyerSource === 'user')
      .map((o) => o.buyerId);
    const sellers = [];
    const buyers = [];
    const orderDetails = [];
    if (performerIds.length) {
      const performers = (await this.performerService.findByIds(
        performerIds
      ));
      sellers.push(...performers.map((p) => p.toSearchResponse()));
    }
    if (userIds.length) {
      const users = await this.userService.findByIds(userIds);
      buyers.push(...users.map((u) => new UserDto(u).toResponse()));
    }

    if (orderIds.length) {
      const orderDetailsList = await this.OrderDetailsModel.find({
        orderId: {
          $in: orderIds
        }
      });
      orderDetails.push(...orderDetailsList);
    }
    // eslint-disable-next-line no-restricted-syntax
    for (const order of data) {
      if (order.sellerId) {
        order.seller = sellers.find(
          (s) => s._id.toString() === order.sellerId.toString()
        );
      }
      if (order.buyerId) {
        order.buyer = buyers.find(
          (b) => b._id.toString() === order.buyerId.toString()
        );
        if (!order.buyer) {
          order.buyer = sellers.find(
            (b) => b._id.toString() === order.buyerId.toString()
          );
        }
      }
      order.details = orderDetails.filter(
        (d) => d.orderId.toString() === order._id.toString()
      );
    }

    return {
      data,
      total
    };
  }

  public async orderDetailsSearch(req: OrderSearchPayload, includingCreated = false) {
    const query: Record<string, any> = {
      status: {
        $ne: ORDER_STATUS.CREATED
      }
    };
    if (includingCreated) delete query.status;
    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''),
        'i'
      );
      query.$or = [
        {
          orderNumber: { $regex: regexp }
        },
        {
          name: { $regex: regexp }
        },
        {
          description: { $regex: regexp }
        }
      ];
    }
    if (req.sellerId) query.sellerId = req.sellerId;
    if (req.buyerId) query.buyerId = req.buyerId;
    if (req.userId) query.buyerId = req.userId;
    if (req.status) query.status = req.status;
    if (req.paymentStatus) {
      if (req.paymentStatus === 'created') {
        query.status = ORDER_STATUS.CREATED;
      } else {
        query.paymentStatus = req.paymentStatus;
      }
    }
    if (req.paymentGateway) query.paymentGateway = req.paymentGateway;
    if (req.withoutWallet) {
      query.paymentGateway = {
        $ne: PAYMENT_GATEWAY.WALLET
      };
    }
    if (req.deliveryStatus) query.deliveryStatus = req.deliveryStatus;
    if (req.productTypes?.length) query.productType = { $in: req.productTypes };
    if (req.productType) query.productType = req.productType;
    if (req.fromDate && req.toDate) {
      query.createdAt = {
        $gt: moment(req.fromDate).startOf('day'),
        $lt: moment(req.toDate).endOf('day')
      };
    }
    const sort = {
      [req.sortBy || 'updatedAt']: req.sort || -1
    };
    const [orders, total] = await Promise.all([
      this.OrderDetailsModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.OrderDetailsModel.countDocuments(query)
    ]);

    const sellers = [];
    const buyers = [];
    const performerIds = orders
      .filter((o) => o.sellerSource === 'performer')
      .map((o) => o.sellerId);
    const userIds = orders
      .filter((o) => o.buyerSource === 'user')
      .map((o) => o.buyerId);
    if (performerIds.length) {
      const performers = (await this.performerService.findByIds(
        performerIds
      ));
      sellers.push(...performers.map((p) => p.toSearchResponse()));
    }
    if (userIds.length) {
      const users = await this.userService.findByIds(userIds);
      buyers.push(...users.map((u) => new UserDto(u).toResponse()));
    }

    const data = orders.map((o) => OrderDetailsDto.fromModel(o).toResponse());
    data.forEach((order) => {
      if (order.sellerId) {
        order.seller = sellers.find(
          (s) => s._id.toString() === order.sellerId.toString()
        );
      }
      if (order.buyerId) {
        order.buyer = buyers.find(
          (b) => b._id.toString() === order.buyerId.toString()
        );
      }
    });

    return {
      data,
      total
    };
  }

  public async getOrderDetails(id: string | ObjectId | any): Promise<Partial<OrderDetailsDto>> {
    const details = await this.OrderDetailsModel.findById(id);
    if (!details) {
      throw new EntityNotFoundException();
    }

    const dto = OrderDetailsDto.fromModel(details);
    if (details.buyerSource === 'user') {
      const user = await this.userService.findById(details.buyerId);
      dto.setBuyer(user);
    }

    if (details.sellerSource === 'performer') {
      const performer = await this.performerService.findById(details.sellerId);
      dto.setSeller(performer);
    }

    return dto.toResponse();
  }

  public async updateDetails(
    id: string,
    payload: OrderUpdatePayload,
    currentUser: UserDto
  ) {
    const details = await this.OrderDetailsModel.findById(id);
    if (!details) {
      throw new EntityNotFoundException();
    }
    if (
      !currentUser.roles?.includes('admin')
      && currentUser._id.toString() !== details.sellerId.toString()
    ) {
      throw new ForbiddenException();
    }
    const oldStatus = details.deliveryStatus;
    const updateData = {
      ...pick(payload, [
        'shippingCode',
        'deliveryStatus'
      ]),
      updatedAt: new Date()
    };
    await this.OrderDetailsModel.updateOne({ _id: id }, updateData);
    const newUpdate = await this.OrderDetailsModel.findById(id);
    if (newUpdate.deliveryStatus !== oldStatus) {
      if (details.buyerSource === 'user') {
        const user = await this.userService.findById(details.buyerId);
        if (user) {
          await this.mailService.send({
            subject: 'Order Status Changed',
            to: user.email,
            data: {
              user,
              order: newUpdate,
              deliveryStatus: newUpdate.deliveryStatus,
              oldDeliveryStatus: oldStatus
            },
            template: 'update-order-status'
          });
        }
      }
    }
  }

  public generateOrderNumber() {
    return `${StringHelper.randomString(5)}`.toUpperCase();
  }

  /**
   * get list of sub orders
   * @param orderId order id
   */
  public async getDetails(orderId: string | ObjectId): Promise<OrderDetailsDto[]> {
    const items = await this.OrderDetailsModel.find({
      orderId
    });
    return items.map((item) => OrderDetailsDto.fromModel(item));
  }

  /**
   * create order with created status, means just place cart to order and waiting to process
   * @param payload
   * @param user
   * @param orderStatus
   */
  public async createFromPerformerProducts(
    payload: PurchaseProductsPayload,
    user: UserDto,
    buyerSource = 'user',
    orderStatus = ORDER_STATUS.CREATED
  ) {
    const {
      products,
      deliveryAddress,
      postalCode,
      phoneNumber,
      paymentGateway = 'ccbill'
    } = payload;
    const productIds = payload.products.map((p) => p._id);
    const prods = await this.productService.findByIds(productIds);
    if (!products.length || !prods.length) {
      throw new EntityNotFoundException();
    }
    const checkSamePerformerProducts = prods.filter(
      (p) => p.performerId.toString() === prods[0].performerId.toString()
    );
    if (checkSamePerformerProducts.length !== prods.length) {
      throw new DifferentPerformerException();
    }
    const { performerId } = prods[0];
    const performer = await this.performerService.findById(performerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }

    let totalQuantity = 0;
    let originalPrice = 0;
    let coupon = null;
    if (payload.couponCode) {
      coupon = await this.couponService.applyCoupon(
        payload.couponCode,
        user._id
      );
    }

    const orderDetails = [];
    prods.forEach((p) => {
      const groupProducts = products.filter(
        (op) => op._id.toString() === p._id.toString()
      );
      let productQuantity = 0;
      groupProducts.forEach((op) => {
        productQuantity += op.quantity;
      });
      const originalProductPrice = productQuantity * p.price;
      const productPrice = coupon
        ? parseFloat(
          (originalProductPrice - originalProductPrice * coupon.value) as any
        ).toFixed(2)
        : originalProductPrice;
      totalQuantity += productQuantity;
      originalPrice += originalProductPrice;
      orderDetails.push({
        buyerId: user._id,
        buyerSource: 'user',
        sellerId: performerId,
        sellerSource: 'performer',
        name: p.name,
        description: p.description,
        unitPrice: p.price,
        originalPrice: originalProductPrice,
        totalPrice: productPrice,
        productType: p.type,
        productId: p._id,
        quantity: productQuantity,
        payBy: paymentGateway === PAYMENT_GATEWAY.WALLET ? 'wallet' : 'money',
        deliveryStatus: DELIVERY_STATUS.CREATED,
        deliveryAddress,
        postalCode,
        phoneNumber,
        paymentGateway,
        couponInfo: coupon
      });
    });

    const totalPrice = coupon
      ? parseFloat((originalPrice - originalPrice * coupon.value).toFixed(2))
      : originalPrice;

    if (totalPrice > 300 && paymentGateway !== PAYMENT_GATEWAY.WALLET) {
      throw new HttpException('Maximum amount of this payment gateway is not greater than $300', 406);
    }

    const order = await this.OrderModel.create({
      buyerId: user._id,
      buyerSource,
      sellerId: performerId,
      sellerSource: 'performer',
      type: PAYMENT_TYPE.PERFORMER_PRODUCT,
      orderNumber: this.generateOrderNumber(),
      quantity: totalQuantity,
      originalPrice,
      totalPrice,
      couponInfo: coupon,
      status: orderStatus,
      deliveryAddress,
      postalCode,
      phoneNumber,
      paymentGateway,
      description: orderDetails.map((o) => o.name).join('; '),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await Promise.all(
      orderDetails.map((detail, index) => {
        detail.orderId = order._id;
        detail.orderNumber = `${order.orderNumber}-S${index + 1}`;
        return this.OrderDetailsModel.create(detail);
      })
    );

    return OrderDto.fromModel(order);
  }

  public async createFromPerformerVOD(
    payload: PurchaseVideoPayload,
    user: UserDto,
    buyerSource = 'user',
    orderStatus = ORDER_STATUS.CREATED
  ) {
    const { paymentGateway = 'ccbill', videoId, couponCode } = payload;
    const video = await this.videoService.findById(videoId);
    if (!video?.isSaleVideo || !video?.price) {
      throw new EntityNotFoundException();
    }
    const { performerId } = video;
    const performer = await this.performerService.findById(performerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }

    const totalQuantity = 1;
    const originalPrice = video.price;
    let coupon = null;
    if (couponCode) {
      coupon = await this.couponService.applyCoupon(couponCode, user._id);
    }
    const productPrice = coupon
      ? parseFloat((originalPrice - originalPrice * coupon.value).toFixed(2))
      : originalPrice;

    const order = await this.OrderModel.create({
      buyerId: user._id,
      buyerSource,
      sellerId: performerId,
      sellerSource: 'performer',
      type: PAYMENT_TYPE.SALE_VIDEO,
      orderNumber: this.generateOrderNumber(),
      postalCode: '',
      quantity: totalQuantity,
      originalPrice,
      totalPrice: productPrice,
      couponInfo: coupon,
      status: orderStatus,
      deliveryAddress: null,
      paymentGateway,
      description: video.title,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.OrderDetailsModel.create({
      orderId: order._id,
      orderNumber: `${order.orderNumber}-${this.generateOrderNumber()}`,
      buyerId: user._id,
      buyerSource: 'user',
      sellerId: performerId,
      sellerSource: 'performer',
      name: video.title,
      description: video.title || video.description,
      unitPrice: video.price,
      originalPrice,
      totalPrice: productPrice,
      productType: PRODUCT_TYPE.SALE_VIDEO,
      productId: video._id,
      quantity: 1,
      payBy: paymentGateway === PAYMENT_GATEWAY.WALLET ? 'wallet' : 'money',
      deliveryStatus: DELIVERY_STATUS.CREATED,
      couponInfo: coupon,
      paymentGateway
    });

    return OrderDto.fromModel(order);
  }

  public async createForPerformerSubscription(
    payload: SubscribePerformerPayload,
    user: UserDto,
    buyerSource = 'user',
    orderStatus = ORDER_STATUS.CREATED
  ) {
    const { type, performerId, paymentGateway = 'ccbill' } = payload;
    const performer = await this.performerService.findById(performerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }
    const price = type === SUBSCRIPTION_TYPE.MONTHLY
      ? performer.monthlyPrice
      : performer.yearlyPrice;

    // validate pricing for subscription
    if (price < SettingService.getValueByKey(SETTING_KEYS.MIN_SUBSCRIPTION_PRICE)
      || price > SettingService.getValueByKey(SETTING_KEYS.MAX_SUBSCRIPTION_PRICE)) {
      throw new HttpException('Subscription price does\'t match our requirement!', 400);
    }

    const name = type === SUBSCRIPTION_TYPE.MONTHLY
      ? `Monthly subscription for ${performer.username}`
      : `Yearly subscription for ${performer.username}`;
    const description = name;

    const order = await this.OrderModel.create({
      buyerId: user._id,
      buyerSource,
      sellerId: toObjectId(performerId),
      sellerSource: 'performer',
      type:
        type === SUBSCRIPTION_TYPE.MONTHLY
          ? PAYMENT_TYPE.MONTHLY_SUBSCRIPTION
          : PAYMENT_TYPE.YEARLY_SUBSCRIPTION,
      orderNumber: this.generateOrderNumber(),
      postalCode: '',
      quantity: 1,
      totalPrice: price,
      couponInfo: null,
      status: orderStatus,
      deliveryAddress: null,
      paymentGateway,
      description,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.OrderDetailsModel.create({
      orderId: order._id,
      orderNumber: `${order.orderNumber}-${this.generateOrderNumber()}`,
      buyerId: user._id,
      buyerSource: 'user',
      sellerId: toObjectId(performerId),
      sellerSource: 'performer',
      name,
      description,
      unitPrice: price,
      originalPrice: price,
      totalPrice: price,
      productType:
        type === SUBSCRIPTION_TYPE.MONTHLY
          ? PAYMENT_TYPE.MONTHLY_SUBSCRIPTION
          : PAYMENT_TYPE.YEARLY_SUBSCRIPTION,
      productId: performer._id,
      quantity: 1,
      paymentGateway,
      payBy: 'money', // default!!
      deliveryStatus: DELIVERY_STATUS.CREATED,
      couponInfo: null
    });

    return OrderDto.fromModel(order);
  }

  public async createForPerformerSubscriptionRenewal(
    {
      userId, performerId, type, price, paymentGateway = 'ccbill'
    },
    buyerSource = 'user',
    orderStatus = ORDER_STATUS.CREATED
  ) {
    const performer = await this.performerService.findById(performerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }

    const name = `Renewal subscription for ${performer.username}`;
    const description = name;

    const user = await this.userService.findById(userId);
    const order = await this.OrderModel.create({
      buyerId: userId,
      buyerSource,
      sellerId: performerId,
      sellerSource: 'performer',
      type:
        type === SUBSCRIPTION_TYPE.MONTHLY
          ? PAYMENT_TYPE.MONTHLY_SUBSCRIPTION
          : PAYMENT_TYPE.YEARLY_SUBSCRIPTION,
      orderNumber: this.generateOrderNumber(),
      postalCode: '',
      quantity: 1,
      totalPrice: price,
      couponInfo: null,
      status: orderStatus,
      deliveryAddress: null,
      paymentGateway,
      description,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.OrderDetailsModel.create({
      orderId: order._id,
      orderNumber: `${order.orderNumber}-${this.generateOrderNumber()}`,
      buyerId: user._id,
      buyerSource: 'user',
      sellerId: performerId,
      sellerSource: 'performer',
      name,
      description,
      unitPrice: price,
      originalPrice: price,
      totalPrice: price,
      productType:
        type === SUBSCRIPTION_TYPE.MONTHLY
          ? PAYMENT_TYPE.MONTHLY_SUBSCRIPTION
          : PAYMENT_TYPE.YEARLY_SUBSCRIPTION,
      productId: performer._id,
      quantity: 1,
      paymentGateway,
      payBy: 'money', // default!!
      deliveryStatus: DELIVERY_STATUS.CREATED,
      couponInfo: null
    });

    return OrderDto.fromModel(order);
  }

  public async createFromPerformerSinglePhoto(
    payload: PurchaseSinglePhotoPayload,
    user: UserDto,
    buyerSource = 'user',
    orderStatus = ORDER_STATUS.CREATED
  ) {
    const { paymentGateway = 'ccbill', photoId } = payload;
    const photo = await this.photoService.findById(photoId);
    if (!photo?.isSale || !photo?.price) {
      throw new EntityNotFoundException();
    }
    const { performerId } = photo;
    const performer = await this.performerService.findById(performerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }
    const order = await this.OrderModel.create({
      buyerId: user._id,
      buyerSource,
      sellerId: performerId,
      sellerSource: 'performer',
      type: PAYMENT_TYPE.SALE_PHOTO,
      orderNumber: this.generateOrderNumber(),
      postalCode: '',
      quantity: 1,
      originalPrice: photo.price,
      totalPrice: photo.price,
      couponInfo: null,
      status: orderStatus,
      deliveryAddress: null,
      paymentGateway,
      description: photo.title || photo.description,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.OrderDetailsModel.create({
      orderId: order._id,
      orderNumber: `${order.orderNumber}-${this.generateOrderNumber()}`,
      buyerId: user._id,
      buyerSource: 'user',
      sellerId: performerId,
      sellerSource: 'performer',
      name: photo.title,
      description: photo.title || photo.description,
      unitPrice: photo.price,
      originalPrice: photo.price,
      totalPrice: photo.price,
      productType: PRODUCT_TYPE.SALE_PHOTO,
      productId: photo._id,
      quantity: 1,
      payBy: paymentGateway === PAYMENT_GATEWAY.WALLET ? 'wallet' : 'money',
      deliveryStatus: DELIVERY_STATUS.CREATED,
      couponInfo: null,
      paymentGateway
    });

    return OrderDto.fromModel(order);
  }

  public async createForWallet(
    payload: PurchaseTokenPayload,
    user: UserDto,
    buyerSource = 'user',
    orderStatus = ORDER_STATUS.CREATED
  ) {
    const { walletPackageId, paymentGateway } = payload;
    const walletPackage = await this.walletPackageService.findById(walletPackageId);
    if (!walletPackage) {
      throw new EntityNotFoundException('Wallet package not found');
    }
    const originalPrice = walletPackage.price;
    const productPrice = originalPrice;
    const order = await this.OrderModel.create({
      buyerId: user._id,
      buyerSource,
      sellerId: null,
      sellerSource: 'system',
      type: PAYMENT_TYPE.WALLET,
      orderNumber: this.generateOrderNumber(),
      postalCode: '',
      quantity: 1,
      originalPrice: walletPackage.price,
      totalPrice: walletPackage.price,
      couponInfo: null,
      status: orderStatus,
      deliveryAddress: null,
      paymentGateway,
      description: `Purchase wallet package: ${walletPackage.name}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.OrderDetailsModel.create({
      orderId: order._id,
      orderNumber: `${order.orderNumber}-${this.generateOrderNumber()}`,
      buyerId: user._id,
      buyerSource: 'user',
      sellerId: null,
      sellerSource: 'system',
      name: walletPackage.name,
      description: walletPackage.description,
      unitPrice: walletPackage.price,
      originalPrice,
      totalPrice: productPrice,
      productType: PRODUCT_TYPE.WALLET,
      productId: walletPackage._id,
      quantity: 1,
      payBy: 'money', // default!!
      deliveryStatus: DELIVERY_STATUS.CREATED,
      couponInfo: null,
      paymentGateway
    });

    return OrderDto.fromModel(order);
  }

  public async getPurchasedVideos({
    userId,
    limit,
    offset
  }) {
    const query = {
      buyerId: userId,
      status: ORDER_STATUS.PAID,
      productType: PRODUCT_TYPE.SALE_VIDEO
    };
    const sort = {
      updatedAt: -1 as SortOrder
    };
    const [data, total] = await Promise.all([
      this.OrderDetailsModel
        .find(query)
        .lean()
        .sort(sort)
        .limit(limit || 10)
        .skip(offset || 0),
      this.OrderDetailsModel.countDocuments(query)
    ]);
    return {
      data: data.map((item) => OrderDetailsDto.fromModel(item)),
      total
    };
  }

  public async createForCustomWalletAmount(
    payload: PurchaseTokenCustomAmountPayload,
    user: UserDto,
    buyerSource = 'user',
    orderStatus = ORDER_STATUS.CREATED
  ) {
    const { amount, paymentGateway } = payload;
    const originalPrice = amount;
    const productPrice = originalPrice;
    const order = await this.OrderModel.create({
      buyerId: user._id,
      buyerSource,
      sellerId: null,
      sellerSource: 'system',
      type: PAYMENT_TYPE.WALLET,
      orderNumber: this.generateOrderNumber(),
      postalCode: '',
      quantity: 1,
      originalPrice: amount,
      totalPrice: amount,
      couponInfo: null,
      status: orderStatus,
      deliveryAddress: null,
      paymentGateway,
      description: `Topup ${amount} to Wallet`,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.OrderDetailsModel.create({
      orderId: order._id,
      orderNumber: `${order.orderNumber}-${this.generateOrderNumber()}`,
      buyerId: user._id,
      buyerSource: 'user',
      sellerId: null,
      sellerSource: 'system',
      name: `Topup ${amount} to Wallet`,
      description: `Topup ${amount} to Wallet, use custom amount.`,
      unitPrice: amount,
      originalPrice,
      totalPrice: productPrice,
      productType: PRODUCT_TYPE.WALLET,
      productId: null,
      quantity: 1,
      payBy: 'money', // default!!
      deliveryStatus: DELIVERY_STATUS.CREATED,
      couponInfo: null,
      paymentGateway
    });

    return OrderDto.fromModel(order);
  }

  public async createOrderForTip(
    amount: number,
    userId: string | ObjectId,
    performerId: string | ObjectId,
    orderStatus = ORDER_STATUS.PAID,
    paymentGateway = PAYMENT_GATEWAY.WALLET
  ) {
    const performer = await this.performerService.findById(performerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }

    const order = await this.OrderModel.create({
      buyerId: userId,
      buyerSource: 'user',
      sellerId: performerId,
      sellerSource: 'performer',
      type: PAYMENT_TYPE.TIP,
      orderNumber: this.generateOrderNumber(),
      postalCode: '',
      quantity: 1,
      originalPrice: amount,
      totalPrice: amount,
      couponInfo: null,
      status: orderStatus,
      deliveryAddress: DELIVERY_STATUS.DELIVERED,
      paymentGateway,
      description: `Tip ${amount} to ${performer.username}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const orderDetail = await this.OrderDetailsModel.create({
      orderId: order._id,
      orderNumber: `${order.orderNumber}-${this.generateOrderNumber()}`,
      buyerId: userId,
      buyerSource: 'user',
      sellerId: performerId,
      sellerSource: 'performer',
      name: `Tip ${amount} to ${performer.username}`,
      description: `Tip ${amount} to ${performer.username} from ${paymentGateway}`,
      unitPrice: amount,
      originalPrice: amount,
      totalPrice: amount,
      productType: PRODUCT_TYPE.TIP,
      productId: null,
      quantity: 1,
      payBy: paymentGateway === PAYMENT_GATEWAY.WALLET ? 'wallet' : 'money',
      deliveryStatus: DELIVERY_STATUS.DELIVERED,
      couponInfo: null,
      paymentGateway,
      status: ORDER_STATUS.PAID,
      paymentStatus: PAYMENT_STATUS.SUCCESS
    });

    return {
      order: OrderDto.fromModel(order),
      orderDetail: OrderDetailsDto.fromModel(orderDetail)
    };
  }

  public async createOrderForPrivateChat(
    amount: number,
    userId: string | ObjectId,
    performerId: string | ObjectId,
    conversationId: string | ObjectId,
    orderStatus = ORDER_STATUS.PAID,
    paymentGateway = PAYMENT_GATEWAY.WALLET
  ) {
    const performer = await this.performerService.findById(performerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }

    const order = await this.OrderModel.create({
      buyerId: userId,
      buyerSource: 'user',
      sellerId: performerId,
      sellerSource: 'performer',
      type: PAYMENT_TYPE.PRIVATE_CHAT,
      orderNumber: this.generateOrderNumber(),
      postalCode: '',
      quantity: 1,
      originalPrice: amount,
      totalPrice: amount,
      couponInfo: null,
      status: orderStatus,
      deliveryAddress: null,
      paymentGateway,
      description: `Private chat to ${performer.username}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const orderDetail = await this.OrderDetailsModel.create({
      orderId: order._id,
      orderNumber: `${order.orderNumber}-${this.generateOrderNumber()}`,
      buyerId: userId,
      buyerSource: 'user',
      sellerId: performerId,
      sellerSource: 'performer',
      name: `Charge private chat ${amount} to ${performer.username}`,
      description: `Charge private chat ${amount} to ${performer.username} from ${paymentGateway}`,
      unitPrice: amount,
      originalPrice: amount,
      totalPrice: amount,
      productType: PRODUCT_TYPE.PRIVATE_CHAT,
      productId: conversationId,
      quantity: 1,
      payBy: paymentGateway === PAYMENT_GATEWAY.WALLET ? 'wallet' : 'money',
      deliveryStatus: DELIVERY_STATUS.DELIVERED,
      couponInfo: null,
      paymentGateway,
      status: ORDER_STATUS.PAID,
      paymentStatus: PAYMENT_STATUS.SUCCESS
    });

    return {
      order: OrderDto.fromModel(order),
      orderDetail: OrderDetailsDto.fromModel(orderDetail)
    };
  }

  public async appendOrderDetailForPrivateChat(
    orderId: string | ObjectId | any,
    amount,
    paymentGateway = PAYMENT_GATEWAY.WALLET
  ) {
    const order = await this.OrderModel.findOne({ _id: orderId });
    if (!order) return null;
    const performer = await this.performerService.findById(order.sellerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }

    const orderDetail = await this.OrderDetailsModel.create({
      orderId: order._id,
      orderNumber: `${order.orderNumber}-${this.generateOrderNumber()}`,
      buyerId: order.buyerId,
      buyerSource: 'user',
      sellerId: order.sellerId,
      sellerSource: 'performer',
      name: `Charge ${amount} for private chat to ${performer.username}`,
      description: `Charge ${amount} for private chat to ${performer.username} from ${paymentGateway}`,
      unitPrice: amount,
      originalPrice: amount,
      totalPrice: amount,
      productType: PRODUCT_TYPE.PRIVATE_CHAT,
      productId: null,
      quantity: 1,
      payBy: paymentGateway === PAYMENT_GATEWAY.WALLET ? 'wallet' : 'money',
      deliveryStatus: DELIVERY_STATUS.DELIVERED,
      couponInfo: null,
      paymentGateway,
      status: ORDER_STATUS.PAID,
      paymentStatus: PAYMENT_STATUS.SUCCESS
    });

    await this.OrderModel.updateOne({ _id: orderId }, {
      $inc: {
        originalPrice: amount,
        totalPrice: amount
      }
    });

    return {
      order: OrderDto.fromModel(order),
      orderDetail: OrderDetailsDto.fromModel(orderDetail)
    };
  }

  public async updatePaidStatus(orderId) {
    await this.OrderModel.updateOne({ _id: orderId }, {
      $set: {
        status: ORDER_STATUS.PAID,
        paymentStatus: PAYMENT_STATUS.SUCCESS
      }
    });
    await this.OrderDetailsModel.updateMany({ orderId }, {
      $set: {
        status: ORDER_STATUS.PAID,
        paymentStatus: PAYMENT_STATUS.SUCCESS
      }
    });
  }

  public async createFromPerformerFeed(payload: PurchaseFeedPayload, user: UserDto, buyerSource = 'user', orderStatus = ORDER_STATUS.CREATED) {
    const { paymentGateway = 'ccbill', feedId, couponCode } = payload;
    const feed = await this.feedService.findById(feedId);
    if (!feed?.isSale || !feed?.price) {
      throw new EntityNotFoundException();
    }
    const { fromSourceId: performerId } = feed;
    const performer = await this.performerService.findById(performerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }

    const totalQuantity = 1;
    const originalPrice = feed.price;
    let coupon = null;
    if (couponCode) {
      coupon = await this.couponService.applyCoupon(couponCode, user._id);
    }
    const productPrice = coupon
      ? parseFloat((originalPrice - originalPrice * coupon.value).toFixed(2))
      : originalPrice;

    const order = await this.OrderModel.create({
      buyerId: user._id,
      buyerSource,
      sellerId: performerId,
      sellerSource: 'performer',
      type: PAYMENT_TYPE.FEED,
      orderNumber: this.generateOrderNumber(),
      postalCode: '',
      quantity: totalQuantity,
      originalPrice,
      totalPrice: productPrice,
      couponInfo: coupon,
      status: orderStatus,
      deliveryAddress: null,
      paymentGateway,
      description: feed.text,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.OrderDetailsModel.create({
      orderId: order._id,
      orderNumber: `${order.orderNumber}-${this.generateOrderNumber()}`,
      buyerId: user._id,
      buyerSource: 'user',
      sellerId: performerId,
      sellerSource: 'performer',
      name: `Purchase ${performer?.name || performer?.username || 'N/A'} post`,
      description: feed.text,
      unitPrice: feed.price,
      originalPrice,
      totalPrice: productPrice,
      productType: PRODUCT_TYPE.FEED,
      productId: feed._id,
      quantity: 1,
      payBy: paymentGateway === PAYMENT_GATEWAY.WALLET ? 'wallet' : 'money',
      deliveryStatus: DELIVERY_STATUS.CREATED,
      couponInfo: coupon,
      paymentGateway
    });
    return OrderDto.fromModel(order);
  }
}
