import { IsIn, IsOptional, IsString } from 'class-validator';
import { SearchRequest } from 'src/kernel';
import { WalletPackageStatus } from '../contants';

export class WalletPackageSearchRequest extends SearchRequest {
  @IsOptional()
  @IsString()
  @IsIn([WalletPackageStatus.Active, WalletPackageStatus.Inactive])
  status: string;
}
