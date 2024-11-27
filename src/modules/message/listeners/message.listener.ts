import { Injectable } from '@nestjs/common';
import { QueueEvent, QueueEventService, StringHelper } from 'src/kernel';
import { Model } from 'mongoose';
import { SocketUserService } from 'src/modules/socket/services/socket-user.service';
import { ObjectId } from 'mongodb';
import { InjectModel } from '@nestjs/mongoose';
import { MESSAGE_CHANNEL, MESSAGE_EVENT } from '../constants';
import { MessageDto } from '../dtos';
import { Conversation, NotificationMessage } from '../schemas';

const MESSAGE_NOTIFY = 'MESSAGE_NOTIFY';
const HANDLE_DELETE_MESSAGE = 'HANDLE_DELETE_MESSAGE';

@Injectable()
export class MessageListener {
  constructor(
    @InjectModel(Conversation.name) private readonly ConversationModel: Model<Conversation>,
    @InjectModel(NotificationMessage.name) private readonly NotificationMessageModel: Model<NotificationMessage>,
    private readonly queueEventService: QueueEventService,
    private readonly socketUserService: SocketUserService
  ) {
    this.queueEventService.subscribe(
      MESSAGE_CHANNEL,
      MESSAGE_NOTIFY,
      this.handleMessage.bind(this)
    );

    this.queueEventService.subscribe(
      MESSAGE_CHANNEL,
      HANDLE_DELETE_MESSAGE,
      this.handleDeleteMessage.bind(this)
    );
  }

  private async handleMessage(event: QueueEvent): Promise<void> {
    if (event.eventName !== MESSAGE_EVENT.CREATED) return;
    const message = event.data as MessageDto;

    const conversation = await this.ConversationModel
      .findOne({ _id: message.conversationId })
      .lean()
      .exec();
    if (!conversation) return;
    const recipient = conversation.recipients.find(
      (r) => r.sourceId.toString() !== message.senderId.toString()
    );
    await this.updateNotification(conversation, recipient);
    await this.handleSent(recipient.sourceId, message);
    await this.updateLastMessage(conversation, message);
  }

  private async updateLastMessage(conversation, message: MessageDto): Promise<void> {
    const lastMessage = StringHelper.truncate(message.text || '', 30);
    const lastSenderId = message.senderId;
    const lastMessageCreatedAt = message.createdAt;
    await this.ConversationModel.updateOne({ _id: conversation._id }, {
      $set: {
        lastMessage,
        lastSenderId,
        lastMessageCreatedAt
      }
    });
  }

  // eslint-disable-next-line consistent-return
  private async updateNotification(conversation, recipient): Promise<void> {
    let notification = await this.NotificationMessageModel.findOne({
      recipientId: recipient.sourceId,
      conversationId: conversation._id
    });
    if (!notification) {
      notification = new this.NotificationMessageModel({
        recipientId: recipient.sourceId,
        conversationId: conversation._id,
        totalNotReadMessage: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    notification.totalNotReadMessage += 1;
    await notification.save();
    const totalNotReadMessage = await this.NotificationMessageModel.aggregate<any>([
      {
        $match: { recipientId: recipient.sourceId }
      },
      {
        $group: {
          _id: '$conversationId',
          total: {
            $sum: '$totalNotReadMessage'
          }
        }
      }
    ]);
    let total = 0;
    totalNotReadMessage && totalNotReadMessage.length && totalNotReadMessage.forEach((data) => {
      if (data.total) {
        total += 1;
      }
    });
    await this.notifyCountingNotReadMessageInConversation(recipient.sourceId, total);
  }

  private async notifyCountingNotReadMessageInConversation(receiverId, total): Promise<void> {
    await this.socketUserService.emitToUsers(new ObjectId(receiverId), 'nofify_read_messages_in_conversation', { total });
  }

  private async handleSent(recipientId, message): Promise<void> {
    await this.socketUserService.emitToUsers(recipientId, 'message_created', message);
  }

  private async handleDeleteMessage(event: QueueEvent): Promise<void> {
    if (event.eventName !== MESSAGE_EVENT.DELETED) return;
    const message = event.data as MessageDto;
    const conversation = await this.ConversationModel
      .findOne({ _id: message.conversationId })
      .lean()
      .exec();
    if (!conversation) return;
    conversation.recipients.reduce(async (lp, recipient) => {
      await lp;
      await this.socketUserService.emitToUsers(recipient.sourceId, 'message_deleted', message);
      return Promise.resolve();
    }, Promise.resolve());
  }
}
