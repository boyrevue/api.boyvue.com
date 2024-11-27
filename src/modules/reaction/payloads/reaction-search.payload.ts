import { SearchRequest } from 'src/kernel/common';
import { ObjectId } from 'mongodb';
import {
  IsIn, IsMongoId, IsOptional, IsString
} from 'class-validator';
import { REACTION, REACTION_TYPE } from '../constants';

export class ReactionSearchRequestPayload extends SearchRequest {
  @IsOptional()
  @IsString()
  @IsMongoId()
  objectId: string | ObjectId;

  @IsOptional()
  @IsString()
  @IsIn([
    REACTION.LIKE,
    REACTION.FAVOURITE,
    REACTION.WATCH_LATER,
    REACTION.BOOKMARK
  ])
  action: string;

  @IsOptional()
  @IsString()
  @IsIn([
    REACTION_TYPE.VIDEO,
    REACTION_TYPE.PERFORMER,
    REACTION_TYPE.COMMENT,
    REACTION_TYPE.GALLERY,
    REACTION_TYPE.PRODUCT,
    REACTION_TYPE.FEED
  ])
  objectType: string;

  @IsOptional()
  @IsString()
  @IsMongoId()
  createdBy: string | ObjectId;
}
