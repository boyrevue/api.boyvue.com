import { ObjectId } from 'mongodb';

import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'usersubscriptions'
})
export class Subscription {
  @Prop({
    enum: ['monthly', 'yearly', 'system'],
    default: 'monthly'
  })
  subscriptionType: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  performerId: ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  userId: ObjectId;

  @Prop({
    index: true
  })
  subscriptionId: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  transactionId: ObjectId;

  @Prop()
  paymentGateway: string;

  @Prop({
    default: Date.now
  })
  startRecurringDate: Date;

  @Prop()
  nextRecurringDate: Date;

  @Prop({
    index: true
  })
  status: string;

  @Prop({
    type: MongooseSchema.Types.Mixed
  })
  meta: Record<string, any>;

  @Prop()
  expiredAt: Date;

  @Prop({
    default: false
  })
  blockedUser: boolean;

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

export type SubscriptionDocument = HydratedDocument<Subscription>;

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ performerId: 1, userId: 1 }, {
  name: 'idx_performerId_userId',
  unique: true
});
