import {
  IsNotEmpty, IsIn, IsOptional, IsString, IsMongoId
} from 'class-validator';

export class SubscribePerformerPayload {
  @IsNotEmpty()
  @IsMongoId()
  @IsString()
  performerId: string;

  @IsNotEmpty()
  @IsIn(['monthly', 'yearly'])
  type: string;

  @IsOptional()
  @IsString()
  paymentGateway: string;
}
