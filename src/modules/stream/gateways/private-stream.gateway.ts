import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { SocketUserService } from 'src/modules/socket/services/socket-user.service';
import { AuthService } from 'src/modules/auth';
import { Socket } from 'socket.io';
import { UserService } from 'src/modules/user/services';
import { UserDto } from 'src/modules/user/dtos';
import { PerformerService } from 'src/modules/performer/services';
import * as moment from 'moment';
import { ConversationService } from 'src/modules/message/services';
import { DBLoggerService } from 'src/modules/logger';
import { BroadcastStatus } from '../constant';
import { StreamService, RequestService } from '../services';

const STREAM_JOINED = 'private-stream/streamJoined';
const STREAM_LEAVED = 'private-stream/streamLeaved';
const STREAM_INFORMATION_CHANGED = 'private-stream/streamInformationChanged';

@WebSocketGateway()
export class PrivateStreamWsGateway {
  constructor(
    private readonly socketUserService: SocketUserService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly performerService: PerformerService,
    private readonly streamService: StreamService,
    private readonly requestService: RequestService,
    private readonly conversationService: ConversationService,
    private readonly logger: DBLoggerService
  ) { }

  @SubscribeMessage('private-stream/join')
  async handleJoinStream(
    client: Socket,
    payload: { conversationId: string; streamId: string; sessionId: string }
  ): Promise<void> {
    try {
      const { conversationId, streamId } = payload;
      if (!conversationId) {
        return;
      }

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

      await this.streamService.pushStreamId(conversation.streamId, streamId);

      const resp = await this.requestService.getBroadcast(streamId);
      if (resp.status) {
        throw resp.error || resp.data;
      }

      if (
        [BroadcastStatus.CREATED, BroadcastStatus.BROADCASTING].includes(
          resp.data.status
        )
      ) {
        const roomName = conversation.getRoomName();
        await this.socketUserService.emitToRoom(roomName, STREAM_JOINED, {
          streamId,
          conversationId
        });
        await this.socketUserService.addConnectionToRoom(
          roomName,
          user._id,
          user.isPerformer ? 'model' : 'member'
        );
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
        if (memberIds.length) {
          const members = await this.userService.findByIds(memberIds);
          const data = {
            conversationId,
            total: members.length,
            members: members.map((m) => new UserDto(m).toResponse())
          };
          this.socketUserService.emitToRoom(
            roomName,
            STREAM_INFORMATION_CHANGED,
            data
          );
        }

        await this.streamService.addPerformerLivestreamList(user._id, 'private');
      }
    } catch (e) {
      this.logger.error(e.stack || e, { context: 'handle_join_stream' });
    }
  }

  @SubscribeMessage('private-stream/leave')
  async handleLeaveStream(
    client: Socket,
    payload: { conversationId: string; streamId: string; sessionId: string }
  ): Promise<void> {
    try {
      const { conversationId, streamId } = payload;
      if (!conversationId) {
        return;
      }

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

      const updateData: Record<string, any> = {
        $pull: {
          streamIds: streamId
        }
      };

      // user left room, should recheck logic here
      // if (user.isPerformer) {
      //   updateData.$set = {
      //     waiting: false
      //   };
      // }

      if (user) {
        updateData.$set = {
          waiting: false
        };
      }

      await this.streamService.updateByQuery(conversation.streamId, updateData);

      const roomName = conversation.getRoomName();
      await this.socketUserService.emitToRoom(roomName, STREAM_LEAVED, {
        conversationId,
        streamId
      });

      const results = await this.socketUserService.getConnectionValue(
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
            await this.streamService.removePerformerLivestreamList(user._id);
          } else if (role === 'member') {
            await this.userService.updateStats(user._id, {
              'stats.totalViewTime': streamTime
            });
          }
        }
      }

      await this.socketUserService.removeConnectionFromRoom(roomName, user._id);
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
      if (memberIds.length) {
        const members = await this.userService.findByIds(memberIds);
        const data = {
          conversationId,
          total: members.length,
          members: members.map((m) => new UserDto(m).toResponse())
        };
        this.socketUserService.emitToRoom(
          roomName,
          STREAM_INFORMATION_CHANGED,
          data
        );
      }
    } catch (e) {
      this.logger.error(e.stack || e, { context: 'handle_leave_stream' });
    }
  }
}
