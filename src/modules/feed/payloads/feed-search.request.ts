import { IsString, IsOptional, IsMongoId } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';
import { ObjectId } from 'mongodb';

export class FeedSearchRequest extends SearchRequest {
  @IsString()
  @IsOptional()
  q: string;

  @IsString()
  @IsOptional()
  @IsMongoId()
  performerId: string;

  @IsString()
  @IsOptional()
  type: string;

  @IsString()
  @IsOptional()
  orientation: string;

  @IsOptional()
  @IsString()
  fromDate: string;

  @IsOptional()
  @IsString()
  toDate: string;

  ids?: string[] | ObjectId[];
}
