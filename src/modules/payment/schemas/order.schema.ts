import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { ObjectId } from 'mongodb';
import { PAYMENT_STATUS } from '../constants';

@Schema({
  collection: 'orders'
})
export class Order {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  buyerId: ObjectId;

  @Prop()
  buyerSource: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  sellerId: ObjectId;

  @Prop()
  sellerSource: string;

  @Prop()
  type: string;

  @Prop()
  orderNumber: string;

  @Prop({
    index: true
  })
  status: string;

  @Prop({
    default: 1
  })
  quantity: number;

  @Prop({
    default: 0
  })
  totalPrice: number;

  @Prop()
  originalPrice: number;

  @Prop({
    type: MongooseSchema.Types.Mixed
  })
  couponInfo: Record<string, any>;

  @Prop()
  deliveryAddress: string;

  @Prop()
  postalCode: string;

  @Prop()
  phoneNumber: string;

  @Prop()
  paymentGateway: string;

  @Prop({
    default: PAYMENT_STATUS.PENDING,
    index: true
  })
  paymentStatus: string;

  @Prop()
  description: string;

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

export type OrderDocument = HydratedDocument<Order>;

export const OrderSchema = SchemaFactory.createForClass(Order);
