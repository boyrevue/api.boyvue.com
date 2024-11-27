import {
  IsIn,
  IsNotEmpty, IsNumber, IsOptional, IsString
} from 'class-validator';
import { WalletPackageStatus } from '../contants';

export class WalletPackageCreatePayload {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  desscription: string;

  @IsOptional()
  @IsNumber()
  ordering: number;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  token: number;

  @IsNotEmpty()
  @IsString()
  @IsIn([WalletPackageStatus.Active, WalletPackageStatus.Inactive])
  status: string;

  @IsOptional()
  @IsString()
  url: string;
}
