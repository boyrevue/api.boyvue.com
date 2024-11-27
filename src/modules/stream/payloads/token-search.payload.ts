import {
  IsNotEmpty,
  IsNumber,
  Max,
  Min
} from 'class-validator';

export class TokenSearchPayload {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  offset: number;

  @IsNumber()
  @Max(50)
  @IsNotEmpty()
  size: number;
}
