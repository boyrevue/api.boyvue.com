import {
  IsString, IsOptional, IsArray, IsBoolean, IsMongoId
} from 'class-validator';
import { ObjectId } from 'mongodb';
import { SearchRequest } from 'src/kernel/common';

export class OrderSearchPayload extends SearchRequest {
  @IsString()
  @IsOptional()
  @IsMongoId()
  userId: string | ObjectId;

  @IsString()
  @IsOptional()
  @IsMongoId()
  buyerId: string | ObjectId;

  @IsString()
  @IsOptional()
  @IsMongoId()
  sellerId: string | ObjectId;

  @IsString()
  @IsOptional()
  deliveryStatus: string;

  @IsString()
  @IsOptional()
  paymentStatus: string;

  @IsString()
  @IsOptional()
  paymentGateway: string;

  @IsString()
  @IsOptional()
  status: string;

  @IsOptional()
  fromDate: Date;

  @IsOptional()
  toDate: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productTypes: string[];

  @IsOptional()
  @IsString()
  productType: string;

  @IsOptional()
  @IsBoolean()
  withoutWallet: boolean;

  @IsOptional()
  @IsString()
  includingCreated: string;
}

export class OrderUpdatePayload {
  @IsString()
  @IsOptional()
  deliveryStatus: string;

  @IsOptional()
  shippingCode: string;
}
