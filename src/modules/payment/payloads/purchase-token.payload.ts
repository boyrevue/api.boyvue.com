import {
  IsMongoId, IsNotEmpty, IsOptional, IsString
} from 'class-validator';

export class PurchaseTokenPayload {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  walletPackageId: string;

  @IsOptional()
  @IsString()
  paymentGateway: string;
}
