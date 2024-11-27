import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  _id: false
})
export class FileRefItem {
  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  itemId: ObjectId;

  @Prop()
  itemType: string;
}

const FileRefItemSchema = SchemaFactory.createForClass(FileRefItem);

@Schema({
  collection: 'files'
})
export class File {
  @Prop()
  type: string;

  @Prop()
  name: string;

  @Prop()
  description: string;

  @Prop()
  mimeType: string;

  @Prop()
  server: string;

  @Prop()
  path: string;

  @Prop()
  absolutePath: string;

  @Prop()
  width: number;

  @Prop()
  height: number;

  @Prop()
  duration: number;

  @Prop()
  size: number;

  @Prop()
  status: string;

  @Prop()
  encoding: string;

  // store array of the files
  @Prop({
    type: MongooseSchema.Types.Mixed
  })
  thumbnails: Record<string, any>;

  @Prop()
  blurImagePath: string;
  // eg avatar is attached to what user model?

  @Prop({
    type: [FileRefItemSchema],
    _id: false
  })
  refItems: FileRefItem[];

  @Prop({
    type: MongooseSchema.Types.Mixed
  })
  error: Record<string, any>;

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

export type FileDocument = HydratedDocument<File>;
export const FileSchema = SchemaFactory.createForClass(File);
