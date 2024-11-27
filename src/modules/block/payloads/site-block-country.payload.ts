import {
  IsString, IsNotEmpty, IsISO31661Alpha2
} from 'class-validator';

export class BlockCountryCreatePayload {
  @IsString()
  @IsNotEmpty()
  @IsISO31661Alpha2()
  countryCode: string;
}
