import {
  IsMongoId, IsNotEmpty, IsOptional, IsString
} from 'class-validator';
import { ObjectId } from 'mongodb';

export class AuthPayload {
  @IsString()
  @IsOptional()
  source = 'user';

  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  sourceId: string | ObjectId;

  @IsString()
  @IsOptional()
  type? = 'password';

  @IsString()
  @IsOptional()
  key?: string;

  @IsString()
  @IsOptional()
  value?: string;
}
