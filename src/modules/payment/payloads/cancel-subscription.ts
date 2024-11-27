import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CancelSubscriptionPayload {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  performerId: string;

  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  userId: string;
}
