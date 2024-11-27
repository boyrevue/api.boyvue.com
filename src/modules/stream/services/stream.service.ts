import {
  Injectable,
  Inject,
  forwardRef,
  ForbiddenException,
  HttpException
} from '@nestjs/common';
import { PerformerService } from 'src/modules/performer/services';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { EntityNotFoundException } from 'src/kernel';
import { v4 as uuidv4 } from 'uuid';
import { ConversationService } from 'src/modules/message/services';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import { UserDto } from 'src/modules/user/dtos';
import { flatten, uniqBy } from 'lodash';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { UserService } from 'src/modules/user/services';
import { toObjectId } from 'src/kernel/helpers/string.helper';
import { InjectModel } from '@nestjs/mongoose';
import { RequestService } from './request.service';
import { SocketUserService } from '../../socket/services/socket-user.service';
import {
  PRIVATE_CHAT,
  PUBLIC_CHAT,
  defaultStreamValue,
  BroadcastType
} from '../constant';
import { StreamDto } from '../dtos';
import {
  StreamOfflineException,
  StreamServerErrorException
} from '../exceptions';
import { TokenNotEnoughtException } from '../exceptions/token-not-enought';
import { Stream } from '../schemas';

export const REDIS_PERFORMER_PUBLIC_STREAM = 'performer_public_streams';
export const REDIS_PERFORMER_PRIVATE_STREAM = 'performer_private_streams';

@Injectable()
export class StreamService {
  constructor(
    @InjectModel(Stream.name) private readonly StreamModel: Model<Stream>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    private readonly conversationService: ConversationService,
    private readonly socketUserService: SocketUserService,
    private readonly subscriptionService: SubscriptionService,
    private readonly requestService: RequestService,
    private readonly redisService: RedisService
  ) {
    this.resetPerformerLivestreamList();
  }

  public async findById(id: string | ObjectId): Promise<StreamDto> {
    const stream = await this.StreamModel.findOne({ _id: id });
    if (!stream) return null;
    return StreamDto.fromModel(stream);
  }

  public async findBySessionId(sessionId: string): Promise<StreamDto> {
    const stream = await this.StreamModel.findOne({ sessionId });
    if (!stream) return null;

    if (!stream) return null;
    return StreamDto.fromModel(stream);
  }

  public async findByPerformerId(
    performerId: string | ObjectId,
    payload?: Partial<StreamDto>
  ): Promise<StreamDto> {
    const stream = await this.StreamModel.findOne({ performerId, ...payload });
    if (!stream) return null;
    return StreamDto.fromModel(stream);
  }

  public async getSessionId(
    performerId: string | ObjectId,
    type: string
  ): Promise<string> {
    let stream = await this.StreamModel.findOne({ performerId, type });
    if (!stream) {
      const data = {
        sessionId: uuidv4(),
        performerId,
        type
      };
      stream = await this.StreamModel.create(data);
    }

    return stream.sessionId;
  }

  public async goLive(performerId: ObjectId) {
    let stream = await this.StreamModel.findOne({
      performerId,
      type: PUBLIC_CHAT
    });
    if (!stream) {
      const data = {
        sessionId: uuidv4(),
        performerId,
        type: PUBLIC_CHAT
      };
      stream = await this.StreamModel.create(data);
    }

    let conversation = await this.conversationService.findOne({
      type: 'stream_public',
      performerId
    });
    if (!conversation) {
      conversation = await this.conversationService.createStreamConversation(
        StreamDto.fromModel(stream)
      );
    }

    const data = {
      ...defaultStreamValue,
      streamId: stream._id,
      name: stream._id,
      description: '',
      type: BroadcastType.LiveStream,
      status: 'finished'
    };
    const result = await this.requestService.create(data);
    if (result.status) {
      throw new StreamServerErrorException({
        message: result.data?.data?.message,
        error: result.data,
        status: result.data?.status
      });
    }
    return { conversation, sessionId: stream._id };
  }

