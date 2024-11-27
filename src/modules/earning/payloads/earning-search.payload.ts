import { SearchRequest } from 'src/kernel/common';
import { ObjectId } from 'mongodb';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsBooleanString,
  IsMongoId
} from 'class-validator';
import { IsValidDateString } from 'src/modules/utils/decorators/is-valid-date-string';

export class EarningSearchRequest extends SearchRequest {
  @IsString()
  @IsOptional()
  @IsMongoId()
  userId: string | ObjectId;

  @IsString()
  @IsOptional()
  @IsMongoId()
  performerId: string | ObjectId;

  @IsString()
  @IsOptional()
  @IsMongoId()
  transactionId: string | ObjectId;

  @IsString()
  @IsOptional()
  sourceType: string;

  @IsString()
  @IsOptional()
  type: string;

  @IsString()
  @IsOptional()
  payoutStatus: string;

  @IsString()
  @IsOptional()
  fromDate: string | Date;

  @IsString()
  @IsOptional()
  toDate: Date;

  @IsString()
  @IsOptional()
  paidAt: Date;

  @IsBooleanString()
  @IsOptional()
  isPaid: boolean;

  @IsString()
  @IsOptional()
  paymentStatus: string;

  @IsString()
  @IsOptional()
  userUsername: string;

  @IsString()
  @IsOptional()
  performerUsername: string;
}

export class UpdateEarningStatusPayload {
  @IsString()
  @IsOptional()
  @IsMongoId()
  performerId?: string;

  @IsString()
  @IsNotEmpty()
  @IsValidDateString()
  fromDate?: string | Date;

  @IsString()
  @IsNotEmpty()
  @IsValidDateString()
  toDate?: string | Date;

  @IsString()
  @IsOptional()
  payoutStatus?: string;

  @IsString()
  @IsOptional()
  paymentStatus?: string;
}
