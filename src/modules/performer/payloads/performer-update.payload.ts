import {
  IsString,
  IsOptional,
  Validate,
  IsEmail,
  IsNotEmpty,
  IsIn,
  IsArray,
  MinLength,
  Min,
  IsNumber
} from 'class-validator';
import { Username } from 'src/modules/user/validators/username.validator';
import { GENDERS } from 'src/modules/user/constants';

import { PERFORMER_STATUSES } from '../constants';

export class PerformerUpdatePayload {
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
  @IsOptional()
  username: string;

  @IsString()
  // @IsNotEmpty()
  @MinLength(6)
  @IsOptional()
  password: string;

  @IsString()
  @IsIn([PERFORMER_STATUSES.ACTIVE, PERFORMER_STATUSES.INACTIVE])
  @IsOptional()
  status = PERFORMER_STATUSES.ACTIVE;

  @IsEmail()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  phone: string;

  @IsString()
  @IsOptional()
  phoneCode: string; // international code prefix

  @IsString()
  @IsOptional()
  avatarId: string;

  @IsString()
  @IsOptional()
  coverId?: string;

  @IsString()
  @IsOptional()
  idVerificationId: string;

  @IsString()
  @IsOptional()
  documentVerificationId: string;

  @IsString()
  @IsIn(GENDERS)
  @IsOptional()
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

  @IsOptional()
  bankingInfomation?: any;

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

export class SelfUpdatePayload {
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
  // @IsNotEmpty()
  @MinLength(6)
  @IsOptional()
  password: string;

  @IsString()
  @IsOptional()
  phone: string;

  @IsString()
  @IsOptional()
  phoneCode: string; // international code prefix

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

  @IsOptional()
  bankingInfomation?: any;

  @IsOptional()
  activateWelcomeVideo?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  privateChatPrice?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  groupChatPrice?: boolean;

  @IsString()
  @IsOptional()
  idVerificationId: string;

  @IsString()
  @IsOptional()
  documentVerificationId: string;

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
