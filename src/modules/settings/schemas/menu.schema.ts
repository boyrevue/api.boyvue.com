import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'menus'
})
export class Menu {
  @Prop()
  title: string;

  @Prop()
  path: string;

  @Prop({
    default: false
  })
  internal: boolean;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  parentId: ObjectId;

  @Prop()
  help: string;

  @Prop()
  section: string;

  @Prop({
    default: false
  })
  public: string;

  @Prop({
    default: 0
  })
  ordering: number;

  @Prop({
    default: false
  })
  isNewTab: boolean;

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

export type MenuDocument = HydratedDocument<Menu>;

export const MenuSchema = SchemaFactory.createForClass(Menu);
