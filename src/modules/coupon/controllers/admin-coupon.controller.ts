import {
  Controller,
  Injectable,
  UseGuards,
  Body,
  Post,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Put,
  Param,
  Delete,
  Get,
  Query
} from '@nestjs/common';
import { RoleGuard } from 'src/modules/auth/guards';
import { DataResponse, PageableData } from 'src/kernel';
import { CurrentUser, Roles } from 'src/modules/auth';
import { UserDto } from 'src/modules/user/dtos';
import { CouponService, CouponSearchService } from '../services';
import {
  CouponCreatePayload,
  CouponUpdatePayload,
  CouponSearchRequestPayload
} from '../payloads';
import { CouponDto } from '../dtos';

@Injectable()
@Controller('admin/coupons')
export class AdminCouponController {
  constructor(
    private readonly couponService: CouponService,
    private readonly couponSearchService: CouponSearchService
  ) { }

  @Post('/')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async create(
    @Body() payload: CouponCreatePayload
  ): Promise<DataResponse<CouponDto>> {
    const coupon = await this.couponService.create(payload);
    return DataResponse.ok(coupon);
  }

  @Put('/:id')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async update(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserDto,
    @Body() payload: CouponUpdatePayload
  ): Promise<DataResponse<CouponDto>> {
    const coupon = await this.couponService.update(id, payload);
    return DataResponse.ok(coupon);
  }

  @Delete('/:id')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async delete(@Param('id') id: string): Promise<DataResponse<boolean>> {
    const deleted = await this.couponService.delete(id);
    return DataResponse.ok(deleted);
  }

  @Get('/search')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async search(
    @Query() req: CouponSearchRequestPayload
  ): Promise<DataResponse<PageableData<CouponDto>>> {
    const coupon = await this.couponSearchService.search(req);
    return DataResponse.ok(coupon);
  }

  @Get('/:id/view')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async details(@Param('id') id: string): Promise<DataResponse<CouponDto>> {
    const coupon = await this.couponService.findByIdOrCode(id);
    return DataResponse.ok(coupon);
  }
}
