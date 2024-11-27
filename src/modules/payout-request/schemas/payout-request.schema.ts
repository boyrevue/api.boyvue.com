import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { SOURCE_TYPE } from '../constants';

@Schema({
  collection: 'payoutrequests'
})
export class PayoutRequest {
  @Prop({
    default: SOURCE_TYPE.PERFORMER
  })
  source: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  sourceId: ObjectId;

  @Prop({
    default: 'banking'
  })
  paymentAccountType: string;

  @Prop({
    type: MongooseSchema.Types.Mixed
  })
  paymentAccountInfo: Record<string, any>;

  @Prop()
  requestNote: string;

  @Prop()
  adminNote: string;

  @Prop({
    default: 'pending'
  })
  status: string;

  @Prop({
    default: 0
  })
  requestedPrice: number;

  @Prop()
  fromDate: Date;

  @Prop()
  toDate: Date;

  @Prop()
  sourceUsername: string;

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

export type PayoutRequestDocument = HydratedDocument<PayoutRequest>;
export const PayoutRequestSchema = SchemaFactory.createForClass(PayoutRequest);
PayoutRequestSchema.index({ source: 1, sourceId: 1 }, {
  name: 'idx_source_sourceId'
});

PayoutRequestSchema.index({ status: 1 }, {
  name: 'idx_status'
});
