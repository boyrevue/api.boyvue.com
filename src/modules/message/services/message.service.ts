import {
  Injectable,
  ForbiddenException,
  HttpException
} from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { QueueEventService, EntityNotFoundException, PageableData } from 'src/kernel';
import { UserDto } from 'src/modules/user/dtos';
import { FileDto } from 'src/modules/file';
import { FileService } from 'src/modules/file/services';
import { REF_TYPE } from 'src/modules/file/constants';
import { UserService } from 'src/modules/user/services';
import { PerformerService } from 'src/modules/performer/services';
import { uniq } from 'lodash';
import { InjectModel } from '@nestjs/mongoose';
import { MessageCreatePayload } from '../payloads/message-create.payload';
import {
  CONVERSATION_TYPE,
  MESSAGE_CHANNEL,
  MESSAGE_EVENT,
  MESSAGE_PRIVATE_STREAM_CHANNEL,
  MESSAGE_TYPE
} from '../constants';
import { MessageDto } from '../dtos';
import { ConversationService, IRecipient } from './conversation.service';
import { MessageListRequest } from '../payloads/message-list.payload';
import { Message } from '../schemas';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private readonly MessageModel: Model<Message>,
    private readonly queueEventService: QueueEventService,
    private readonly fileService: FileService,
    private readonly conversationService: ConversationService,
    private readonly userService: UserService,
    private readonly performerService: PerformerService
  ) { }

  public async createPrivateMessage(
    conversationId: string | ObjectId,
    payload: MessageCreatePayload,
    sender: IRecipient
  ): Promise<MessageDto> {
    const conversation = await this.conversationService.findById(
      conversationId
    );
    if (!conversation) {
      throw new EntityNotFoundException();
    }
    const found = conversation.recipients.find(
      (recipient) => recipient.sourceId.toString() === sender.sourceId.toString()
    );
    if (!found) {
      throw new EntityNotFoundException();
    }
    const message = await this.MessageModel.create({
      ...payload,
      senderId: sender.sourceId,
      senderSource: sender.source,
      conversationId: conversation._id
    });
    const dto = MessageDto.fromModel(message);
    await this.queueEventService.publish({
      channel: MESSAGE_CHANNEL,
      eventName: MESSAGE_EVENT.CREATED,
      data: dto
    });
    return dto;
  }

  public async createPrivateFileMessage(
    sender: IRecipient,
    recipient: IRecipient,
    file: FileDto,
    payload: MessageCreatePayload
  ): Promise<MessageDto> {
    const conversation = await this.conversationService.createPrivateConversation(
      sender,
      recipient
    );
    if (!file) throw new HttpException('File is valid!', 400);
    if (!file.isImage()) {
      await this.fileService.removeIfNotHaveRef(file._id);
      throw new HttpException('Invalid image!', 400);
    }
    const message = await this.MessageModel.create({
      ...payload,
      type: MESSAGE_TYPE.PHOTO,
      senderId: sender.sourceId,
      fileId: file._id,
      senderSource: sender.source,
      conversationId: conversation._id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await this.fileService.addRef(file._id, {
      itemType: REF_TYPE.MESSAGE,
      itemId: message._id
    });
    const dto = MessageDto.fromModel(message);
    dto.imageUrl = file.getUrl();
    await this.queueEventService.publish({
      channel: MESSAGE_CHANNEL,
      eventName: MESSAGE_EVENT.CREATED,
      data: dto
    });
    return dto;
  }

  public async loadMessages(req: MessageListRequest, user: UserDto): Promise<PageableData<MessageDto>> {
    const conversation = await this.conversationService.findById(
      req.conversationId
    );
    if (!conversation) {
      throw new EntityNotFoundException();
    }

    const found = conversation.recipients.find(
      (recipient) => recipient.sourceId.toString() === user._id.toString()
    );
    if (!found) {
      throw new EntityNotFoundException();
    }

    const query = { conversationId: conversation._id };
    const [data, total] = await Promise.all([
      this.MessageModel
        .find(query)
        .sort({ createdAt: -1 })
        .lean()
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.MessageModel.countDocuments(query)
    ]);

    const fileIds = data.map((d) => d.fileId);
    const senderIds = uniq(data.map((d) => d.senderId));
    const files = await this.fileService.findByIds(fileIds);
    const senders = await Promise.all([
      this.userService.findByIds(senderIds),
      this.performerService.findByIds(senderIds)
    ]);
    const messages = data.map((m) => MessageDto.fromModel(m));
    messages.forEach((message) => {
      if (message.fileId) {
        const file = files.find(
          (f) => f._id.toString() === message.fileId.toString()
        );
        // eslint-disable-next-line no-param-reassign
        message.imageUrl = file ? file.getUrl() : null;
      }
      const senderInfo = message.senderSource === 'user'
        ? senders[0].find((u) => u._id.equals(message.senderId))
        : senders[1].find((p) => p._id.equals(message.senderId));
      message.setSenderInfo(senderInfo);
    });

    return {
      data: messages,
      total
    };
  }

  public async deleteMessage(messageId: string, user: UserDto): Promise<MessageDto> {
    const message = await this.MessageModel.findById(messageId);
    if (!message) {
      throw new EntityNotFoundException();
    }
    if (
      user.roles
      && !user.roles.includes('admin')
      && message.senderId.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException();
    }
    await message.deleteOne();
    if (message.type === MESSAGE_TYPE.PHOTO) {
      message.fileId && (await this.fileService.remove(message.fileId));
    }

    const dto = MessageDto.fromModel(message);

    await this.queueEventService.publish({
      channel: MESSAGE_CHANNEL,
      eventName: MESSAGE_EVENT.DELETED,
      data: dto
    });
    // Emit event to user
    await this.queueEventService.publish({
      channel: MESSAGE_PRIVATE_STREAM_CHANNEL,
      eventName: MESSAGE_EVENT.DELETED,
      data: dto
    });
    return dto;
  }

  public async deleteAllMessageInConversation(
    conversationId: string,
    user: any
  ) {
    const conversation = await this.conversationService.findById(
      conversationId
    );
    if (!conversation) {
      throw new EntityNotFoundException();
    }
    if (
      user.isPerformer
      && conversation.performerId.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException();
    }

    await this.MessageModel.deleteMany({ conversationId: conversation._id });
    return { success: true };
  }

  public async createPublicStreamMessageFromConversation(
    conversationId: string | ObjectId,
    payload: MessageCreatePayload,
    sender: IRecipient,
    user: UserDto
  ) {
    const conversation = await this.conversationService.findById(
      conversationId
    );
    if (!conversation) {
      throw new EntityNotFoundException();
    }

    const message = await this.MessageModel.create({
      ...payload,
      senderId: sender.sourceId,
      senderSource: sender.source,
      conversationId: conversation._id
    });
    await message.save();

    const dto = MessageDto.fromModel(message);
    dto.setSenderInfo(user);
    await this.queueEventService.publish({
      channel: MESSAGE_PRIVATE_STREAM_CHANNEL,
      eventName: MESSAGE_EVENT.CREATED,
      data: dto
    });
    return dto;
  }

  public async createStreamMessageFromConversation(
    conversationId: string | ObjectId,
    payload: MessageCreatePayload,
    sender: IRecipient
  ) {
    const conversation = await this.conversationService.findById(
      conversationId
    );
    if (!conversation) {
      throw new EntityNotFoundException();
    }

    const found = conversation.recipients.find(
      (recipient) => recipient.sourceId.toString() === sender.sourceId.toString()
    );
    if (!found) {
      throw new EntityNotFoundException();
    }

    const message = await this.MessageModel.create({
      ...payload,
      senderId: sender.sourceId,
      senderSource: sender.source,
      conversationId: conversation._id
    });
    await message.save();

    const dto = MessageDto.fromModel(message);
    await this.queueEventService.publish({
      channel: MESSAGE_PRIVATE_STREAM_CHANNEL,
      eventName: MESSAGE_EVENT.CREATED,
      data: dto
    });
    return dto;
  }

  public async loadPublicMessages(req: MessageListRequest) {
    const conversation = await this.conversationService.findById(
      req.conversationId
    );
    if (!conversation) {
      throw new EntityNotFoundException();
    }

    // check this for private as well
    if (conversation.type === CONVERSATION_TYPE.PRIVATE) {
      throw new ForbiddenException();
    }

    const sort = {
      [req.sortBy || 'updatedAt']: req.sort
    };

    const query = { conversationId: conversation._id };
    const [data, total] = await Promise.all([
      this.MessageModel
        .find(query)
        .sort(sort)
        .lean()
        .limit(Number(req.limit))
        .skip(Number(req.offset)),
      this.MessageModel.countDocuments(query)
    ]);

    const senderIds = uniq(data.map((d) => d.senderId));
    const [users, performers] = await Promise.all([
      senderIds.length ? this.userService.findByIds(senderIds) : [],
      senderIds.length ? this.performerService.findByIds(senderIds) : []
    ]);

    const messages = data.map((message) => {
      const dto = MessageDto.fromModel(message);
      let user = null;
      user = users.find((u) => u._id.toString() === message.senderId.toString());
      if (!user) {
        user = performers.find(
          (p) => p._id.toString() === message.senderId.toString()
        );
      }

      dto.setSenderInfo(user);
      return dto;
    });

    return {
      data: messages,
      total
    };
  }

  public async resetAllDataInConversation(conversationId) {
    await this.MessageModel.deleteMany({ conversationId });
  }
}
