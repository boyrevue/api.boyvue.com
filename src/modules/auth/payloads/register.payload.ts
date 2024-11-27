import {
  IsString,
  IsEmail,
  MinLength,
  IsNotEmpty,
  Validate,
  IsIn
} from 'class-validator';
import { Username } from 'src/modules/user/validators/username.validator';
import { GENDERS } from 'src/modules/user/constants';

export class UserRegisterPayload {
  @IsString()
  @IsNotEmpty()
  name: string; // display name

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @IsString()
  @Validate(Username)
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(GENDERS)
  gender: string;

  @IsString()
  @IsNotEmpty()
  country: string;
}
