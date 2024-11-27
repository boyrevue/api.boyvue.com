import { IsOptional, IsString } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';

export class CouponSearchRequestPayload extends SearchRequest {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  code: string;

  @IsString()
  @IsOptional()
  status: string;
}
