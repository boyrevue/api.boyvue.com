import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { ObjectId } from 'mongodb';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants';

@Schema({
  collection: 'orderdetails'
})
export class OrderDetails {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  orderId: ObjectId;

  @Prop()
  orderNumber: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  buyerId: ObjectId;

  @Prop()
  buyerSource: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  sellerId: ObjectId;

  @Prop()
  sellerSource: string;

  @Prop()
  productType: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  productId: ObjectId;

  @Prop()
  name: string;

  @Prop()
  description: string;

  @Prop()
  unitPrice: number;

  @Prop()
  quantity: number;

  @Prop()
  originalPrice: number;

  @Prop()
  totalPrice: number;

  @Prop({
    default: ORDER_STATUS.CREATED,
    index: true
  })
  status: string;

  @Prop()
  deliveryStatus: string;

  @Prop()
  deliveryAddress: string;

  @Prop()
  phoneNumber: string;

  @Prop()
  postalCode: string;

  @Prop()
  paymentGateway: string;

  @Prop({
    index: true,
    default: PAYMENT_STATUS.PENDING
  })
  paymentStatus: string;

  @Prop()
  payBy: string;

  @Prop({
    type: MongooseSchema.Types.Mixed
  })
  couponInfo: Record<string, any>;

  @Prop()
  shippingCode: string;

  @Prop({
    type: MongooseSchema.Types.Mixed
  })
  extraInfo: Record<string, any>;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  transactionId: ObjectId;

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

export type OrderDetailsDocument = HydratedDocument<OrderDetails>;

export const OrderDetailsSchema = SchemaFactory.createForClass(OrderDetails);

OrderDetailsSchema.index({ status: 1, productId: 1, buyerId: 1 }, {
  name: 'idx_status_productId_buyerId'
});

OrderDetailsSchema.index({ deliveryStatus: 1 }, {
  name: 'idx_deliveryStatus'
});
