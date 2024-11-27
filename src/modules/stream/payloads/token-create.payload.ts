import {
  IsString,
  IsIn,
  IsOptional,
  IsNotEmpty,
  IsNumber
} from 'class-validator';

export class TokenCreatePayload {
  @IsString()
  @IsNotEmpty()
  @IsIn(['play', 'publish'])
  type: string;

  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  @IsNotEmpty()
  expireDate: boolean;

  @IsString()
  @IsOptional()
  roomId?: string;
}
