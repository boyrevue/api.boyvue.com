import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsMongoId,
  IsPositive
} from 'class-validator';

export class TipFeedPayload {
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;

  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  feedId: string;

  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  performerId: string;
}
