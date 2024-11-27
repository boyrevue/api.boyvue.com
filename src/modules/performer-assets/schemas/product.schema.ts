import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  _id: false
})
export class ProductStats {
  @Prop({
    default: 0
  })
  likes: number;

  @Prop({
    default: 0
  })
  favourites: number;

  @Prop({
    default: 0
  })
  comments: number;

  @Prop({
    default: 0
  })
  views: number;
}

const ProductStatsSchema = SchemaFactory.createForClass(ProductStats);

@Schema({
  collection: 'performerproducts'
})
export class Product {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  performerId: ObjectId;

  // original file
  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  digitalFileId: ObjectId;

  @Prop({
    _id: false,
    type: [{
      type: MongooseSchema.Types.ObjectId
    }]
  })
  imageIds: ObjectId[];

  @Prop({
    _id: false,
    type: [{
      type: MongooseSchema.Types.ObjectId
    }]
  })
  categoryIds: ObjectId[];

  @Prop()
  name: string;

  @Prop({
    index: true,
    unique: true,
    lowercase: true,
    trim: true,
    sparse: true
  })
  slug: string;

  @Prop()
  description: string;

  @Prop({
    default: 'physical'
  })
  type: string;

  @Prop({
    default: 'active',
    index: true
  })
  status: string;

  @Prop({
    default: 0
  })
  price: number;

  @Prop({
    default: 0
  })
  stock: number;

  @Prop({
    type: ProductStatsSchema,
    default: {
      likes: 0,
      favourites: 0,
      comments: 0,
      views: 0
    }
  })
  stats: ProductStats;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  createdBy: ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  updatedBy: ObjectId;

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

export type ProductDocument = HydratedDocument<Product>;

export const ProductSchema = SchemaFactory.createForClass(Product);
