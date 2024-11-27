import { Module, forwardRef } from '@nestjs/common';
import { QueueModule } from 'src/kernel';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { SettingModule } from '../settings/setting.module';
import { MailerService } from './services';
import { MailerController } from './controllers/mail.controller';
import { EmailTemplate, EmailTemplateSchema } from './schemas/email-template.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: EmailTemplate.name,
        schema: EmailTemplateSchema
      }
    ]),
    QueueModule.forRoot(),
    forwardRef(() => AuthModule),
    forwardRef(() => SettingModule)
  ],
  providers: [MailerService],
  controllers: [MailerController],
  exports: [MailerService]
})
export class MailerModule { }
