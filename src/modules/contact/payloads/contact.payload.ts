import {
  IsString, IsNotEmpty, MinLength, MaxLength
} from 'class-validator';

export class ContactPayload {
  @IsString()
  @IsNotEmpty()
  name: any;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(10000)
  message: string;
}
