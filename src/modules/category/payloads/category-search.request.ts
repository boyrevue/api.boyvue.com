import { IsString, IsOptional, IsIn } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';

export class CategorySearchRequest extends SearchRequest {
  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status: string;

  @IsString()
  @IsOptional()
  group: string;

  @IsString()
  @IsOptional()
  slug: string;

  @IsOptional()
  includedIds: string[];
}
