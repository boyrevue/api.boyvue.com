import { IsIn, IsOptional, IsString } from 'class-validator';
import { SearchRequest } from 'src/kernel';

export class SearchNotificationPayload extends SearchRequest {
  @IsOptional()
  @IsString()
  @IsIn(['all', 'read'])
  status: string;

  @IsOptional()
  @IsString()
  type: string;
}
