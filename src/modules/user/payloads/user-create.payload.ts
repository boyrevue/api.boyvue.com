import {
  IsString,
  IsOptional,
  IsEmail,
  Validate,
  IsIn,
  IsNotEmpty,
  IsBoolean
} from 'class-validator';

import { Username } from '../validators/username.validator';
import { GENDERS } from '../constants';

export class UserCreatePayload {
  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;

  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  phone: string;

  @IsString()
  @IsOptional()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @Validate(Username)
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsIn(GENDERS)
  @IsOptional()
  gender: string;

  @IsString()
  @IsOptional()
  country: string;

  @IsBoolean()
  @IsOptional()
  verifiedEmail: boolean;

  constructor(params: Partial<UserCreatePayload>) {
    if (params) {
      this.verifiedEmail = params.verifiedEmail;
      this.firstName = params.firstName;
      this.lastName = params.lastName;
      this.name = params.name;
      this.email = params.email;
      this.username = params.username;
      this.gender = params.gender;
      this.country = params.country;
    }
  }
}
