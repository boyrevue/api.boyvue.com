import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'posts'
})
export class Post {
  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  authorId: ObjectId;

  @Prop()
  type: string;

  @Prop()
  title: string;

  @Prop()
  slug: string;

  @Prop({
    default: 0
  })
  ordering: number;

  @Prop()
  content: string;

  @Prop()
  shortDescription: string;

  @Prop({
    type: [{
      type: MongooseSchema.Types.ObjectId
    }]
  })
  categoryIds: ObjectId[];

  // store all related categories such as parent ids int search filter
  @Prop({
    type: [{
      type: MongooseSchema.Types.ObjectId
    }]
  })
  categorySearchIds: ObjectId[];

  @Prop({
    default: 'published',
    index: true
  })
  status: string;

  @Prop({
    type: MongooseSchema.Types.Mixed
  })
  image: any;

  @Prop()
  metaTitle: string;

  @Prop()
  metaKeywords: string;

  @Prop()
  metaDescription: string;

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

export type PostDocument = HydratedDocument<Post>;
export const PostSchema = SchemaFactory.createForClass(Post);
PostSchema.index({ slug: 1, status: 1 }, {
  name: 'idx_slug_status'
});

PostSchema.index({ type: 1 }, {
  name: 'idx_type'
});

PostSchema.index({ slug: 1 }, {
  name: 'idx_slug',
  unique: true
});
