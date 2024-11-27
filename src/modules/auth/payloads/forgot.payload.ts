import {
  IsString, IsEmail, IsNotEmpty, IsOptional
} from 'class-validator';

export class ForgotPayload {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  type: string;
}
