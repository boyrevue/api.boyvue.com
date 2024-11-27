import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class ConversationCreatePayload {
  @IsNotEmpty()
  @IsString()
  type = 'private';

  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['user', 'performer'])
  source: string;
}
