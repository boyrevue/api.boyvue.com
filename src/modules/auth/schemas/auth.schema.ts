import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'auth'
})
export class Auth {
  @Prop()
  source: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  sourceId: ObjectId;

  @Prop({
    default: 'password'
  })
  type: string;

  @Prop()
  key: string;

  @Prop()
  value: string;

  @Prop()
  salt: string;

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

export type AuthDocument = HydratedDocument<Auth>;

export const AuthSchema = SchemaFactory.createForClass(Auth);

AuthSchema.index({ type: 1, sourceId: 1 }, {
  name: 'idx_type_sourceId'
});
