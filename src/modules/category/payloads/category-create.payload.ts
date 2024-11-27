import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  IsNotEmpty,
  MaxLength
} from 'class-validator';

export class CategoryCreatePayload {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  name: string;

  @IsString()
  @IsOptional()
  group: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  slug: string;

  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status: string;

  @IsNumber()
  @IsOptional()
  ordering: number;
}
