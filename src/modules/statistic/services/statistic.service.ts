import { Injectable } from '@nestjs/common';
import { UserService } from 'src/modules/user/services';
import { PerformerService } from 'src/modules/performer/services';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import { EarningService } from 'src/modules/earning/services/earning.service';
import {
  GalleryService, PhotoService, ProductService, VideoService
} from 'src/modules/performer-assets/services';
import { OrderService } from 'src/modules/payment/services';
import { STATUS_ACTIVE, STATUS_INACTIVE, STATUS_PENDING_EMAIL_CONFIRMATION } from '../../user/constants';
import { PERFORMER_STATUSES } from '../../performer/constants';
import { ORDER_STATUS } from '../../payment/constants';

@Injectable()
export class StatisticService {
  constructor(
    private readonly userService: UserService,
    private readonly performerService: PerformerService,
    private readonly subscriptionService: SubscriptionService,
    private readonly earningService: EarningService,
    private readonly videoService: VideoService,
    private readonly galleryService: GalleryService,
    private readonly photoService: PhotoService,
    private readonly productService: ProductService,
    private readonly orderService: OrderService
  ) { }

  public async stats(): Promise<any> {
    const totalActiveUsers = await this.userService.countByStatus(STATUS_ACTIVE);
    const totalInactiveUsers = await this.userService.countByStatus(STATUS_INACTIVE);
    const totalPendingUsers = await this.userService.countByStatus(STATUS_PENDING_EMAIL_CONFIRMATION);
    const totalActivePerformers = await this.performerService.countByStatus(STATUS_ACTIVE);
    const totalInactivePerformers = await this.performerService.countByStatus(STATUS_INACTIVE);
    const totalPendingPerformers = await this.performerService.countByStatus(PERFORMER_STATUSES.PENDING);
    const totalGalleries = await this.galleryService.countByQuery({});
    const totalPhotos = await this.photoService.countByQuery({});
    const totalVideos = await this.videoService.countByQuery({});
    const totalActiveSubscribers = await this.subscriptionService.totalActiveSubscribers();
    const totalSubscribers = await this.subscriptionService.totalSubscribers();
    const totalCreatedOrders = await this.orderService.countOrderDetailsByQuery({ deliveryStatus: ORDER_STATUS.CREATED });
    const totalDeliveredOrders = await this.orderService.countOrderDetailsByQuery({ deliveryStatus: ORDER_STATUS.DELIVERED });
    const totalShippingdOrders = await this.orderService.countOrderDetailsByQuery({ deliveryStatus: ORDER_STATUS.SHIPPING });
    const totalRefundedOrders = await this.orderService.countOrderDetailsByQuery({ deliveryStatus: ORDER_STATUS.REFUNDED });
    const totalProducts = await this.productService.countByQuery({});
    const [totalGrossPrice, totalNetPrice] = await Promise.all([
      this.earningService.totalGrossAmount(),
      this.earningService.totalNetAmount()
    ]);
    return {
      totalActiveUsers,
      totalInactiveUsers,
      totalPendingUsers,
      totalActivePerformers,
      totalInactivePerformers,
      totalPendingPerformers,
      totalGalleries,
      totalPhotos,
      totalVideos,
      totalProducts,
      totalActiveSubscribers,
      totalSubscribers,
      totalCreatedOrders,
      totalDeliveredOrders,
      totalShippingdOrders,
      totalRefundedOrders,
      totalGrossPrice,
      totalNetPrice
    };
  }
}
