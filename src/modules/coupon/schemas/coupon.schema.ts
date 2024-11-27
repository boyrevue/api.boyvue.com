import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({
  collection: 'coupons'
})
export class Coupon {
  @Prop()
  name: string;

  @Prop()
  description: string;

  @Prop()
  code: string;

  @Prop({
    default: 0
  })
  value: number;

  @Prop()
  expiredDate: Date;

  @Prop({
    default: 'active'
  })
  status: string;

  @Prop({
    default: 0
  })
  numberOfUses: number;

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

export type CouponDocument = HydratedDocument<Coupon>;

export const CouponSchema = SchemaFactory.createForClass(Coupon);
CouponSchema.index({ code: 1 }, {
  name: 'idx_code',
  unique: true
});
