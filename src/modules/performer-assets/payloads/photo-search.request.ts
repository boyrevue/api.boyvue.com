import { IsString, IsOptional } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';

export class PhotoSearchRequest extends SearchRequest {
  @IsString()
  @IsOptional()
  performerId: string;

  @IsString()
  @IsOptional()
  galleryId: string;

  @IsString()
  @IsOptional()
  status: string;
}
