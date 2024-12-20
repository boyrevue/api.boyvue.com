import {
  IsString, IsOptional, ValidateIf, IsNotEmpty
} from 'class-validator';

import { MESSAGE_TYPE } from '../constants';

export class MessageCreatePayload {
  @IsString()
  @IsOptional()
  type = MESSAGE_TYPE.TEXT;

  @ValidateIf((o) => o.type === MESSAGE_TYPE.TEXT)
  @IsNotEmpty()
  @IsString()
  text: string;
}
