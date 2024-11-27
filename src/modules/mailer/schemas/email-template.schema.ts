import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({
  collection: 'emailtemplates'
})
export class EmailTemplate {
  @Prop()
  description: string;

  @Prop()
  key: string;

  @Prop()
  subject: string;

  @Prop()
  content: string;

  @Prop()
  layout: string;

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

export type EmailTemplateDocument = HydratedDocument<EmailTemplate>;

export const EmailTemplateSchema = SchemaFactory.createForClass(EmailTemplate);

EmailTemplateSchema.index({ key: 1 }, {
  name: 'idx_key',
  unique: true
});
