import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'performerphotos'
})
export class Photo {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  performerId: ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  galleryId: ObjectId;

  // original file
  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  fileId: ObjectId;

  @Prop()
  title: string;

  @Prop()
  description: string;

  @Prop({
    index: true,
    default: 'active'
  })
  status: string;

  @Prop({
    default: false
  })
  isSale: boolean;

  @Prop()
  price: number;

  @Prop()
  processing: boolean;

  @Prop({
    default: false
  })
  isGalleryCover: boolean;

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

export type PhotoDocument = HydratedDocument<Photo>;

export const PhotoSchema = SchemaFactory.createForClass(Photo);
