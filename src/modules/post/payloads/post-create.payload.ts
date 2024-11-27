import {
  IsString,
  IsOptional,
  IsArray,
  IsIn,
  IsNumber
} from 'class-validator';
import { ObjectId } from 'mongodb';

export class PostCreatePayload {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  authorId: ObjectId;

  @IsString()
  type = 'post';

  @IsString()
  @IsOptional()
  slug: string;

  @IsNumber()
  @IsOptional()
  ordering: number;

  @IsString()
  @IsOptional()
  content: string;

  @IsString()
  @IsOptional()
  shortDescription: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds: string[] = [];

  @IsString()
  @IsOptional()
  @IsIn(['draft', 'published'])
  status = 'draft';

  @IsString()
  @IsOptional()
  image: string;

  @IsString()
  @IsOptional()
  metaTitle: string;

  @IsString()
  @IsOptional()
  metaKeywords: string;

  @IsString()
  @IsOptional()
  metaDescription: string;
}
