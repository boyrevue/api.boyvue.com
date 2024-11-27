import { ObjectId } from 'mongodb';

import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'polls'
})
export class Poll {
  @Prop()
  fromRef: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  refId: ObjectId;

  @Prop()
  description: string;

  @Prop({
    default: 0
  })
  totalVote: number;

  @Prop()
  expiredAt: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  createdBy: ObjectId;

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

export type PollDocument = HydratedDocument<Poll>;

export const PollSchema = SchemaFactory.createForClass(Poll);

PollSchema.index({ createdBy: 1 }, {
  name: 'idx_fromSource_fromSourceId'
});

PollSchema.index({ refId: 1 }, {
  name: 'idx_refId'
});
