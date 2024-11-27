import { SearchRequest } from 'src/kernel/common';
import {
  IsString, IsOptional, IsNotEmpty, IsIn, IsMongoId
} from 'class-validator';
import { REPORT_TARGET } from '../constants';

export class ReportSearchRequestPayload extends SearchRequest {
  @IsOptional()
  @IsString()
  @IsMongoId()
  targetId: string;

  @IsOptional()
  @IsString()
  target: string;

  @IsOptional()
  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  @IsMongoId()
  sourceId: string;

  @IsOptional()
  @IsString()
  @IsMongoId()
  performerId: string;
}

export class ReportCreatePayload {
  @IsString()
  @IsOptional()
  @IsIn([
    REPORT_TARGET.GALLERY,
    REPORT_TARGET.VIDEO,
    REPORT_TARGET.PERFORMER,
    REPORT_TARGET.PRODUCT,
    REPORT_TARGET.FEED
  ])
  target = REPORT_TARGET.VIDEO;

  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  targetId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsOptional()
  @IsString()
  @IsMongoId()
  performerId: string;
}
