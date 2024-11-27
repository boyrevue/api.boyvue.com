import {
  IsString, IsOptional, IsEmail, IsArray, IsIn, IsNumber, IsBoolean
} from 'class-validator';
import {
  STATUSES, ROLE_ADMIN, ROLE_USER, GENDERS
} from '../constants';

export class UserAuthUpdatePayload {
  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;

  @IsString()
  @IsOptional()
  phone: string;

  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  username: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  password: string;

  @IsArray()
  @IsOptional()
  @IsIn([ROLE_ADMIN, ROLE_USER], { each: true })
  roles: string[];

  @IsString()
  @IsOptional()
  @IsIn(STATUSES)
  status: string;

  @IsOptional()
  @IsNumber()
  balance: number;

  @IsString()
  @IsOptional()
  @IsIn(GENDERS)
  gender: string;

  @IsString()
  @IsOptional()
  country: string;

  @IsBoolean()
  @IsOptional()
  verifiedEmail: boolean;
}
