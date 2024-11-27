import {
  IsNotEmpty, IsOptional, IsString, Min, IsNumber
} from 'class-validator';

export class PurchaseTokenCustomAmountPayload {
  @IsNotEmpty()
  @IsNumber()
  @Min(2.95)
  amount: number;

  @IsOptional()
  @IsString()
  paymentGateway: string;
}
