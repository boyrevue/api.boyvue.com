import { Module, forwardRef } from '@nestjs/common';
import { QueueModule } from 'src/kernel';
import { MongooseModule } from '@nestjs/mongoose';
import { ReactionController } from './controllers/reaction.controller';
import { ReactionService } from './services/reaction.service';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { PerformerModule } from '../performer/performer.module';
import { PerformerAssetsModule } from '../performer-assets/performer-assets.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PaymentModule } from '../payment/payment.module';
import { FeedModule } from '../feed/feed.module';
import { Reaction, ReactionSchema } from './schemas';
import { FileModule } from '../file/file.module';

@Module({
  imports: [
    QueueModule.forRoot(),
    MongooseModule.forFeature([
      {
        name: Reaction.name,
        schema: ReactionSchema
      }
    ]),
    forwardRef(() => FileModule),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PerformerModule),
    forwardRef(() => PerformerAssetsModule),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => PaymentModule),
    forwardRef(() => FeedModule)
  ],
  providers: [ReactionService],
  controllers: [ReactionController],
  exports: [ReactionService]
})
export class ReactionModule { }
