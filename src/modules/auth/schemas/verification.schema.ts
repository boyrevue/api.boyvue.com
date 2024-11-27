import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'verifications'
})
export class Verification {
  @Prop()
  source: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  sourceId: ObjectId;

  @Prop({
    default: 'email'
  })
  type: string;

  @Prop({
    index: true
  })
  value: string; // save info such as email address

  @Prop({
    index: true
  })
  token: string;

  @Prop({
    default: false
  })
  verified: boolean;

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

export type VerificationDocument = HydratedDocument<Verification>;

export const VerificationSchema = SchemaFactory.createForClass(Verification);
