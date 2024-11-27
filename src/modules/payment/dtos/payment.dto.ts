import { ObjectId } from 'mongodb';
import { CouponDto } from 'src/modules/coupon/dtos';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { PerformerDto } from 'src/modules/performer/dtos';

export interface PaymentProduct {
  name: string;
  description: string;
  price: number | string;
  extraInfo: any;
  productType: string;
  productId: ObjectId;
  performerId: ObjectId;
  quantity: number;
}

export interface DigitalProductResponse {
  digitalFileUrl: any;
  digitalFileId: any;
  _id: string | ObjectId;
}
export class PaymentTransactionDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.orderId)
  orderId: ObjectId;

  @Expose()
  paymentGateway: string;

  @Expose()
  @Transform(({ obj }) => obj.sourceInfo)
  sourceInfo: Record<string, any>;

  @Expose()
  source: string;

  @Expose()
  @Transform(({ obj }) => obj.sourceId)
  sourceId: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.performerId)
  performerId: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.performerInfo)
  performerInfo: Partial<PerformerDto>;

  @Expose()
  target: string;

  @Expose()
  @Transform(({ obj }) => obj.targetId)
  targetId: ObjectId;

  @Expose()
  type: string;

  @Expose()
  @Transform(({ obj }) => obj.products)
  products: PaymentProduct[];

  @Expose()
  @Transform(({ obj }) => obj.paymentResponseInfo)
  paymentResponseInfo: any;

  @Expose()
  totalPrice: number;

  @Expose()
  originalPrice: number;

  @Expose()
  @Transform(({ obj }) => obj.couponInfo)
  couponInfo: Partial<CouponDto>;

  @Expose()
  status: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Transform(({ obj }) => obj.digitalProducts)
  digitalProducts: DigitalProductResponse[];

  @Expose()
  deliveryAddress: string;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(PaymentTransactionDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  toResponse(includePrivateInfo = false) {
    const publicInfo = {
      _id: this._id,
      paymentGateway: this.paymentGateway,
      sourceId: this.sourceId,
      source: this.source,
      sourceInfo: this.sourceInfo,
      performerId: this.performerId,
      performerInfo: this.performerInfo,
      target: this.target,
      targetId: this.targetId,
      type: this.type,
      products: this.products,
      totalPrice: this.totalPrice,
      originalPrice: this.originalPrice,
      couponInfo: this.couponInfo,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deliveryAddress: this.deliveryAddress
    };

    const privateInfo = {
      paymentResponseInfo: this.paymentResponseInfo
    };
    if (!includePrivateInfo) {
      return publicInfo;
    }

    return {
      ...publicInfo,
      ...privateInfo
    };
  }
}
