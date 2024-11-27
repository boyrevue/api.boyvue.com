import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({
  collection: 'siteblockcountries'
})
export class BlockCountry {
  @Prop()
  countryCode: string;

  @Prop({
    type: Date,
    default: Date.now
  })
  createdAt: Date;
}

export type BlockCountryDocument = HydratedDocument<BlockCountry>;

export const BlockCountrySchema = SchemaFactory.createForClass(BlockCountry);

BlockCountrySchema.index({ countryCode: 1 }, {
  name: 'idx_country_code',
  unique: true
});
