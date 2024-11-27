import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { UserDto } from 'src/modules/user/dtos';
import { PerformerDto } from 'src/modules/performer/dtos';

export class OrderDetailsDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.orderId)
  orderId: ObjectId;

  @Expose()
  orderNumber: string;

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
  productType: string;

  @Expose()
  @Transform(({ obj }) => obj.productId)
  productId: ObjectId;

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  unitPrice: number;

  @Expose()
  originalPrice: number;

  @Expose()
  status: string;

  @Expose()
  payBy: string;

  @Expose()
  quantity: number;

  @Expose()
  totalPrice: number;

  @Expose()
  deliveryStatus: string;

  @Expose()
  deliveryAddress: string;

  @Expose()
  paymentStatus: string;

  @Expose()
  postalCode: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  paymentGateway: string;

  @Expose()
  @Transform(({ obj }) => obj.couponInfo)
  couponInfo: Record<string, any>;

  @Expose()
  @Transform(({ obj }) => obj.extraInfo)
  extraInfo: Record<string, any>;

  @Expose()
  seller: Record<string, any>;

  @Expose()
  buyer: Record<string, any>;

  @Expose()
  shippingCode: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(OrderDetailsDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  public setBuyer(user: UserDto | PerformerDto) {
    if (!user) {
      this.buyer = null;
      return;
    }

    this.buyer = user.toSearchResponse();
  }

  public setSeller(user: UserDto | PerformerDto) {
    if (!user) {
      this.seller = null;
      return;
    }

    this.seller = user.toSearchResponse();
  }

  toResponse(isAdmin = false) {
    const publicInfo = {
      _id: this._id,
      orderId: this.orderId,
      orderNumber: this.orderNumber,
      buyerId: this.buyerId,
      buyerSource: this.buyerSource,
      sellerId: this.sellerId,
      sellerSource: this.sellerSource,
      productType: this.productType,
      productId: this.productId,
      name: this.name,
      description: this.description,
      unitPrice: this.unitPrice,
      originalPrice: this.originalPrice,
      status: this.status,
      payBy: this.payBy,
      quantity: this.quantity,
      totalPrice: this.totalPrice,
      deliveryStatus: this.deliveryStatus,
      deliveryAddress: this.deliveryAddress,
      paymentStatus: this.paymentStatus,
      postalCode: this.postalCode,
      phoneNumber: this.phoneNumber,
      paymentGateway: this.paymentGateway,
      couponInfo: this.couponInfo,
      shippingCode: this.shippingCode,
      seller: this.seller,
      buyer: this.buyer,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
    const privateInfo = {
      extraInfo: this.extraInfo
    };
    if (!isAdmin) {
      return publicInfo;
    }
    return { ...publicInfo, ...privateInfo };
  }
}
