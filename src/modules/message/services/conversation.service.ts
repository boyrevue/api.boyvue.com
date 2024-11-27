import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { toObjectId } from 'src/kernel/helpers/string.helper';
import { UserSearchService, UserService } from 'src/modules/user/services';
import { PerformerService, PerformerSearchService } from 'src/modules/performer/services';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import { UserDto } from 'src/modules/user/dtos';
import { StreamDto } from 'src/modules/stream/dtos';
import { PerformerSearchPayload } from 'src/modules/performer/payloads';
import { UserSearchRequestPayload } from 'src/modules/user/payloads';
import { EntityNotFoundException, ForbiddenException } from 'src/kernel';
import { PerformerBlockService } from 'src/modules/block/services';
import { InjectModel } from '@nestjs/mongoose';
import { ConversationSearchPayload } from '../payloads';
import { ConversationDto } from '../dtos';
import { CONVERSATION_TYPE } from '../constants';
import { Conversation, NotificationMessage } from '../schemas';

export interface IRecipient {
  source: string;
  sourceId: ObjectId | any;
}

@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Conversation.name) private readonly ConversationModel: Model<Conversation>,
    @InjectModel(NotificationMessage.name) private readonly NotificationMessageModel: Model<NotificationMessage>,
    private readonly userService: UserService,
    private readonly userSearchService: UserSearchService,
    private readonly performerService: PerformerService,
    private readonly performerSearchService: PerformerSearchService,
    private readonly subscriptionService: SubscriptionService,
    private readonly performerBlockService: PerformerBlockService
  ) { }

  public async findOne(params: Record<string, any>): Promise<ConversationDto> {
    const item = await this.ConversationModel.findOne(params);
    return ConversationDto.fromModel(item);
  }

  public async createStreamConversation(stream: StreamDto, recipients?: any): Promise<ConversationDto> {
    const item = await this.ConversationModel.create({
      streamId: stream._id,
      performerId: stream.performerId && toObjectId(stream.performerId),
      recipients: recipients || [],
      name: `stream_${stream.type}_performerId_${stream.performerId}`,
      type: `stream_${stream.type}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return ConversationDto.fromModel(item);
  }

  public async createPrivateConversation(
    sender: IRecipient,
    receiver: IRecipient
  ): Promise<ConversationDto> {
    let conversation = await this.ConversationModel
      .findOne({
        type: CONVERSATION_TYPE.PRIVATE,
        recipients: {
          $all: [
            {
              source: sender.source,
              sourceId: toObjectId(sender.sourceId)
            },
            {
              source: receiver.source,
              sourceId: receiver.sourceId
            }
          ]
        }
      })
      .exec();
    if (!conversation) {
      conversation = await this.ConversationModel.create({
        type: CONVERSATION_TYPE.PRIVATE,
        recipients: [sender, receiver],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    const dto = ConversationDto.fromModel(conversation);
    dto.totalNotSeenMessages = 0;
    if (receiver.source === 'performer') {
      const per = await this.performerService.findById(receiver.sourceId);
      if (per) {
        dto.recipientInfo = per.toResponse(false);
        const subscribed = await this.subscriptionService.checkSubscribed(
          per._id,
          sender.sourceId
        );
        dto.isSubscribed = !!subscribed;
      }
    }
    if (receiver.source === 'user') {
      dto.isSubscribed = true;
      const user = await this.userService.findById(receiver.sourceId);
      if (user) dto.recipientInfo = user.toResponse(false);
    }
    return dto;
  }

  public async getList(
    req: ConversationSearchPayload,
    sender: IRecipient,
    countryCode?: string
  ): Promise<any> {
    let query: Record<string, any> = {
      recipients: {
        $elemMatch: {
          source: sender.source,
          sourceId: toObjectId(sender.sourceId)
        }
      }
    };
    // must be the first
    if (req.keyword) {
      let usersSearch = null;
      if (sender.source === 'user') {
        // TODO - this solution isn't good, shoul recheck and refactor me
        usersSearch = await this.performerSearchService.searchByKeyword({ q: req.keyword } as PerformerSearchPayload);
      }
      if (sender.source === 'performer') {
        // TODO - this solution isn't good, shoul recheck and refactor me
        usersSearch = await this.userSearchService.searchByKeyword({ q: req.keyword } as UserSearchRequestPayload);
      }
      const Ids = usersSearch ? usersSearch.map((u) => u._id) : [];
      query = {
        $and: [{
          recipients: {
            $elemMatch: {
              source: sender.source === 'user' ? 'performer' : 'user',
              sourceId: { $in: Ids }
            }
          }
        },
        {
          recipients: {
            $elemMatch: {
              source: sender.source,
              sourceId: toObjectId(sender.sourceId)
            }
          }
        }]
      };
    }

    if (req.type) {
      query.type = req.type;
    }

    const [data, total] = await Promise.all([
      this.ConversationModel
        .find(query)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset))
        .sort({
          isPinned: -1, pinnedAt: -1, lastMessageCreatedAt: -1, updatedAt: -1
        }),
      this.ConversationModel.countDocuments(query)
    ]);

    const conversations = data.map((d) => ConversationDto.fromModel(d));
    const recipientIds = conversations.reduce((results, c) => {
      const re = c.recipients.find(
        (rep) => rep.sourceId.toString() !== sender.sourceId.toString()
      );
      if (re) {
        results.push(re.sourceId);
      }
      return results;
    }, []);
    const conversationIds = data.map((d) => d._id);
    let subscriptions = [];
    let blockedUsers = null;
    let blockCountries = [];
    const [notifications] = await Promise.all([
      this.NotificationMessageModel.find({
        conversationId: { $in: conversationIds },
        recipientId: sender.sourceId
      })
    ]);
    const recipients = (sender.source === 'user'
      ? await this.performerService.findByIds(recipientIds)
      : await this.userService.findByIds(recipientIds)) || [];
    if (sender.source === 'user') {
      if (recipients) {
        const pIds = recipients.map((p) => p._id);
        subscriptions = await this.subscriptionService.findSubscriptionList({
          performerId: { $in: pIds },
          userId: sender.sourceId,
          expiredAt: { $gt: new Date() }
        });
        blockCountries = await this.performerBlockService.findBlockCountriesByQuery({ sourceId: { $in: pIds } });
        blockedUsers = await this.performerBlockService.listByQuery({ sourceId: { $in: pIds }, targetId: sender.sourceId });
      }
    }

    conversations.forEach((conversation: ConversationDto) => {
      const recipient = conversation.recipients.find((rep) => `${rep.sourceId}` !== `${sender.sourceId}`);
      if (recipient) {
        conversation.setIsSubscribed(sender.source === 'performer');
        const recipientInfo = recipients.find((r) => `${r._id}` === `${recipient.sourceId}`);
        if (recipientInfo) {
          conversation.setRecipientInfo(recipientInfo);
          if (sender.source === 'user') {
            let isBlocked = false;
            if (blockedUsers.length) {
              const isBlockedUser = blockedUsers.find((s) => `${s.sourceId}` === `${recipient.sourceId}`);
              isBlocked = !!isBlockedUser;
            }
            if (countryCode && !isBlocked) {
              const isBlockeCountry = blockCountries.find((b) => `${b.sourceId}` === `${recipient.sourceId}` && b.countryCodes.includes(countryCode));
              isBlocked = !!isBlockeCountry;
            }
            const isSubscribed = subscriptions.find((s) => `${s.performerId}` === `${recipientInfo._id}`);
            conversation.setIsSubscribed(!!isSubscribed);
            conversation.setIsBlocked(!!isBlocked);
          }
        }

        conversation.setTotalNotSeenMessage(0);
        if (notifications.length) {
          const conversationNotifications = notifications.find(
            (n) => n.conversationId.toString() === conversation._id.toString()
          );
          conversation.setTotalNotSeenMessage(conversationNotifications?.totalNotReadMessage || 0);
        }
      }
    });

    return {
      data: conversations,
      total
    };
  }

  public async findById(id: string | ObjectId): Promise<ConversationDto> {
    const conversation = await this.ConversationModel.findById(id);
    return ConversationDto.fromModel(conversation);
  }

  public async findByIds(ids: string[] | ObjectId[]): Promise<ConversationDto[]> {
    const conversations = await this.ConversationModel
      .find({
        _id: {
          $in: ids
        }
      });
    return conversations.map((c) => ConversationDto.fromModel(c));
  }

  public async findDetail(id: string | ObjectId, sender: IRecipient): Promise<ConversationDto> {
    const conversation = await this.ConversationModel.findOne({ _id: id });
    if (!conversation) {
      throw new EntityNotFoundException();
    }

    // array reduce
    const recipientIds = conversation.recipients.filter((r) => sender.source !== r.source).map((r) => r.sourceId);
    let recipients = [];
    if (recipientIds.length && sender.source === 'user') {
      recipients = await this.performerService.findByIds(recipientIds);
    }
    if (recipientIds.length && sender.source === 'performer') {
      recipients = await this.userService.findByIds(recipientIds);
    }
    const dto = ConversationDto.fromModel(conversation);
    if (recipients.length) {
      dto.setRecipientInfo(recipients[0]);
    }
    return dto;
  }

  public async addRecipient(
    conversationId: string | ObjectId,
    recipient: IRecipient
  ) {
    return this.ConversationModel.updateOne({ _id: conversationId }, { $addToSet: { recipients: recipient } });
  }

  public async findPerformerPublicConversation(performerId: string | ObjectId) {
    return this.ConversationModel
      .findOne({
        type: `stream_${CONVERSATION_TYPE.PUBLIC}`,
        performerId
      })
      .lean()
      .exec();
  }

  public async getPrivateConversationByStreamId(streamId: string | ObjectId) {
    const conversation = await this.ConversationModel.findOne({ streamId });
    if (!conversation) {
      throw new EntityNotFoundException();
    }
    return ConversationDto.fromModel(conversation);
  }

  public async pinToTop(id: string, user: UserDto) {
    const conversation = await this.ConversationModel.findById(id);
    if (!conversation) throw new EntityNotFoundException();
    if (!conversation.recipients.find((r) => `${r.sourceId}` === `${user._id}`)) {
      throw new ForbiddenException();
    }
    if (conversation.isPinned) {
      await this.ConversationModel.updateOne({ _id: conversation._id }, { isPinned: false, pinnedAt: null });
      return true;
    }

    await this.ConversationModel.updateOne({ _id: conversation._id }, { isPinned: true, pinnedAt: new Date() });
    return true;
  }

  public async unpinToProfile(id: string, user: UserDto) {
    const conversation = await this.ConversationModel.findById(id);
    if (!conversation) throw new EntityNotFoundException();
    if (!conversation.recipients.find((r) => `${r.sourceId}` === `${user._id}`)) {
      throw new ForbiddenException();
    }
    if (!conversation.isPinned) return true;
    await this.ConversationModel.updateOne({ _id: conversation._id }, { isPinned: false, pinnedAt: null });
    return true;
  }

  public async getConversationsByStreamIds(streamIds): Promise<ConversationDto[]> {
    const conversations = await this.ConversationModel
      .find({
        streamId: {
          $in: streamIds
        }
      })
      .exec();
    return conversations.map((c) => ConversationDto.fromModel(c));
  }
}
