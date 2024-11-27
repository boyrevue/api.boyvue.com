import {
  Controller,
  Injectable,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Post,
  Body,
  Query,
  Response,
  Get
} from '@nestjs/common';
import { DataResponse, ForbiddenException } from 'src/kernel';
import { IpAddress } from 'src/modules/utils/decorators';
import { isValidCCBillIP } from 'src/modules/utils/services/utils.service';
import { PaymentService } from '../services/payment.service';
import { EmerchantpayService } from '../services/emerchantpay.service';

@Injectable()
@Controller('payment')
export class PaymentWebhookController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly emerchantService: EmerchantpayService
  ) { }

  @Post(['/ccbill/callhook', '/ccbill/webhook', '/ccbill/postback'])
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async ccbillCallhook(
    @Body() payload: Record<string, string>,
    @Query() req: Record<string, string>,
    @IpAddress() ipAddress: string
  ): Promise<DataResponse<any>> {
    // check whitelist IP of ccbill in production env
    if (process.env.NODE_ENV === 'production' && !isValidCCBillIP(ipAddress)) {
      throw new ForbiddenException('Invalid request IP!');
    }

    if (!['NewSaleSuccess', 'RenewalSuccess'].includes(req.eventType)) {
      return DataResponse.ok(false);
    }

    let info;
    const data = {
      ...payload,
      ...req
    };
    switch (req.eventType) {
      case 'RenewalSuccess':
        info = await this.paymentService.ccbillRenewalSuccessWebhook(data);
        break;
      default:
        info = await this.paymentService.ccbillSinglePaymentSuccessWebhook(
          data
        );
        break;
    }
    return DataResponse.ok(info);
  }

  @Post(['/verotel/callhook', '/verotel/webhook', '/verotel/postback'])
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async verotelCallhook(
    @Query() query: Record<string, string>,
    @Response() res: any
  ): Promise<any> {
    await this.paymentService.verotelSuccessWebhook(query);

    res.setHeader('content-type', 'text/plain');
    res.send('OK');
  }

  @Get(['/verotel/callhook', '/verotel/webhook', '/verotel/postback'])
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async verotelCallhookGet(
    @Query() query: Record<string, string>,
    @Response() res: any
  ): Promise<any> {
    await this.paymentService.verotelSuccessWebhook(query);

    res.setHeader('content-type', 'text/plain');
    res.send('OK');
  }

  @Post(['/emerchantpay/callhook'])
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async emerchantPaycallhook(
    @Body() query: Record<string, string>,
    @Response() res: any
  ): Promise<any> {
    await this.emerchantService.callback(query);

    res.setHeader('content-type', 'text/plain');
    res.send('OK');
  }
}
