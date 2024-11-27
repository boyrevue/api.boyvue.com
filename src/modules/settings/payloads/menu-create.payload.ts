import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsNumber
} from 'class-validator';

export class MenuCreatePayload {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsString()
  @IsOptional()
  section: string;

  @IsBoolean()
  @IsNotEmpty()
  internal: boolean;

  @IsString()
  @IsOptional()
  parentId: string;

  @IsString()
  @IsOptional()
  help: string;

  @IsNumber()
  @IsOptional()
  ordering: number;

  @IsBoolean()
  isNewTab: boolean;
}
