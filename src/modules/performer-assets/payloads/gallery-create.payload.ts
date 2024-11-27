import {
  IsString,
  IsOptional,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsBoolean
} from 'class-validator';

export class GalleryCreatePayload {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status: string;

  @IsNumber()
  @IsOptional()
  price: number;

  @IsBoolean()
  @IsOptional()
  isSale: boolean;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  performerId: string;
}
