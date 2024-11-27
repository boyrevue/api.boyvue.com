import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsIn
} from 'class-validator';
import { COUPON_STATUS } from '../constants';

export class CouponCreatePayload {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  value: number;

  @IsString()
  @IsNotEmpty()
  expiredDate: string | Date;

  @IsString()
  @IsIn([COUPON_STATUS.ACTIVE, COUPON_STATUS.INACTIVE])
  @IsOptional()
  status = COUPON_STATUS.ACTIVE;

  @IsNumber()
  @IsNotEmpty()
  numberOfUses: number;
}
