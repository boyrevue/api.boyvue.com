import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsIn,
  IsMongoId
} from 'class-validator';

import { SearchRequest } from 'src/kernel/common';
import { ObjectId } from 'mongodb';
import { STATUSES } from '../constants';

export class PayoutRequestCreatePayload {
  @IsNotEmpty()
  fromDate: Date;

  @IsNotEmpty()
  toDate: Date;

  @IsString()
  @IsOptional()
  requestNote: string;

  @IsOptional()
  @IsString()
  paymentAccountType: string;
}

export class PayoutRequestPerformerUpdatePayload {
  @IsString()
  @IsOptional()
  requestNote: string;

  @IsNotEmpty()
  fromDate: Date;

  @IsNotEmpty()
  toDate: Date;

  @IsOptional()
  @IsString()
  paymentAccountType: string;
}

export class PayoutRequestUpdatePayload {
  @IsNotEmpty()
  @IsString()
  @IsIn([STATUSES.PENDING, STATUSES.REJECTED, STATUSES.DONE])
  status: string;

  @IsOptional()
  adminNote: string;
}

export class PayoutRequestSearchPayload extends SearchRequest {
  @IsOptional()
  @IsString()
  @IsMongoId()
  sourceId: ObjectId;

  @IsOptional()
  @IsString()
  paymentAccountType?: string;

  @IsOptional()
  fromDate: Date;

  @IsOptional()
  toDate: Date;

  @IsOptional()
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  source: string;
}
