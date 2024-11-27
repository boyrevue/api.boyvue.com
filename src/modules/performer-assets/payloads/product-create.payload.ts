import {
  IsString,
  IsOptional,
  IsIn,
  IsNotEmpty
} from 'class-validator';

import { ObjectId } from 'mongodb';
import { PRODUCT_STATUS, PRODUCT_TYPE } from '../constants';

export class ProductCreatePayload {
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  @IsIn([PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.INACTIVE])
  status: string;

  @IsString()
  @IsOptional()
  @IsIn([PRODUCT_TYPE.DIGITAL, PRODUCT_TYPE.PHYSICAL])
  type: string;

  @IsOptional()
  price: number;

  @IsOptional()
  stock: number;

  @IsString()
  @IsOptional()
  performerId: ObjectId;

  @IsOptional()
  categoryIds: ObjectId[];

  @IsOptional()
  imageIds: ObjectId[];
}
