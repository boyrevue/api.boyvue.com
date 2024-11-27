import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { SocketUserService } from 'src/modules/socket/services/socket-user.service';
import { RequestService, StreamService } from 'src/modules/stream/services';
import { AuthService } from 'src/modules/auth';
import { ConversationService } from 'src/modules/message/services';
import { Socket, Server } from 'socket.io';
import { UserService } from 'src/modules/user/services';
import { UserDto } from 'src/modules/user/dtos';
import { MESSAGE_TYPE } from 'src/modules/message/constants';
import { PerformerService } from 'src/modules/performer/services';
import { DBLoggerService } from 'src/modules/logger';
import {
  GROUP_CHAT,
  PRIVATE_CHAT,
  defaultStreamValue,
  BroadcastType,
  OFFLINE
} from '../constant';

const JOINED_THE_ROOM = 'JOINED_THE_ROOM';
const MODEL_JOIN_ROOM = 'MODEL_JOIN_ROOM';
const MODEL_LEFT_ROOM = 'MODEL_LEFT_ROOM';
const JOIN_ROOM = 'JOIN_ROOM';
const LEAVE_ROOM = 'LEAVE_ROOM';

@WebSocketGateway()
export class StreamConversationWsGateway {
  @WebSocketServer() server: Server;

  constructor(
    private readonly socketUserService: SocketUserService,
    private readonly authService: AuthService,
    private readonly conversationService: ConversationService,
    private readonly userService: UserService,
    private readonly performerService: PerformerService,
    private readonly requestService: RequestService,
    private readonly streamService: StreamService,
    private readonly logger: DBLoggerService
  ) { }

  @SubscribeMessage(JOIN_ROOM)
  async handleJoinPrivateRoom(
    client: Socket,
    payload: { conversationId: string }
  ) {
    try {
      const { conversationId } = payload;
      const { token } = client.handshake.query;
      if (!token) {
        return;
      }

      const [user, conversation] = await Promise.all([
        this.authService.getSourceFromJWT(token),
        this.conversationService.findById(conversationId)
      ]);

      if (!user || !conversation) {
        return;
      }

      const stream = await this.streamService.findById(conversation.streamId);
      if (!stream) return;

      const roomName = conversation.getRoomName();
      await client.join(roomName);
      await this.socketUserService.emitToRoom(
        roomName,
        `message_created_conversation_${conversation._id}`,
        {
          text: `${user.username} has joined this conversation`,
          _id: conversation._id,
          conversationId,
          isSystem: true
        }
      );

      if (user.isPerformer) {
        await this.socketUserService.emitToRoom(
          roomName,
          MODEL_JOIN_ROOM,
          { conversationId }
        );
        const type = conversation.type.split('_');
        await this.performerService.setStreamingStatus(user._id, type[1]);
        if (stream.type === PRIVATE_CHAT) {
          await this.socketUserService.emitToRoom(
            stream.performerId.toString(), // Public room name
            'message_created',
            {
              text: 'The model is in private chat/C2C with another user',
              type: MESSAGE_TYPE.NOTIFY
            }
          );
        } else if (stream.type === GROUP_CHAT) {
          await this.socketUserService.emitToRoom(
            stream.performerId.toString(), // Public room name
            'message_created',
            {
              text:
                'The model is in a Group show and will be back after the show ends.',
              type: MESSAGE_TYPE.NOTIFY
            }
          );
        }
      }

      const connections = await this.socketUserService.getRoomUserConnections(
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
      const streamId = `${stream.type}-${stream._id}-${user._id}`;
      const data = {
        ...defaultStreamValue,
        streamId,
        name: streamId,
        description: '',
        type: BroadcastType.LiveStream,
        status: 'finished'
      };
      const result = await this.requestService.create(data);
      if (result.status) {
        throw result.error || result.data;
      }
      const total = this.server.sockets.adapter.rooms.has(roomName) ? this.server.sockets.adapter.rooms.get(roomName).size : 0;
      await this.socketUserService.emitToUsers(user._id, JOINED_THE_ROOM, {
        streamId,
        conversationId,
        total,
        members: members.map((m) => new UserDto(m).toResponse()),
        streamList: stream.streamIds
      });
    } catch (e) {
      this.logger.error(e.stack || e, { context: 'socket:handleJoinPrivateRoom' });
    }
  }

  @SubscribeMessage(LEAVE_ROOM)
  async handleLeavePrivateRoom(
    client: Socket,
    payload: { conversationId: string }
  ) {
    try {
      const { conversationId } = payload;
      const { token } = client.handshake.query;
      if (!token) {
        return;
      }

      const [user, conversation] = await Promise.all([
        this.authService.getSourceFromJWT(token),
        this.conversationService.findById(payload.conversationId)
      ]);
      if (!user || !conversation) {
        return;
      }

      const stream = await this.streamService.findById(conversation.streamId);
      if (!stream) return;

      const roomName = conversation.getRoomName();
      await client.leave(roomName);
      await this.socketUserService.emitToRoom(
        roomName,
        `message_created_conversation_${payload.conversationId}`,
        {
          text: `${user.username} has left this conversation`,
          _id: payload.conversationId,
          conversationId,
          isSystem: true
        }
      );

      if (user.isPerformer) {
        await this.socketUserService.emitToRoom(roomName, MODEL_LEFT_ROOM, {
          date: new Date(),
          conversationId
        });
        await this.performerService.setStreamingStatus(user._id, OFFLINE);
      }

      if (
        stream.isStreaming
        && (!this.server.sockets.adapter.rooms.has(roomName) || stream.type === PRIVATE_CHAT)
      ) {
        await this.streamService.updateStreamStatus(stream._id, false, new Date());
      }
    } catch (e) {
      this.logger.error(e.stack || e, { context: 'socket:handleLeavePrivateRoom' });
    }
  }
}
