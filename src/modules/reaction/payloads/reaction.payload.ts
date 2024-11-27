import {
  IsString, IsOptional, IsNotEmpty, IsIn, IsMongoId
} from 'class-validator';
import { REACTION, REACTION_TYPE } from '../constants';

export class ReactionCreatePayload {
  @IsString()
  @IsOptional()
  @IsIn([
    REACTION_TYPE.VIDEO,
    REACTION_TYPE.PERFORMER,
    REACTION_TYPE.COMMENT,
    REACTION_TYPE.GALLERY,
    REACTION_TYPE.PRODUCT,
    REACTION_TYPE.FEED
  ])
  objectType = REACTION_TYPE.VIDEO;

  @IsString()
  @IsOptional()
  @IsIn([
    REACTION.LIKE,
    REACTION.FAVOURITE,
    REACTION.WATCH_LATER,
    REACTION.BOOKMARK
  ])
  action: string;

  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  objectId: string;
}
