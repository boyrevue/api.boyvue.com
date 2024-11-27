import { MessageBody, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from 'src/modules/auth/services';
import { StreamService } from 'src/modules/stream/services';
import {
  LIVE_STREAM_EVENT_NAME, MODEL_LIVE_STREAM_CHANNEL, OFFLINE, PUBLIC_CHAT
} from 'src/modules/stream/constant';
import { SocketUserService } from 'src/modules/socket/services/socket-user.service';
import { UserService } from 'src/modules/user/services';
import { UserDto } from 'src/modules/user/dtos';
import * as moment from 'moment';
import { PerformerService } from 'src/modules/performer/services';
import { ConversationService, MessageService } from 'src/modules/message/services';
import { QueueEvent, QueueEventService } from 'src/kernel';
import { DBLoggerService } from 'src/modules/logger';

@WebSocketGateway()
export class PublicStreamWsGateway {
  constructor(
    private readonly authService: AuthService,
    private readonly streamService: StreamService,
    private readonly socketService: SocketUserService,
    private readonly userService: UserService,
    private readonly performerService: PerformerService,
    private readonly conversationService: ConversationService,
    private readonly queueEventService: QueueEventService,
    private readonly messageService: MessageService,
    private readonly logger: DBLoggerService
  ) { }

  @SubscribeMessage('public-stream/live')
  async goLive(client: Socket, payload: { conversationId: string }) {
    try {
      const { conversationId } = payload;
      if (!conversationId) {
        return;
      }

      const conversation = await this.conversationService.findById(
        conversationId
      );
      if (!conversation) return;

      const { token } = client.handshake.query;
      if (!token) return;

      const user = await this.authService.getSourceFromJWT(token);
      if (!user) return;

      const roomName = conversation.getRoomName();
      this.socketService.emitToRoom(roomName, 'join-broadcaster', {
        performerId: user._id,
        conversationId
      });

      await Promise.all([
        this.performerService.goLive(user._id),
        this.performerService.setStreamingStatus(user._id, PUBLIC_CHAT),
        this.streamService.updateByQuery(conversation.streamId, { $set: { isStreaming: true } }),
        this.queueEventService.publish(
          new QueueEvent({
            channel: MODEL_LIVE_STREAM_CHANNEL,
            eventName: LIVE_STREAM_EVENT_NAME.PUBLIC_STREAM_STARTED,
            data: {
              performer: new UserDto(user)
            }
          })
        ),
        this.streamService.addPerformerLivestreamList(user._id, 'public')
      ]);
    } catch (e) {
      this.logger.error(e.stack || e, { context: 'goLive' });
    }
  }

  @SubscribeMessage('public-stream/join')
  async handleJoinPublicRoom(
    client: Socket,
    payload: { conversationId: string }
  ): Promise<void> {
    try {
      const { token } = client.handshake.query;
      const { conversationId } = payload;
      if (!conversationId) {
        return;
      }
      const conversation = conversationId
        && (await this.conversationService.findById(conversationId));
      if (!conversation) {
        return;
      }

      const { performerId } = conversation;
      const decodded = token && (await this.authService.verifyJWT(token));
      let user: any;
      if (decodded && decodded.source === 'user') {
        user = await this.userService.findById(decodded.sourceId);
      }
      if (decodded && decodded.source === 'performer') {
        user = await this.performerService.findById(decodded.sourceId);
      }
      const roomName = conversation.getRoomName();
      client.join(roomName);
      let role = 'guest';
      if (user) {
        role = conversation.performerId.equals(user._id) ? 'model' : 'member';
        await this.socketService.emitToRoom(
          roomName,
          `message_created_conversation_${conversation._id}`,
          {
            text: `${user.username} has joined this conversation`,
            _id: conversation._id,
            conversationId,
            isSystem: true
          }
        );
      }

      await this.socketService.addConnectionToRoom(
        roomName,
        user ? user._id : client.id,
        role
      );
      const connections = await this.socketService.getRoomUserConnections(
        roomName
      );
      const memberIds: string[] = [];
      Object.keys(connections).forEach((id) => {
        const value = connections[id].split(',');
        if (value[0] === 'member') {
          memberIds.push(id);
        }
      });

      if (memberIds.length && role === 'model') {
        await this.socketService.emitToUsers(memberIds, 'model-joined', {
          conversationId
        });
      }

      const members = (memberIds.length && (await this.userService.findByIds(memberIds)))
        || [];
      const data = {
        conversationId,
        total: members.length,
        members: members.map((m) => new UserDto(m).toResponse())
      };
      this.socketService.emitToRoom(roomName, 'public-room-changed', data);

      const stream = await this.streamService.findByPerformerId(performerId, {
        type: PUBLIC_CHAT
      });
      if (!stream) return;

      if (stream.isStreaming) {
        this.socketService.emitToUsers(user._id || client.id, 'join-broadcaster', {
          performerId,
          conversationId
        });
      }
    } catch (e) {
      this.logger.error(e.stack || e, { context: 'handleJoinPublicRoom' });
    }
  }

  @SubscribeMessage('public-stream/leave')
  async handleLeavePublicRoom(
    client: Socket,
    payload: { conversationId: string }
  ): Promise<void> {
    try {
      const { token } = client.handshake.query;
      const { conversationId } = payload;
      if (!conversationId) {
        return;
      }
      const conversation = payload.conversationId
        && (await this.conversationService.findById(conversationId));
      if (!conversation) {
        return;
      }

      const { performerId } = conversation;
      const [user] = await Promise.all([
        token && this.authService.getSourceFromJWT(token)
      ]);
      const roomName = conversation.getRoomName();
      client.leave(roomName);

      const stream = await this.streamService.findById(conversation.streamId);
      if (!stream) return;

      if (user) {
        await this.socketService.emitToRoom(
          roomName,
          `message_created_conversation_${payload.conversationId}`,
          {
            text: `${user.username} has left this conversation`,
            _id: payload.conversationId,
            conversationId,
            isSystem: true
          }
        );
        const results = await this.socketService.getConnectionValue(
          roomName,
          user._id
        );
        if (results) {
          const values = results.split(',');
          const timeJoined = values[1] ? parseInt(values[1], 10) : null;
          const role = values[0];
          if (timeJoined) {
            const streamTime = moment()
              .toDate()
              .getTime() - timeJoined;
            if (role === 'model') {
              await this.performerService.updateLastStreamingTime(
                user._id,
                streamTime
              );
              await this.streamService.updateByQuery(stream._id, { $set: { lastStreamingTime: new Date(), isStreaming: false } });
              await this.socketService.emitToRoom(roomName, 'model-left', {
                performerId,
                conversationId
              });
              await this.performerService.setStreamingStatus(user._id, OFFLINE);
              await this.streamService.removePerformerLivestreamList(user._id);
              // Remove all message stream chat when model end season stream
              await this.messageService.resetAllDataInConversation(conversation._id);
            } else if (role === 'member') {
              await this.userService.updateStats(user._id, {
                'stats.totalViewTime': streamTime
              });
            }
          }
        }
      }

      await this.socketService.removeConnectionFromRoom(
        roomName,
        user ? user._id : client.id
      );

      const connections = await this.socketService.getRoomUserConnections(
        roomName
      );
      const memberIds: string[] = [];
      Object.keys(connections).forEach((id) => {
        const value = connections[id].split(',');
        if (value[0] === 'member') {
          memberIds.push(id);
        }
      });
      const members = await this.userService.findByIds(memberIds);
      const data = {
        conversationId,
        total: members.length,
        members: members.map((m) => new UserDto(m).toResponse())
      };
      await this.socketService.emitToRoom(
        roomName,
        'public-room-changed',
        data
      );
    } catch (e) {
      // TODO - log me
    }
  }

  @SubscribeMessage('check-streaming')
  async checkPerformerStream(
    @MessageBody() data: any
  ) {
    if (!data?.performerId) return;

    const status = await this.streamService.checkPerformerStreaming(data.performerId);
    // eslint-disable-next-line consistent-return
    return { status };
  }
}
