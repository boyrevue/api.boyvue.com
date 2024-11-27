import {
  IsString, IsOptional, IsBoolean, IsNumber, IsNotEmpty, IsMongoId,
  ValidateIf
} from 'class-validator';
import { IsValidDateString } from 'src/modules/utils/decorators/is-valid-date-string';

export class FeedCreatePayload {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  @IsMongoId()
  fromSourceId: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsOptional()
  tagline: string;

  @IsOptional()
  @IsString({ each: true })
  @IsMongoId({ each: true })
  fileIds: string[];

  @IsOptional()
  @IsMongoId()
  @ValidateIf((o) => !!o.thumbnailId)
  thumbnailId: string;

  @IsOptional()
  @IsMongoId()
  @ValidateIf((o) => !!o.teaserId)
  teaserId: string;

  @IsOptional()
  @IsString({ each: true })
  @IsMongoId({ each: true })
  pollIds: string[];

  @IsOptional()
  @IsValidDateString()
  pollExpiredAt: Date;

  @IsBoolean()
  @IsOptional()
  isSale: boolean;

  @IsNumber()
  @IsOptional()
  price: number;

  @IsString()
  @IsOptional()
  status: string;
}
