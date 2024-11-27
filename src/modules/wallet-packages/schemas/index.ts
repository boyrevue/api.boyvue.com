import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({
  collection: 'walletpackages'
})
export class WalletPackage {
  @Prop()
  name: string;

  @Prop()
  description: string;

  @Prop({
    default: 0
  })
  ordering: number;

  @Prop()
  url: String;

  @Prop()
  status: string;

  @Prop({
    default: 0
  })
  price: number;

  @Prop({
    default: 0
  })
  token: number;

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

export type WalletPackageDocument = HydratedDocument<WalletPackage>;

export const WalletPackageSchema = SchemaFactory.createForClass(WalletPackage);

WalletPackageSchema.index({ status: 1 }, {
  name: 'idx_status'
});
