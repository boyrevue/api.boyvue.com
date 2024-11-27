import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'forgot'
})
export class Forgot {
  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  authId: ObjectId;

  @Prop()
  source: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  sourceId: ObjectId;

  @Prop({
    index: true
  })
  token: string;

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

export type ForgotDocument = HydratedDocument<Forgot>;

export const ForgotSchema = SchemaFactory.createForClass(Forgot);
