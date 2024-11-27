import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'comments'
})
export class Comment {
  @Prop()
  content: string;

  @Prop()
  objectType: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  objectId: ObjectId;

  @Prop()
  totalReply: number;

  @Prop()
  totalLike: number;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  createdBy: ObjectId;

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

export type CommentDocument = HydratedDocument<Comment>;

export const CommentSchema = SchemaFactory.createForClass(Comment);
CommentSchema.index({ objectType: 1, objectId: 1 }, {
  name: 'idx_object_type_object_id'
});
CommentSchema.index({ objectId: 1 }, {
  name: 'idx_object_id'
});
