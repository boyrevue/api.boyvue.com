import { IsString, IsOptional } from 'class-validator';

import { SearchRequest } from 'src/kernel/common';

export class ConversationSearchPayload extends SearchRequest {
  @IsOptional()
  @IsString()
  keyword: string;

  @IsOptional()
  @IsString()
  type: string;
}
