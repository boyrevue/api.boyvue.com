import { ObjectId } from 'mongodb';

import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'performerpaymentgatewaysettings'
})
export class PaymentGatewaySetting {
  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  performerId: ObjectId;

  @Prop()
  key: string;

  @Prop({
    type: MongooseSchema.Types.Mixed
  })
  value: Record<string, any>;

  @Prop()
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

export type PaymentGatewaySettingDocument = HydratedDocument<PaymentGatewaySetting>;

export const PaymentGatewaySettingSchema = SchemaFactory.createForClass(PaymentGatewaySetting);

PaymentGatewaySettingSchema.index({ performerId: 1 }, {
  name: 'idx_performerId'
});
PaymentGatewaySettingSchema.index({ performerId: 1, key: 1 }, {
  name: 'idx_performerId_key'
});
