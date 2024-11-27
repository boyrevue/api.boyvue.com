import {
  Controller,
  Injectable,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Post,
  Body,
  HttpException
} from '@nestjs/common';
import { RoleGuard } from 'src/modules/auth/guards';
import { DataResponse } from 'src/kernel';
import { CurrentUser, Roles } from 'src/modules/auth';
import { SettingService } from 'src/modules/settings';
import { SETTING_KEYS } from 'src/modules/settings/constants';
import {
  SubscribePerformerPayload,
  PurchaseTokenPayload,
  PurchaseProductsPayload,
  PurchaseVideoPayload,
  PurchaseSinglePhotoPayload,
  PurchaseTokenCustomAmountPayload,
  PurchaseFeedPayload
} from '../payloads';
import { UserDto } from '../../user/dtos';
import { PaymentService } from '../services/payment.service';
import { OrderService } from '../services';

@Injectable()
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService
  ) { }

  @Post('/subscribe/performers')
  @HttpCode(HttpStatus.OK)
  @Roles('user')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @CurrentUser() user: UserDto,
    @Body() payload: SubscribePerformerPayload
  ): Promise<DataResponse<any>> {
    const order = await this.orderService.createForPerformerSubscription(payload, user);
    const info = await this.paymentService.subscribePerformer(order, payload.paymentGateway || 'ccbill');
    return DataResponse.ok(info);
  }

  /**
   * purchase a performer video
   * @param user current login user
   * @param videoId performer video
   * @param payload
   */
  @Post('/purchase-video')
  @HttpCode(HttpStatus.OK)
  @Roles('user')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async purchaseVideo(
    @CurrentUser() user: UserDto,
    @Body() payload: PurchaseVideoPayload
  ): Promise<DataResponse<any>> {
    const order = await this.orderService.createFromPerformerVOD(payload, user);
    const info = await this.paymentService.purchasePerformerVOD(order, payload.paymentGateway || 'ccbill');
    return DataResponse.ok(info);
  }

  @Post('/purchase-products')
  @HttpCode(HttpStatus.OK)
  @Roles('user')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async purchaseProducts(
    @CurrentUser() user: UserDto,
    @Body() payload: PurchaseProductsPayload
  ): Promise<DataResponse<any>> {
    const order = await this.orderService.createFromPerformerProducts(payload, user);
    const info = await this.paymentService.purchasePerformerProducts(order, payload.paymentGateway || 'ccbill');
    return DataResponse.ok(info);
  }

  @Post('/purchase-single-photo')
  @HttpCode(HttpStatus.OK)
  @Roles('user')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async purchaseSinglePhoto(
    @CurrentUser() user: UserDto,
    @Body() payload: PurchaseSinglePhotoPayload
  ): Promise<DataResponse<any>> {
    const order = await this.orderService.createFromPerformerSinglePhoto(payload, user);
    const info = await this.paymentService.purchasePerformerSinglePhoto(order, payload.paymentGateway || 'ccbill');
    return DataResponse.ok(info);
  }

  @Post('/purchase-wallet')
  @HttpCode(HttpStatus.OK)
  @Roles('user')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async purchaseToken(
    @CurrentUser() user: UserDto,
    @Body() payload: PurchaseTokenPayload
  ): Promise<DataResponse<any>> {
    const order = await this.orderService.createForWallet(payload, user);
    const info = await this.paymentService.purchaseWalletPackage(order, payload.paymentGateway || 'ccbill');
    return DataResponse.ok(info);
  }

  @Post('/purchase-wallet/custom-amount')
  @HttpCode(HttpStatus.OK)
  @Roles('user')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async purchaseWalletCustomAmount(
    @CurrentUser() user: UserDto,
    @Body() payload: PurchaseTokenCustomAmountPayload
  ): Promise<DataResponse<any>> {
    const minAmount = SettingService.getValueByKey(SETTING_KEYS.MIN_TOPUP_WALLET_AMOUNT);
    const maxAmount = SettingService.getValueByKey(SETTING_KEYS.MAX_TOPUP_WALLET_AMOUNT);

    if (payload.amount <= 0) {
      throw new HttpException('Amount is invalid number', 400);
    } else if (payload.amount > maxAmount) {
      throw new HttpException(`Amount cannot be larger than ${maxAmount}`, 400);
    } else if (payload.amount < minAmount) {
      throw new HttpException(`Amount cannot be less than ${minAmount}`, 400);
    }

    const order = await this.orderService.createForCustomWalletAmount(payload, user);
    const info = await this.paymentService.purchaseWalletPackage(order, payload.paymentGateway || 'ccbill');
    return DataResponse.ok(info);
  }

  @Post('/purchase-feed')
  @HttpCode(HttpStatus.OK)
  @Roles('user')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async purchaseFeed(
    @CurrentUser() user: UserDto,
    @Body() payload: PurchaseFeedPayload
  ): Promise<DataResponse<any>> {
    const order = await this.orderService.createFromPerformerFeed(payload, user);
    const info = await this.paymentService.purchasePerformerFeed(order, payload.paymentGateway || 'ccbill');
    return DataResponse.ok(info);
  }
}
