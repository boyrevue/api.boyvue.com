import {
  IsString,
  IsOptional,
  Validate,
  IsEmail,
  IsNotEmpty,
  IsIn,
  MinLength,
  MaxLength
} from 'class-validator';
import { Username } from 'src/modules/user/validators/username.validator';
import { GENDERS } from 'src/modules/user/constants';
import { IsValidDateString } from 'src/modules/utils/decorators/is-valid-date-string';

export class PerformerRegisterPayload {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;

  @IsString()
  @IsOptional()
  @Validate(Username)
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(GENDERS)
  gender: string;

  @IsString()
  @IsOptional()
  country: string;

  @IsString()
  @IsNotEmpty()
  @IsValidDateString()
  dateOfBirth: Date;
}
