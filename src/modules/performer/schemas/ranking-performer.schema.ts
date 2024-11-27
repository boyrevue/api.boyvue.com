import { ObjectId } from 'mongodb';

import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'rankingperformers'
})
export class RankingPerformer {
  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  performerId: ObjectId;

  @Prop()
  ordering: number;

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

export type RankingPerformerDocument = HydratedDocument<RankingPerformer>;

export const RankingPerformerSchema = SchemaFactory.createForClass(RankingPerformer);

RankingPerformerSchema.index({ performerId: 1 }, {
  name: 'idx_performerId'
});
