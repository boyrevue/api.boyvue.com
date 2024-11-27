import { IsString, IsMongoId, IsOptional } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';

export class MessageListRequest extends SearchRequest {
  @IsString()
  @IsMongoId()
  @IsOptional()
  conversationId: string;
}
