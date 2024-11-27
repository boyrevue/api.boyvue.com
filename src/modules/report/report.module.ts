import { Module, forwardRef } from '@nestjs/common';
import { QueueModule } from 'src/kernel';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportController } from './controllers/report.controller';
import { ReportService } from './services/report.service';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { PerformerModule } from '../performer/performer.module';
import { PerformerAssetsModule } from '../performer-assets/performer-assets.module';
import { MailerModule } from '../mailer/mailer.module';
import { FeedModule } from '../feed/feed.module';
import { Report, ReportSchema } from './schemas';

@Module({
  imports: [
    QueueModule.forRoot(),
    MongooseModule.forFeature([
      {
        name: Report.name,
        schema: ReportSchema
      }
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PerformerModule),
    forwardRef(() => PerformerAssetsModule),
    forwardRef(() => MailerModule),
    forwardRef(() => FeedModule)
  ],
  providers: [ReportService],
  controllers: [ReportController],
  exports: [ReportService]
})
export class ReportModule { }
