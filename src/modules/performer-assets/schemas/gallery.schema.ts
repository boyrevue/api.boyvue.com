import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  _id: false
})
export class GalleryStats {
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

const GalleryStatsSchema = SchemaFactory.createForClass(GalleryStats);

@Schema({
  collection: 'performergalleries'
})
export class Gallery {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  performerId: ObjectId;

  @Prop({
    index: true
  })
  type: string;

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
    default: 'active'
  })
  status: string;

  @Prop()
  price: number;

  @Prop({
    default: false
  })
  isSale: boolean;

  @Prop({
    default: 0
  })
  numOfItems: number;

  @Prop({
    type: GalleryStatsSchema,
    default: {
      likes: 0,
      favourites: 0,
      comments: 0,
      views: 0
    }
  })
  stats: GalleryStats;

  @Prop({
    type: [{
      type: String,
      index: true
    }]
  })
  tags: string[];

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  coverPhotoId: ObjectId;

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

export type GalleryDocument = HydratedDocument<Gallery>;

export const GallerySchema = SchemaFactory.createForClass(Gallery);
