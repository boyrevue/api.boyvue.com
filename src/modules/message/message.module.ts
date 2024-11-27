import { Module, forwardRef } from '@nestjs/common';
import { QueueModule } from 'src/kernel';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { FileModule } from '../file/file.module';
import { PerformerModule } from '../performer/performer.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { SocketModule } from '../socket/socket.module';
import { MessageListener } from './listeners';
import { ConversationService, MessageService, NotificationMessageService } from './services';
import { ConversationController } from './controllers/conversation.controller';
import { MessageController } from './controllers/message.controller';
import { BlockModule } from '../block/block.module';
import { UtilsModule } from '../utils/utils.module';
import {
  Conversation,
  ConversationSchema,
  Message,
  MessageSchema,
  NotificationMessage,
  NotificationMessageSchema
} from './schemas';

@Module({
  imports: [
    QueueModule.forRoot(),
    MongooseModule.forFeature([
      {
        name: Conversation.name,
        schema: ConversationSchema
      },
      {
        name: Message.name,
        schema: MessageSchema
      },
      {
        name: NotificationMessage.name,
        schema: NotificationMessageSchema
      }
    ]),
    SocketModule,
    forwardRef(() => UserModule),
    forwardRef(() => PerformerModule),
    forwardRef(() => AuthModule),
    forwardRef(() => FileModule),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => BlockModule),
    forwardRef(() => UtilsModule)
  ],
  providers: [
    ConversationService,
    MessageService,
    NotificationMessageService,
    MessageListener
  ],
  controllers: [ConversationController, MessageController],
  exports: [ConversationService, MessageService]
})
export class MessageModule { }
