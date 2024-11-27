import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class PurchaseFeedPayload {
  @IsOptional()
  @IsString()
  couponCode: string;

  @IsOptional()
  @IsString()
  @IsMongoId()
  feedId: string;

  @IsOptional()
  @IsString()
  paymentGateway: string;
}
