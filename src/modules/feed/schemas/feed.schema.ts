import { ObjectId } from 'mongodb';

import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'feeds'
})
export class Feed {
  @Prop()
  type: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  fromSourceId: ObjectId;

  @Prop({
    index: true
  })
  fromSource: string;

  @Prop()
  title: string;

  @Prop()
  text: string;

  @Prop({
    type: [{
      type: MongooseSchema.Types.ObjectId
    }]
  })
  fileIds: ObjectId[];

  @Prop({
    type: [{
      type: MongooseSchema.Types.ObjectId
    }]
  })
  pollIds: ObjectId[];

  @Prop()
  pollExpiredAt: Date;

  @Prop()
  orientation: String;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  teaserId: ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  thumbnailId: ObjectId;

  @Prop({
    default: 'active'
  })
  status: String;

  @Prop()
  tagline: String;

  @Prop({
    default: false
  })
  isPinned: boolean;

  @Prop()
  pinnedAt: Date;

  @Prop({
    default: 0
  })
  totalLike: Number;

  @Prop({
    default: 0
  })
  totalTips: number;

  @Prop({
    default: 0
  })
  totalComment: number;

  @Prop({
    default: false
  })
  isSale: boolean;

  @Prop({
    default: 0
  })
  price: number;

  @Prop({
    type: Date,
    default: Date.now
  })
  createdAt: Date;

  @Prop({
    type: Date,
    default: Date.now
  })
  updatedAt: Date;
}

export type FeedDocument = HydratedDocument<Feed>;

export const FeedSchema = SchemaFactory.createForClass(Feed);

FeedSchema.index({ status: 1 }, {
  name: 'idx_status'
});

FeedSchema.index({ type: 1 }, {
  name: 'idx_type'
});

FeedSchema.index({ fromSourceId: 1, status: 1 }, {
  name: 'idx_fromSourceId_status'
});
