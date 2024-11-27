import { Module, forwardRef } from '@nestjs/common';
import { AgendaModule, QueueModule } from 'src/kernel';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionController } from './controllers/subscription.controller';
import { AdminSubscriptionController } from './controllers/admin-subscription.controller';
import { CancelSubscriptionController } from './controllers/cancel-subscription.controller';
import { SubscriptionService } from './services/subscription.service';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { PerformerModule } from '../performer/performer.module';
import { OrderSubscriptionListener } from './listeners/order-subscription-update.listener';
import { CancelSubscriptionService } from './services/cancel-subscription.service';
import { SettingModule } from '../settings/setting.module';
import { MailerModule } from '../mailer/mailer.module';
import { PaymentModule } from '../payment/payment.module';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';

@Module({
  imports: [
    QueueModule.forRoot(),
    MongooseModule.forFeature([
      {
        name: Subscription.name,
        schema: SubscriptionSchema
      }
    ]),
    AgendaModule.register(),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PerformerModule),
    forwardRef(() => SettingModule),
    forwardRef(() => MailerModule),
    forwardRef(() => PaymentModule)
  ],
  providers: [SubscriptionService, CancelSubscriptionService, OrderSubscriptionListener],
  controllers: [
    SubscriptionController,
    CancelSubscriptionController,
    AdminSubscriptionController
  ],
  exports: [SubscriptionService, CancelSubscriptionService]
})
export class SubscriptionModule { }
