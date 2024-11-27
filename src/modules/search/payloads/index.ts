import { IsString, IsOptional } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';

export class SearchPayload extends SearchRequest {
  @IsString()
  @IsOptional()
  categoryId: string;

  @IsOptional()
  categoryIds: string[];
}
