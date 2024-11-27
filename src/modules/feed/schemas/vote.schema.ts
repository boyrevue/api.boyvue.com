import { ObjectId } from 'mongodb';

import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'votes'
})
export class Vote {
  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  fromSourceId: ObjectId;

  @Prop()
  fromSource: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  targetId: ObjectId;

  @Prop()
  targetSource: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  refId: ObjectId;

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

export type VoteDocument = HydratedDocument<Vote>;

export const VoteSchema = SchemaFactory.createForClass(Vote);

VoteSchema.index({ targetSource: 1, targetId: 1 }, {
  name: 'idx_targetSource_targetId'
});
VoteSchema.index({ targetId: 1 }, {
  name: 'idx_targetId'
});

VoteSchema.index({ fromSource: 1, fromSourceId: 1 }, {
  name: 'idx_fromSource_fromSourceId'
});

VoteSchema.index({ refId: 1 }, {
  name: 'idx_refId'
});

VoteSchema.index({ targetSource: 1, refId: 1, fromSourceId: 1 }, {
  name: 'idx_targetSource_refId_fromSourceId'
});
