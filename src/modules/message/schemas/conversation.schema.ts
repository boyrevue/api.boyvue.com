import { ObjectId } from 'mongodb';

import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  _id: false
})
export class Recipient {
  @Prop()
  source: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  sourceId: ObjectId;
}

const RecipientSchema = SchemaFactory.createForClass(Recipient);

@Schema({
  collection: 'conversations'
})
export class Conversation {
  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  conversationId: ObjectId;

  @Prop()
  type: string;

  @Prop()
  name: string;

  @Prop()
  lastMessage: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  lastSenderId: ObjectId;

  @Prop()
  lastMessageCreatedAt: Date;

  @Prop({
    type: [{
      _id: false,
      type: RecipientSchema
    }]
  })
  recipients: Array<Recipient>;

  @Prop({
    type: MongooseSchema.Types.Mixed
  })
  meta: Record<string, any>;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  streamId: ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  performerId: ObjectId;

  @Prop({
    default: false
  })
  isPinned: boolean;

  @Prop()
  pinnedAt: Date;

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

export type ConversationDocument = HydratedDocument<Conversation>;

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ recipients: 1 }, {
  name: 'idx_recipients'
});

ConversationSchema.index({ recipients: 1, type: 1 }, {
  name: 'idx_recipients_type'
});
