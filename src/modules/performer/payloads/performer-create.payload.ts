import {
  IsString,
  IsOptional,
  Validate,
  IsEmail,
  IsNotEmpty,
  IsIn,
  IsArray,
  MinLength,
  IsNumber,
  Min,
  IsBoolean
} from 'class-validator';
import { Username } from 'src/modules/user/validators/username.validator';
import { GENDERS } from 'src/modules/user/constants';

import { ObjectId } from 'mongodb';
import { PERFORMER_STATUSES } from '../constants';

export class PerformerCreatePayload {
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
  password: string;

  @IsString()
  @IsIn([
    PERFORMER_STATUSES.ACTIVE,
    PERFORMER_STATUSES.INACTIVE,
    PERFORMER_STATUSES.PENDING
  ])
  @IsOptional()
  status = PERFORMER_STATUSES.ACTIVE;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsBoolean()
  @IsOptional()
  verifiedEmail: boolean;

  @IsBoolean()
  @IsOptional()
  verifiedAccount: boolean;

  @IsBoolean()
  @IsOptional()
  verifiedDocument: boolean;

  @IsString()
  @IsOptional()
  phone: string;

  @IsString()
  @IsOptional()
  phoneCode: string; // international code prefix

  @IsString()
  @IsOptional()
  avatarId: ObjectId;

  @IsString()
  @IsOptional()
  coverId: ObjectId;

  @IsString()
  @IsOptional()
  idVerificationId: ObjectId;

  @IsString()
  @IsOptional()
  documentVerificationId: ObjectId;

  @IsString()
  @IsNotEmpty()
  @IsIn(GENDERS)
  gender: string;

  @IsString()
  @IsOptional()
  country: string;

  @IsString()
  @IsOptional()
  city: string;

  @IsString()
  @IsOptional()
  state: string;

  @IsString()
  @IsOptional()
  zipcode: string;

  @IsString()
  @IsOptional()
  address: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds: string[];

  @IsString()
  @IsOptional()
  height: string;

  @IsString()
  @IsOptional()
  weight: string;

  @IsString()
  @IsOptional()
  bio: string;

  @IsString()
  @IsOptional()
  eyes: string;

  @IsString()
  @IsOptional()
  sexualPreference: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  monthlyPrice: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  yearlyPrice: number;

  @IsString()
  @IsOptional()
  dateOfBirth: string;

  @IsString()
  @IsOptional()
  ethnicity: string;

  @IsString()
  @IsOptional()
  bodyType: string;

  @IsString()
  @IsOptional()
  hair: string;

  @IsString()
  @IsOptional()
  butt: string;

  @IsString()
  @IsOptional()
  pubicHair: string;
}

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
  password: string;

  @IsString()
  @IsIn([
    PERFORMER_STATUSES.ACTIVE,
    PERFORMER_STATUSES.INACTIVE,
    PERFORMER_STATUSES.PENDING
  ])
  @IsOptional()
  status = PERFORMER_STATUSES.ACTIVE;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone: string;

  @IsString()
  @IsOptional()
  phoneCode: string; // international code prefix

  @IsString()
  @IsOptional()
  avatarId: ObjectId;

  @IsString()
  @IsOptional()
  idVerificationId: ObjectId;

  @IsString()
  @IsOptional()
  documentVerificationId: ObjectId;

  @IsString()
  @IsNotEmpty()
  @IsIn(GENDERS)
  gender: string;

  @IsString()
  @IsOptional()
  dateOfBirth: string;
}
