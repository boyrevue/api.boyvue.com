import { SearchRequest } from 'src/kernel/common';
import {
  IsString, IsOptional, IsMongoId
} from 'class-validator';

export class CommentSearchRequestPayload extends SearchRequest {
  @IsString()
  @IsOptional()
  @IsMongoId()
  objectId?: string;

  @IsString()
  @IsOptional()
  objectType?: string;
}
