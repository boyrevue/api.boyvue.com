import { Injectable } from '@nestjs/common';
import { QueueEvent, QueueEventService } from 'src/kernel';
import { Model } from 'mongoose';
import { USER_SOCKET_CONNECTED_CHANNEL, USER_SOCKET_EVENT } from 'src/modules/socket/constants';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../schemas';

const HANDLE_USER_ONLINE_OFFLINE = 'HANDLE_USER_ONLINE_OFFLINE';

@Injectable()
export class UserConnectedListener {
  constructor(
    private readonly queueEventService: QueueEventService,
    @InjectModel(User.name) private readonly UserModel: Model<User>
  ) {
    this.queueEventService.subscribe(
      USER_SOCKET_CONNECTED_CHANNEL,
      HANDLE_USER_ONLINE_OFFLINE,
      this.handleOnlineOffline.bind(this)
    );
  }

  private async handleOnlineOffline(event: QueueEvent): Promise<void> {
    const { source, sourceId } = event.data;
    if (source !== 'user') {
      return;
    }

    let updateData = {};
    switch (event.eventName) {
      case USER_SOCKET_EVENT.CONNECTED:
        updateData = {
          isOnline: true,
          onlineAt: new Date(),
          offlineAt: null
        };
        break;
      case USER_SOCKET_EVENT.DISCONNECTED:
        updateData = {
          isOnline: true,
          onlineAt: null,
          offlineAt: new Date()
        };
        break;
      default: return;
    }
    await this.UserModel.updateOne(
      { _id: sourceId },
      updateData,
      {
        upsert: false
      }
    );
  }
}
