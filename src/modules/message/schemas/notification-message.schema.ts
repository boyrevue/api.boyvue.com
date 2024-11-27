import { ObjectId } from 'mongodb';

import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'notificationmessages'
})
export class NotificationMessage {
  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  conversationId: ObjectId;

  @Prop({
    default: 0
  })
  totalNotReadMessage: number;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  recipientId: ObjectId;

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

export type NotificationMessageDocument = HydratedDocument<NotificationMessage>;

export const NotificationMessageSchema = SchemaFactory.createForClass(NotificationMessage);

NotificationMessageSchema.index({ conversationId: 1 }, {
  name: 'idx_conversationId'
});

NotificationMessageSchema.index({ recipientId: 1 }, {
  name: 'idx_recipientId'
});

NotificationMessageSchema.index({ conversationId: 1, recipientId: 1 }, {
  name: 'idx_conversationId_recipientId'
});
