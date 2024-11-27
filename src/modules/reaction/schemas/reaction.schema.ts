import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'reacts'
})
export class Reaction {
  @Prop()
  action: string;

  @Prop()
  objectType: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  objectId: ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  createdBy: ObjectId;

  @Prop({
    type: Date,
    default: Date.now,
    index: true
  })
  createdAt: Date;

  @Prop({
    type: Date,
    default: Date.now
  })
  updatedAt: Date;
}

export type ReactionDocument = HydratedDocument<Reaction>;

export const ReactionSchema = SchemaFactory.createForClass(Reaction);

ReactionSchema.index({ objectId: 1 }, {
  name: 'idx_objectId'
});

ReactionSchema.index({ objectType: 1, objectId: 1 }, {
  name: 'idx_objectType_objectId'
});

ReactionSchema.index({
  objectType: 1, objectId: 1, action: 1, createdBy: 1
}, {
  name: 'idx_objectId_action_createdBy',
  unique: true
});
