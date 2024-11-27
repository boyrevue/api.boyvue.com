import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'performerblockusers'
})
export class PerformerBlockUser {
  @Prop({
    default: 'performer'
  })
  source: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  sourceId: ObjectId;

  @Prop({
    default: 'user'
  })
  target: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  targetId: ObjectId;

  @Prop()
  reason: string;

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

export type PerformerBlockUserDocument = HydratedDocument<PerformerBlockUser>;

export const PerformerBlockUserSchema = SchemaFactory.createForClass(PerformerBlockUser);
PerformerBlockUserSchema.index({ sourceId: 1, targetId: 1 }, {
  name: 'idx_sourceId_targetId'
});
