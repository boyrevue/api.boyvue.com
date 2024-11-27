import { IsString, IsOptional } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';

import { ObjectId } from 'mongodb';

export class VideoSearchRequest extends SearchRequest {
  @IsString()
  @IsOptional()
  performerId: string;

  @IsString()
  @IsOptional()
  excludedId: string;

  @IsString()
  @IsOptional()
  status: string;

  @IsOptional()
  isSaleVideo: any;

  @IsOptional()
  ids?: string[] | ObjectId[];
}
