import { IsString, IsOptional } from 'class-validator';
import { SearchRequest } from 'src/kernel/common';

export class UserSearchRequestPayload extends SearchRequest {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  q: string;

  @IsString()
  @IsOptional()
  role: string;

  @IsString()
  @IsOptional()
  gender: string;

  @IsString()
  @IsOptional()
  status: string;

  @IsString()
  @IsOptional()
  country: string;
}
