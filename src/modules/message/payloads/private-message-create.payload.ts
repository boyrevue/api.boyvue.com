import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

import { ObjectId } from 'mongodb';
import { MessageCreatePayload } from './message-create.payload';

export class PrivateMessageCreatePayload extends MessageCreatePayload {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  recipientId: string | ObjectId;

  @IsNotEmpty()
  @IsString()
  recipientType: string;
}
