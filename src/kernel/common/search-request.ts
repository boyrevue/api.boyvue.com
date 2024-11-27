import {
  IsString, IsOptional, IsInt
} from 'class-validator';
import { Optional } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { SortOrder } from 'mongoose';

export class SearchRequest {
  @IsOptional()
  @IsString()
  q = '';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Transform(({ value }) => {
    const val = parseInt(value, 10);
    if (!val || val > 100) return 10;
    return val;
  })
  limit: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Transform(({ value }) => {
    if (!value || value < 0) return 0;
    return value;
  })
  offset: number = 0;

  @Optional()
  @IsString()
  sortBy = 'updatedAt';

  @Optional()
  @IsString()
  @Transform(({ value }) => {
    if (value !== 'asc') return 'desc';
    return 'asc';
  })
  sort: SortOrder = 'desc';
}
