import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
  IsDefined,
  IsNotEmptyObject,
  IsObject
} from 'class-validator';

export class CCBillPaymentGateway {
  @IsNotEmpty()
  @IsString()
  subscriptionSubAccountNumber: string;

  @IsNotEmpty()
  @IsString()
  singlePurchaseSubAccountNumber: string;

  @IsNotEmpty()
  @IsString()
  flexformId: string;

  @IsOptional()
  @IsString()
  salt?: string;
}

export class PaymentGatewaySettingPayload {
  @IsString()
  @IsOptional()
  performerId: string;

  @IsString()
  @IsOptional()
  key = 'ccbill';

  @IsString()
  @IsOptional()
  status = 'active';

  @IsDefined()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => CCBillPaymentGateway)
  value: CCBillPaymentGateway;
}
