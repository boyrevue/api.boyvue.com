import { ObjectId } from 'mongodb';
import {
  IsOptional, IsArray, IsNotEmpty, IsMongoId, IsString, IsISO31661Alpha2
} from 'class-validator';

export class PerformerBlockCountriesPayload {
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  @IsISO31661Alpha2({ each: true })
  countryCodes: string[];

  @IsArray()
  @IsOptional()
  @IsMongoId()
  performerId: string | ObjectId;
}
