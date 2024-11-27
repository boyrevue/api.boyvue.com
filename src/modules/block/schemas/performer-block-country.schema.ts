import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'performerblockcountries'
})
export class PerformerBlockCountry {
  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  sourceId: ObjectId;

  @Prop()
  source: string;

  @Prop({
    type: [{
      type: String
    }]
  })
  countryCodes: string[];

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

export type PerformerBlockCountryDocument = HydratedDocument<PerformerBlockCountry>;

export const PerformerBlockCountrySchema = SchemaFactory.createForClass(PerformerBlockCountry);
PerformerBlockCountrySchema.index({ sourceId: 1, countryCodes: 1 }, {
  name: 'idx_sourceId_country_codes'
});
