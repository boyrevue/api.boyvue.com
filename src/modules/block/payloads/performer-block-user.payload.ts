import {
  IsString, IsNotEmpty, IsOptional, IsMongoId
} from 'class-validator';
import { SearchRequest } from 'src/kernel/common';

export class PerformerBlockUserPayload {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  targetId: string;

  @IsString()
  @IsOptional()
  target: string;

  @IsString()
  @IsOptional()
  reason: string;
}

export class GetBlockListUserPayload extends SearchRequest { }
