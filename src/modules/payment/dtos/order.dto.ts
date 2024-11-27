import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { OrderDetailsDto } from './order-details.dto';

export class OrderDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.buyerId)
  buyerId: ObjectId;

  @Expose()
  buyerSource: string;

  @Expose()
  @Transform(({ obj }) => obj.sellerId)
  sellerId: ObjectId;

  @Expose()
  sellerSource: string;

  @Expose()
  type: string;

  @Expose()
  details: Array<Partial<OrderDetailsDto>>;

  @Expose()
  status: string;

  @Expose()
  quantity: number;

  @Expose()
  totalPrice: number;

  @Expose()
  originalPrice: number;

  @Expose()
  deliveryAddress: string;

  @Expose()
  postalCode: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  paymentGateway: string;

  @Expose()
  couponInfo: Record<string, any>;

  @Expose()
  seller: Record<string, any>;

  @Expose()
  buyer: Record<string, any>;

  @Expose()
  orderNumber: string;

  @Expose()
  description: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(OrderDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }
}
