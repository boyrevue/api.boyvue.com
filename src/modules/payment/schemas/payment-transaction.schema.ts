import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { ObjectId } from 'mongodb';

@Schema({
  collection: 'paymenttransactions'
})
export class PaymentTransaction {
  @Prop()
  paymentGateway: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  orderId: ObjectId;

  // user, model, etc...
  @Prop()
  source: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  sourceId: ObjectId;

  // subscription, store, etc...
  @Prop()
  type: string;

  @Prop({
    default: 0
  })
  totalPrice: number;

  @Prop({
    type: MongooseSchema.Types.Mixed
  })
  paymentResponseInfo: Record<string, any>;

  // hold token for future use in some case eg Paypal, BTCpay
  @Prop({
    index: true
  })
  paymentToken: string;

  // pending, success, etc...
  @Prop({
    index: true
  })
  status: string;

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

export type PaymentTransactionDocument = HydratedDocument<PaymentTransaction>;

export const PaymentTransactionSchema = SchemaFactory.createForClass(PaymentTransaction);
