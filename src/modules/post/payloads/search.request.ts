import { SearchRequest } from 'src/kernel';

import { IsOptional } from 'class-validator';

export class AdminSearch extends SearchRequest {
  @IsOptional()
  status?: string;

  @IsOptional()
  type = 'post';
}

export class UserSearch extends SearchRequest {
  @IsOptional()
  type = 'post';
}
