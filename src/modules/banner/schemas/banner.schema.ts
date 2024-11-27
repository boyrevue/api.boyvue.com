import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'banners'
})
export class Banner {
  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  fileId: ObjectId;

  @Prop()
  title: string;

  @Prop()
  link: string;

  @Prop()
  status: string;

  @Prop()
  description: string;

  @Prop()
  position: string;

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

export type BannerDocument = HydratedDocument<Banner>;

export const BannerSchema = SchemaFactory.createForClass(Banner);
BannerSchema.index({ position: 1 }, {
  name: 'idx_position'
});
