import {
  IsString, IsOptional, IsIn, IsNotEmpty
} from 'class-validator';

export class VideoCreatePayload {
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  tagline: string;

  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status: string;

  @IsOptional()
  isSale: boolean;

  @IsOptional()
  isSchedule: boolean;

  @IsString()
  @IsOptional()
  scheduledAt: string;

  @IsOptional()
  tags: string[];

  @IsOptional()
  price: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  performerId: string;

  @IsOptional()
  participantIds: string[];
}
