import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'system_logs'
})
export class DBLogger {
  @Prop()
  context: string;

  @Prop()
  level: string;

  @Prop({
    type: MongooseSchema.Types.Mixed
  })
  message: any;

  @Prop({
    type: Date,
    default: Date.now
  })
  createdAt: Date;
}

export type DBLoggerDocument = HydratedDocument<DBLogger>;

export const DBLoggerSchema = SchemaFactory.createForClass(DBLogger);

DBLoggerSchema.index({ createdAt: -1 }, {
  name: 'idx_createdAt'
});
