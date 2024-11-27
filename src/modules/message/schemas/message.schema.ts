import { ObjectId } from 'mongodb';

import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'messages'
})
export class Message {
  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  conversationId: ObjectId;
  // text, file, etc...

  @Prop()
  type: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  fileId: ObjectId;

  @Prop()
  text: string;

  @Prop()
  senderSource: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  senderId: ObjectId;

  @Prop({
    type: MongooseSchema.Types.Mixed
  })
  meta: Record<string, any>;

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

export type MessageDocument = HydratedDocument<Message>;

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversationId: 1 }, {
  name: 'idx_conversationId'
});

MessageSchema.index({ conversationId: 1, createdAt: -1 }, {
  name: 'idx_conversationId_createdAt'
});
