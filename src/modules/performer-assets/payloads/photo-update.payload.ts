import {
  IsString,
  IsOptional,
  IsIn
} from 'class-validator';

export class PhotoUpdatePayload {
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  @IsIn(['draft', 'active', 'inactive'])
  status: string;

  @IsOptional()
  isSale: boolean;

  @IsOptional()
  price: number;

  @IsString()
  @IsOptional()
  galleryId: string;
}
