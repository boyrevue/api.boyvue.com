import { Injectable } from '@nestjs/common';
import { QueueEvent, QueueEventService } from 'src/kernel';
import { Model } from 'mongoose';
import { SocketUserService } from 'src/modules/socket/services/socket-user.service';
import {
  MEMBER_LIVE_STREAM_CHANNEL,
  MODEL_LIVE_STREAM_CHANNEL,
  LIVE_STREAM_EVENT_NAME
} from 'src/modules/stream/constant';
import { UserService } from 'src/modules/user/services';
import { PerformerService } from 'src/modules/performer/services';
import { InjectModel } from '@nestjs/mongoose';
import { Stream } from '../schemas';

const USER_LIVE_STREAM_DISCONNECTED = 'USER_LIVE_STREAM_CONNECTED';
const MODEL_LIVE_STREAM_DISCONNECTED = 'MODEL_LIVE_STREAM_CONNECTED';

@Injectable()
export class StreamConnectListener {
  constructor(
    @InjectModel(Stream.name) private readonly StreamModel: Model<Stream>,
    private readonly queueEventService: QueueEventService,
    private readonly userService: UserService,
    private readonly performerService: PerformerService,
    private readonly socketUserService: SocketUserService
  ) {
    this.queueEventService.subscribe(
      MEMBER_LIVE_STREAM_CHANNEL,
      USER_LIVE_STREAM_DISCONNECTED,
      this.userDisconnectHandler.bind(this)
    );
    this.queueEventService.subscribe(
      MODEL_LIVE_STREAM_CHANNEL,
      MODEL_LIVE_STREAM_DISCONNECTED,
      this.modelDisconnectHandler.bind(this)
    );
  }

  async userDisconnectHandler(event: QueueEvent) {
    if (event.eventName !== LIVE_STREAM_EVENT_NAME.DISCONNECTED) {
      return;
    }

    const sourceId = event.data;
    const user = await this.userService.findById(sourceId);
    if (!user) {
      return;
    }

    // update status for private stream
    // TODO - recheck this one, we should not allow user to be online in many tab?
    const isOnline = await this.socketUserService.isOnline(sourceId);
    if (!isOnline) {
      await this.StreamModel.updateMany(
        {
          waiting: true,
          userIds: user._id
        },
        {
          $set: {
            isStreaming: false,
            waiting: false
          }
        }
      );
    }

    const connectedRedisRooms = await this.socketUserService.userGetAllConnectedRooms(
      sourceId
    );

    if (!connectedRedisRooms.length) {
      return;
    }

    await Promise.all(
      connectedRedisRooms.map((id) => this.socketUserService.removeConnectionFromRoom(id, sourceId))
    );

    const conversationIds = connectedRedisRooms.map((id) => this.deserializeConversationId(id));
    await Promise.all(
      connectedRedisRooms.map(
        (id, index) => conversationIds[index]
          && this.socketUserService.emitToRoom(
            id,
            `message_created_conversation_${conversationIds[index]}`,
            {
              text: `${user.username} has left this conversation`,
              _id: conversationIds[index],
              conversationId: conversationIds[index],
              isSystem: true
            }
          )
      )
    );
  }

  async modelDisconnectHandler(event: QueueEvent) {
    if (event.eventName !== LIVE_STREAM_EVENT_NAME.DISCONNECTED) {
      return;
    }

    const sourceId = event.data;
    const model = await this.performerService.findById(sourceId);
    if (!model) {
      return;
    }

    const connectedRedisRooms = await this.socketUserService.userGetAllConnectedRooms(
      sourceId
    );

    if (!connectedRedisRooms.length) {
      return;
    }

    await Promise.all(
      connectedRedisRooms.map((r) => this.socketUserService.removeConnectionFromRoom(r, sourceId))
    );
    /**
     * To do
     * Update status
     */
    await this.StreamModel.updateMany(
      {
        isStreaming: true,
        performerId: model._id,
        type: { $ne: 'private' }
      },
      {
        $set: {
          isStreaming: false,
          lastStreamingTime: new Date(),
          waiting: false
        }
      }
    );
  }

  deserializeConversationId(str: string) {
    const strs = str.split('-');
    if (!strs.length) return '';

    return strs[strs.length - 1];
  }
}
