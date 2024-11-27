import {
  IsString,
  IsNotEmpty
} from 'class-validator';

export class EmailTemplateUpdatePayload {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  layout: string;
}
