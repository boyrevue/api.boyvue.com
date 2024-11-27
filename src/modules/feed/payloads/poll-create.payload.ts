import {
  IsString,
  IsOptional,
  IsNotEmpty, IsIn, IsMongoId
} from 'class-validator';
import { IsValidDateString } from 'src/modules/utils/decorators/is-valid-date-string';
import { POLL_TARGET_SOURCE } from '../constants';

export class PollCreatePayload {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsValidDateString()
  @IsOptional()
  expiredAt: Date;

  @IsString()
  @IsOptional()
  @IsMongoId()
  performerId: string;
}

export class VoteCreatePayload {
  @IsString()
  @IsOptional()
  @IsIn([POLL_TARGET_SOURCE.FEED])
  targetSource = 'feed';

  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  targetId: string;
}
