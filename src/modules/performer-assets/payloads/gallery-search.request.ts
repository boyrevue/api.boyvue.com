import { IsString, IsOptional } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';

import { ObjectId } from 'mongodb';

export class GallerySearchRequest extends SearchRequest {
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
  ids?: string[] | ObjectId[];
}
