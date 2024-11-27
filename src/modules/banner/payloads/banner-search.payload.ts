import { IsString, IsOptional } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';

export class BannerSearchRequest extends SearchRequest {
  @IsString()
  @IsOptional()
  status: string;

  @IsString()
  @IsOptional()
  position: string;
}