  public async joinPublicChat(performerId: string | ObjectId) {
    const stream = await this.StreamModel.findOne({
      performerId,
      type: PUBLIC_CHAT
    });
    if (!stream) {
      throw new EntityNotFoundException();
    }

    if (!stream.isStreaming) {
      throw new StreamOfflineException();
    }

    return { sessionId: stream._id };
  }

  public async requestPrivateChat(
    user: UserDto,
    performerId: string | ObjectId
  ) {
    const performer = await this.performerService.findById(performerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }

    const subscribed = await this.subscriptionService.checkSubscribed(
      performerId,
      user._id
    );
    if (!subscribed) {
      throw new HttpException('Please subscribe model to send private request', 403);
    }

    if (user.balance < performer.privateChatPrice) {
      throw new TokenNotEnoughtException();
    }

    const isOnline = await this.socketUserService.isOnline(performer._id);
    if (!isOnline) {
      throw new HttpException(`${performer.username} is offline`, 400);
    }

    if (performer.streamingStatus === 'private') {
      throw new HttpException(`${performer.username} is streaming privately, please connect after some time`, 400);
    }

    const data = {
      sessionId: uuidv4(),
      performerId,
      userIds: [user._id],
      type: PRIVATE_CHAT,
      isStreaming: true,
      waiting: true
    };
    const stream = await this.StreamModel.create(data);
    const recipients = [
      { source: 'performer', sourceId: new ObjectId(performerId) },
      { source: 'user', sourceId: user._id }
    ];
    const conversation = await this.conversationService.createStreamConversation(
      StreamDto.fromModel(stream),
      recipients
    );

    const {
      username, email, avatar, _id, balance
    } = user;
    await this.socketUserService.emitToUsers(
      performerId,
      'private-chat-request',
      {
        user: {
          username, email, avatar, _id, balance
        },
        streamId: stream._id,
        conversationId: conversation._id,
        createdAt: new Date()
      }
    );

    return { conversation, sessionId: stream.sessionId };
  }

  public async accpetPrivateChat(id: string, performerId: ObjectId, username?: string) {
    const conversation = await this.conversationService.findById(id);
    if (!conversation) {
      throw new EntityNotFoundException();
    }

    const recipent = conversation.recipients.find(
      (r) => r.sourceId.toString() === performerId.toString()
        && r.source === 'performer'
    );
    if (!recipent) {
      throw new ForbiddenException();
    }

    const stream = await this.findById(conversation.streamId);
    if (!stream && stream.performerId !== performerId) {
      throw new EntityNotFoundException();
    }

    if (!stream.isStreaming) {
      throw new StreamOfflineException();
    }

    const waitingSteams = await this.StreamModel.find({
      performerId: toObjectId(performerId),
      type: PRIVATE_CHAT,
      waiting: true,
      _id: { $ne: stream._id }
    });

    const userIds = uniqBy(flatten(waitingSteams.map((item) => item.userIds)), (item) => item.toString()).filter((userId) => `${userId}` !== `${performerId}`);

    await this.socketUserService.emitToUsers(userIds, 'notify_and_redirect', {
      text: `${username} is streaming privately. Please connect after some time.`,
      href: '/'
    });

    await this.StreamModel.updateMany({
      performerId: toObjectId(performerId),
      type: PRIVATE_CHAT,
      waiting: true
    }, { $set: { waiting: false } });

    // stream.waiting = false;
    // await stream.save();

    return { conversation, sessionId: stream.sessionId };
  }

  public async getPrivateChat(performerId: string) {
    const streamStarted = await this.StreamModel.findOne({
      performerId,
      isStreaming: true,
      type: 'private'
    });

    if (streamStarted) {
      return false;
    }

    return true;
  }

  /**
   * Stream secure
   * https://antmedia.io/docs/guides/developer-sdk-and-api/rest-api-guide/stream-security/#1-enabledisable-accepting-undefined-streams
   * @param type
   * @param streamId
   * @param expireDate
   * @returns tokenid
   */
  public async getToken() {
    return '';
  }

