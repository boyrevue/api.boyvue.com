import { ObjectId } from 'mongodb';

import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'performerbankingsettings'
})
export class BankingSetting {
  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  performerId: ObjectId;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  SSN: string;

  @Prop()
  bankName: string;

  @Prop()
  bankAccount: string;

  @Prop()
  bankRouting: string;

  @Prop()
  bankSwiftCode: string;

  @Prop()
  address: string;

  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop()
  country: string;

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

export type BankingSettingDocument = HydratedDocument<BankingSetting>;

export const BankingSettingSchema = SchemaFactory.createForClass(BankingSetting);

BankingSettingSchema.index({ performerId: 1 }, {
  name: 'idx_performerId'
});
