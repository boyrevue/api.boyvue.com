import { IsString, IsOptional } from 'class-validator';

export class SettingUpdatePayload {
  @IsOptional()
  value: any;

  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  description: string;
}
