import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

import { REPORT_TARGET, REPORT_STATUSES } from '../constants';

@Schema({
  collection: 'reports'
})
export class Report {
  @Prop()
  title: string;

  @Prop()
  description: string;

  @Prop({
    default: 'user',
    index: true
  })
  source: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  sourceId: ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  performerId: ObjectId;

  @Prop({
    default: REPORT_TARGET.VIDEO,
    index: true
  })
  target: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  targetId: ObjectId;

  @Prop({
    default: REPORT_STATUSES.REPORTED,
    index: true
  })
  status: string;

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

export type ReportDocument = HydratedDocument<Report>;
export const ReportSchema = SchemaFactory.createForClass(Report);
