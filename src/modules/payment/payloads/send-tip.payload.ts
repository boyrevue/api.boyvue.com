import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsMongoId,
  IsPositive
} from 'class-validator';

export class SendTipsPayload {
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;

  @IsOptional()
  @IsString()
  @IsMongoId()
  conversationId: string;
}
