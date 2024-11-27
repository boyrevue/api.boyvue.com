import {
  IsMongoId, IsNotEmpty, IsOptional, IsString
} from 'class-validator';

export class PurchaseSinglePhotoPayload {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  photoId: string;

  @IsOptional()
  @IsString()
  paymentGateway: string;
}
