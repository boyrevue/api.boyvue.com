import {
  Controller,
  Injectable,
  UseGuards,
  Post,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Param
} from '@nestjs/common';
import { AuthGuard } from 'src/modules/auth/guards';
import { DataResponse } from 'src/kernel';
import { CurrentUser } from 'src/modules/auth';
import { UserDto } from 'src/modules/user/dtos';
import { CouponService } from '../services';
import { CouponDto } from '../dtos';

@Injectable()
@Controller('coupons')
export class CouponController {
  constructor(
    private readonly couponService: CouponService
  ) { }

  @Post('/:code/apply-coupon')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async checkApplyCoupon(
    @Param('code') code: string,
    @CurrentUser() currentUser: UserDto
  ): Promise<DataResponse<Partial<CouponDto>>> {
    const canApply = await this.couponService.applyCoupon(
      code,
      currentUser._id
    );
    return DataResponse.ok(canApply.toResponse(false));
  }
}
