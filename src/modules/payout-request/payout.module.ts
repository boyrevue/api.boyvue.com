import {
  Module, forwardRef
} from '@nestjs/common';
import { QueueModule } from 'src/kernel';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { PayoutRequestService } from './services';
import {
  PayoutRequestController, AdminPayoutRequestController,
  PayoutRequestSearchController
} from './controllers';
import { PerformerModule } from '../performer/performer.module';
import { MailerModule } from '../mailer/mailer.module';
import { SettingModule } from '../settings/setting.module';
import { EarningModule } from '../earning/earning.module';
import { UpdatePayoutRequestListener } from './listeners';
import { PayoutRequest, PayoutRequestSchema } from './schemas/payout-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: PayoutRequest.name,
        schema: PayoutRequestSchema
      }
    ]),
    QueueModule.forRoot(),
    forwardRef(() => AuthModule),
    forwardRef(() => PerformerModule),
    forwardRef(() => MailerModule),
    forwardRef(() => SettingModule),
    forwardRef(() => EarningModule)
  ],
  providers: [
    PayoutRequestService,
    UpdatePayoutRequestListener
  ],
  controllers: [
    PayoutRequestController,
    AdminPayoutRequestController,
    PayoutRequestSearchController
  ],
  exports: [PayoutRequestService]
})
export class PayoutRequestModule { }
