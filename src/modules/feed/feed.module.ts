import { Module, forwardRef } from '@nestjs/common';
import { QueueModule, AgendaModule } from 'src/kernel';
import { SubscriptionModule } from 'src/modules/subscription/subscription.module';
import { PaymentModule } from 'src/modules/payment/payment.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { FeedFileService, FeedService } from './services';
import { PerformerFeedController, FeedFileController, UserFeedController } from './controllers';
import {
  ReactionFeedListener, CommentFeedListener, PollFeedListener,
  DeletePerformerFeedListener, TipFeedListener
} from './listeners';
import { FileModule } from '../file/file.module';
import { PerformerModule } from '../performer/performer.module';
import { ReactionModule } from '../reaction/reaction.module';
import { SocketModule } from '../socket/socket.module';
import {
  Feed, FeedSchema, Poll, PollSchema, Vote, VoteSchema
} from './schemas';

@Module({
  imports: [
    QueueModule.forRoot(),
    AgendaModule.register(),
    MongooseModule.forFeature([
      {
        name: Feed.name,
        schema: FeedSchema
      },
      {
        name: Poll.name,
        schema: PollSchema
      },
      {
        name: Vote.name,
        schema: VoteSchema
      }
    ]),
    // inject user module because we request guard from auth, need to check and fix dependencies if not needed later
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => FileModule),
    forwardRef(() => PerformerModule),
    forwardRef(() => ReactionModule),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => PaymentModule),
    forwardRef(() => SocketModule)
  ],
  providers: [
    FeedService,
    FeedFileService,
    ReactionFeedListener,
    CommentFeedListener,
    PollFeedListener,
    DeletePerformerFeedListener,
    TipFeedListener
  ],
  controllers: [
    PerformerFeedController,
    FeedFileController,
    UserFeedController
  ],
  exports: [
    FeedService,
    FeedFileService
  ]
})
export class FeedModule { }
