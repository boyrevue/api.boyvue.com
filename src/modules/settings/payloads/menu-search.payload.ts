import { SearchRequest } from 'src/kernel/common';
import {
  IsString, IsOptional, IsIn, IsBooleanString
} from 'class-validator';

import { MENU_SECTION } from '../constants';

export class MenuSearchRequestPayload extends SearchRequest {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBooleanString()
  public?: boolean;

  @IsOptional()
  @IsBooleanString()
  internal?: boolean;

  @IsString()
  @IsIn([MENU_SECTION.MAIN, MENU_SECTION.HEADER, MENU_SECTION.FOOTER])
  @IsOptional()
  section: string;
}
