import {
  IsString, IsOptional, IsIn, IsNotEmpty, IsMongoId, IsNumber
} from 'class-validator';
import { ObjectId } from 'mongodb';

export class VideoUpdatePayload {
  @IsOptional()
  @IsString()
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
  tags: string[];

  @IsOptional()
  isSchedule: boolean;

  @IsString()
  @IsOptional()
  scheduledAt: Date;

  @IsOptional()
  isSaleVideo: boolean;

  @IsOptional()
  @IsNumber()
  price: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @IsMongoId()
  performerId: string;

  @IsOptional()
  participantIds: string[] | ObjectId[];
}
