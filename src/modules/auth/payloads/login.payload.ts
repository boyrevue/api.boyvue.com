import {
  IsString, MinLength, IsNotEmpty, IsBoolean, IsOptional, MaxLength
} from 'class-validator';

export class LoginPayload {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(6, { message: 'Please recheck the password entered' })
  @MaxLength(100)
  @IsNotEmpty()
  password: string;

  @IsBoolean()
  @IsOptional()
  remember: boolean;
}