  public async addPerformerLivestreamList(performerId: string | ObjectId, publicOrPrivate = 'public') {
    const room = publicOrPrivate === 'public' ? REDIS_PERFORMER_PUBLIC_STREAM : REDIS_PERFORMER_PRIVATE_STREAM;
    const redisClient = this.redisService.getClient();
    await redisClient.sadd(room, performerId.toString());
  }

  public async removePerformerLivestreamList(performerId) {
    const redisClient = this.redisService.getClient();
    await Promise.all([
      redisClient.srem(REDIS_PERFORMER_PRIVATE_STREAM, performerId.toString()),
      redisClient.srem(REDIS_PERFORMER_PUBLIC_STREAM, performerId.toString())
    ]);
  }

  // apply single instance only!!
  public async resetPerformerLivestreamList() {
    const redisClient = this.redisService.getClient();
    await Promise.all([
      redisClient.del(REDIS_PERFORMER_PRIVATE_STREAM),
      redisClient.del(REDIS_PERFORMER_PUBLIC_STREAM)
    ]);
  }

  public async checkPerformerStreaming(performerId) {
    const redisClient = this.redisService.getClient();
    const [hasPublic, hasPrivate] = await Promise.all([
      redisClient.sismember(REDIS_PERFORMER_PUBLIC_STREAM, performerId.toString()),
      redisClient.sismember(REDIS_PERFORMER_PRIVATE_STREAM, performerId.toString())
    ]);

    if (hasPublic) return 'public';
    if (hasPrivate) return 'private';
    return null;
  }

  public async getAvailablePrivateStreamRequestsForPerformer(performerId: string | ObjectId | any) {
    const streams = await this.StreamModel.find({
      performerId,
      type: PRIVATE_CHAT,
      waiting: true
    });

    if (!streams.length) return [];
    const streamIds = streams.map((s) => s._id);

    const userIds = streams.reduce((res, stream) => {
      const results = [...res];
      if (stream.userIds?.length) {
        results.push(
          ...(stream.userIds as Array<any>).filter((id) => id.toString() !== performerId.toString())
        );
      }
      return results;
    }, []);
    if (!userIds.length) return [];
    const users = await this.userService.findByIds(userIds);

    const conversations = await this.conversationService.getConversationsByStreamIds(streamIds);

    return streams.reduce((res, stream) => {
      const results = res;
      if (!stream.userIds?.length) return results;
      const userId = (stream.userIds as Array<any>).find((id) => id.toString() !== performerId.toString());
      const user = users.find((u) => u._id.toString() === userId.toString());
      const conversation = conversations.find((c) => c.streamId.toString() === stream._id.toString());

      const obj = {
        performerId,
        type: PRIVATE_CHAT,
        createdAt: stream.createdAt,
        updatedA: stream.updatedAt,
        requester: new UserDto(user).toResponse(),
        conversationId: conversation._id,
        streamId: stream._id
      };
      results.push(obj);
      return results;
    }, []);
  }

  public async rejectAvailablePrivateStreamRequestsForPerformer(streamId: string | ObjectId, current: UserDto) {
    const stream = await this.StreamModel.findById(streamId);
    if (!streamId) throw new EntityNotFoundException();

    if (stream.performerId.toString() !== current._id.toString()) throw new ForbiddenException();

    stream.waiting = false;
    await stream.save();
    return {
      success: true
    };
  }

  public async updateStreamStatus(id: string | ObjectId | any, isStreaming: boolean, lastStreamingTime = new Date()) {
    await this.StreamModel.updateOne({ _id: id }, {
      $set: {
        isStreaming,
        lastStreamingTime
      }
    });
  }

  public async pushStreamId(id: string | ObjectId | any, streamId: string) {
    await this.StreamModel.updateOne({ _id: id }, {
      $addToSet: {
        streamIds: streamId
      }
    });
  }

  public async updateByQuery(id: string | ObjectId | any, query: Record<string, any>) {
    await this.StreamModel.updateOne({ _id: id }, query);
  }
}
