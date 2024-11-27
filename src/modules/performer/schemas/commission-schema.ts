import { ObjectId } from 'mongodb';

import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'performercommissionsettings'
})
export class CommissionSetting {
  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  performerId: ObjectId;

  @Prop({
    default: 0.1
  })
  monthlySubscriptionCommission: number;

  @Prop({
    default: 0.1
  })
  yearlySubscriptionCommission: number;

  @Prop({
    default: 0.1
  })
  videoSaleCommission: number;

  @Prop({
    default: 0.1
  })
  productSaleCommission: number;

  @Prop({
    default: 0.2
  })
  privateChatCommission: number;

  @Prop({
    default: 0.3
  })
  groupChatCommission: number;

  @Prop({
    default: 0.2
  })
  tokenTipCommission: number;

  @Prop({
    default: 0.1
  })
  feedSaleCommission: number;

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

export type CommissionSettingDocument = HydratedDocument<CommissionSetting>;

export const CommissionSettingSchema = SchemaFactory.createForClass(CommissionSetting);

CommissionSettingSchema.index({ performerId: 1 }, {
  name: 'idx_performerId'
});
