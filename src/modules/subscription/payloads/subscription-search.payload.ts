import { SearchRequest } from 'src/kernel/common';
import { ObjectId } from 'mongodb';
import { IsOptional, IsString } from 'class-validator';

export class SubscriptionSearchRequestPayload extends SearchRequest {
  @IsString()
  @IsOptional()
  userId?: string | ObjectId;

  @IsString()
  @IsOptional()
  performerId?: string | ObjectId;

  @IsString()
  @IsOptional()
  transactionId?: string | ObjectId;

  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @IsString()
  @IsOptional()
  subscriptionType?: string;

  @IsString()
  @IsOptional()
  paymentGateway?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  createdAt?: Date;

  @IsString()
  @IsOptional()
  expiredAt?: Date;
}
