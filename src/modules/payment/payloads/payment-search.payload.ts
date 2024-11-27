import { IsString, IsOptional, IsMongoId } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';

export class PaymentSearchPayload extends SearchRequest {
  @IsString()
  @IsOptional()
  source: string;

  @IsString()
  @IsOptional()
  @IsMongoId()
  sourceId: string;

  @IsString()
  @IsOptional()
  @IsMongoId()
  targetId: string;

  @IsString()
  @IsOptional()
  @IsMongoId()
  performerId: string;

  @IsOptional()
  @IsMongoId({ each: true })
  performerIds: string[];

  @IsString()
  @IsOptional()
  status: string;

  @IsString()
  @IsOptional()
  type: string;

  @IsString()
  @IsOptional()
  target: string;

  @IsString()
  @IsOptional()
  paymentGateway: string;

  @IsOptional()
  fromDate: Date;

  @IsOptional()
  toDate: Date;
}
