import {
  IsMongoId, IsNotEmpty, IsOptional, IsString
} from 'class-validator';

export class PurchaseVideoPayload {
  @IsOptional()
  @IsString()
  couponCode: string;

  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  videoId: string;

  @IsOptional()
  @IsString()
  paymentGateway: string;
}
