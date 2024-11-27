import { IsString, IsOptional } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';

export class ProductSearchRequest extends SearchRequest {
  @IsString()
  @IsOptional()
  performerId: string;

  @IsString()
  @IsOptional()
  status: string;

  @IsString()
  @IsOptional()
  type: string;

  @IsString()
  @IsOptional()
  excludedId: string;

  @IsOptional()
  includedIds: string[];

  @IsOptional()
  categoryId: string;
}
