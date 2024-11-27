import {
  Injectable,
  NotFoundException,
  ConflictException,
  NotAcceptableException,
  forwardRef,
  Inject
} from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { StringHelper } from 'src/kernel';
import * as moment from 'moment';
import { ORDER_STATUS } from 'src/modules/payment/constants';
import { STATUS } from 'src/kernel/constants';
import { InjectModel } from '@nestjs/mongoose';
import { OrderService } from 'src/modules/payment/services';
import { CouponCreatePayload, CouponUpdatePayload } from '../payloads';
import { CouponDto } from '../dtos';
import { Coupon } from '../schemas';

@Injectable()
export class CouponService {
  constructor(
    @InjectModel(Coupon.name) private readonly CouponModel: Model<Coupon>,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService
  ) { }

  public async findByIdOrCode(id: string | ObjectId): Promise<CouponDto> {
    const query = id instanceof ObjectId || StringHelper.isObjectId(id)
      ? { _id: id }
      : { code: id };
    const coupon = await this.CouponModel.findOne(query);
    if (!coupon) return null;
    return CouponDto.fromModel(coupon);
  }

  public async checkExistingCode(code: string, id?: string | ObjectId) {
    const query: Record<string, any> = { code };
    if (id) query._id = { $ne: id };

    const count = await this.CouponModel.countDocuments(query);
    return count > 0;
  }

  public async create(payload: CouponCreatePayload): Promise<CouponDto> {
    const data = {
      ...payload,
      expiredDate: new Date(payload.expiredDate),
      updatedAt: new Date(),
      createdAt: new Date()
    };
    const existedCode = await this.checkExistingCode(payload.code);
    if (existedCode) {
      throw new ConflictException('Code is duplicated');
    }
    const coupon = await this.CouponModel.create(data);
    return CouponDto.fromModel(coupon);
  }

  public async update(id: string | ObjectId, payload: CouponUpdatePayload): Promise<CouponDto> {
    const coupon = await this.findByIdOrCode(id);
    if (!coupon) {
      throw new NotFoundException();
    }
    const existedCode = await this.checkExistingCode(payload.code, id);
    if (existedCode) {
      throw new ConflictException('Code is duplicated');
    }

    const data: Record<string, any> = {
      ...payload,
      expiredDate: new Date(payload.expiredDate),
      updatedAt: new Date()
    };
    await this.CouponModel.updateOne({ _id: id }, data);
    return this.findByIdOrCode(coupon._id);
  }

  public async delete(id: string | ObjectId): Promise<boolean> {
    const coupon = await this.findByIdOrCode(id);
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    await this.CouponModel.deleteOne({ _id: id });
    return true;
  }

  public async applyCoupon(code: string, userId: string | ObjectId): Promise<CouponDto> {
    const coupon = await this.findByIdOrCode(code);
    if (!coupon || coupon.status === STATUS.INACTIVE) {
      throw new NotFoundException('Coupon not found');
    }
    if (moment().isAfter(coupon.expiredDate)) {
      throw new NotAcceptableException('Coupon is expired');
    }
    if (coupon.numberOfUses <= 0) {
      throw new NotAcceptableException('Coupon is reached limitation number of uses');
    }
    const usedCoupon = await this.checkUsedCoupon(code, userId);
    if (usedCoupon) {
      throw new NotAcceptableException('You used this coupon');
    }
    return coupon;
  }

  public async checkUsedCoupon(code: string, userId: string | ObjectId): Promise<boolean> {
    const count = await this.orderService.countOrderByQuery({
      'couponInfo.code': code,
      buyerId: userId,
      status: ORDER_STATUS.PAID
    });
    return count > 0;
  }

  public async updateNumberOfUses(couponId: string | ObjectId) {
    const coupon = await this.CouponModel.findById(couponId);
    if (!coupon) return;
    if (coupon.numberOfUses === 1) {
      coupon.status = STATUS.INACTIVE;
    }
    if (coupon.numberOfUses > 0) {
      coupon.numberOfUses -= 1;
    }
    await coupon.save();
  }
}
