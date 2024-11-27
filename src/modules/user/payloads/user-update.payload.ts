import {
  IsString, IsOptional, IsEmail, Validate, IsIn, IsISO31661Alpha2, MaxLength
} from 'class-validator';
import { Username } from '../validators/username.validator';
import { GENDERS } from '../constants';

export class UserUpdatePayload {
  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  @MaxLength(13)
  lastName: string;

  @IsString()
  @IsOptional()
  phone: string;

  @IsString()
  @IsOptional()
  name: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsString()
  @Validate(Username)
  username: string;

  @IsString()
  @IsIn(GENDERS)
  @IsOptional()
  gender: string;

  @IsString()
  @IsOptional()
  @IsISO31661Alpha2()
  country: string;
}
