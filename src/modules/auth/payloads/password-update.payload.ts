import {
  IsString, MinLength, IsNotEmpty, IsOptional
} from 'class-validator';

export class PasswordChangePayload {
  @IsString()
  @IsOptional()
  source = 'user';

  @IsOptional()
  @IsString()
  type = 'email';

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;
}

export class PasswordUserChangePayload {
  @IsOptional()
  @IsString()
  type = 'email';

  @IsOptional()
  @IsString()
  source: string;

  @IsString()
  userId: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;
}

export class PasswordAdminChangePayload {
  @IsOptional()
  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  userId: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;
}
