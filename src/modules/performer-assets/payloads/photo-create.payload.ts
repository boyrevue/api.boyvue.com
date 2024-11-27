import {
  IsString,
  IsOptional,
  IsIn
} from 'class-validator';

export class PhotoCreatePayload {
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status: string;

  // @IsNumber()
  @IsOptional()
  price: number;

  @IsString()
  @IsOptional()
  performerId: string;

  @IsString()
  @IsOptional()
  galleryId: string;
}
