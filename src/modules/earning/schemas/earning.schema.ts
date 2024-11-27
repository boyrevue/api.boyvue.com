import { STATUSES } from 'src/modules/payout-request/constants';

import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'earnings'
})
export class Earning {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  transactionId: ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  orderId: ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  userId: ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  performerId: ObjectId;

  @Prop()
  sourceType: string;
  // from details of item

  @Prop({
    index: true
  })
  type: string;

  @Prop()
  productType: string;

  @Prop()
  grossPrice: number;

  @Prop()
  netPrice: number;

  @Prop({
    default: 0.1
  })
  commission: number;

  @Prop({
    index: true,
    default: false
  })
  isPaid: boolean;

  @Prop({
    index: true
  })
  transactionStatus: string;

  @Prop()
  paymentMethod: string;

  @Prop({
    index: true
  })
  paymentStatus: string;

  @Prop({
    default: STATUSES.PENDING
  })
  payoutStatus: string;

  paidAt: Date;

  @Prop({
    index: true
  })
  userUsername: string;

  @Prop({
    index: true
  })
  performerUsername: string;

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

export type EarningDocument = HydratedDocument<Earning>;

export const EarningSchema = SchemaFactory.createForClass(Earning);
