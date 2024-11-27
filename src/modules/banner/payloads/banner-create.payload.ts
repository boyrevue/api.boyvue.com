import { IsString, IsOptional, IsIn } from 'class-validator';
import { BANNER_POSITION } from '../constants';

export class BannerCreatePayload {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  link: string;

  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status: string;

  @IsString()
  @IsOptional()
  @IsIn(BANNER_POSITION)
  position: string;
}
