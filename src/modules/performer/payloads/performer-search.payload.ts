import { IsString, IsOptional } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';

export class PerformerSearchPayload extends SearchRequest {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  q: string;

  @IsOptional()
  performerIds: string[];

  @IsOptional()
  categoryIds: string[] | string;

  @IsString()
  @IsOptional()
  gender: string;

  @IsString()
  @IsOptional()
  status: string;

  @IsOptional()
  verifiedEmail: boolean;

  @IsString()
  @IsOptional()
  country: string;

  @IsString()
  @IsOptional()
  age: string;

  @IsString()
  @IsOptional()
  sexualPreference: string;

  @IsString()
  @IsOptional()
  eyes: string;

  @IsString()
  @IsOptional()
  hair: string;

  @IsString()
  @IsOptional()
  pubicHair: string;

  @IsString()
  @IsOptional()
  butt: string;

  @IsString()
  @IsOptional()
  height: string;

  @IsString()
  @IsOptional()
  weight: string;

  @IsString()
  @IsOptional()
  ethnicity: string;

  @IsString()
  @IsOptional()
  bodyType: string;

  @IsString()
  @IsOptional()
  type: string;
}
