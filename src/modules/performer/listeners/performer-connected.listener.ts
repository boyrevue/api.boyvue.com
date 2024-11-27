import { Injectable } from '@nestjs/common';
import { QueueEvent, QueueEventService } from 'src/kernel';
import { Model } from 'mongoose';
import { PERFORMER_SOCKET_CONNECTED_CHANNEL, USER_SOCKET_EVENT } from 'src/modules/socket/constants';
import { OFFLINE } from 'src/modules/stream/constant';
import { InjectModel } from '@nestjs/mongoose';
import { Performer } from '../schemas';

const HANDLE_PERFORMER_ONLINE_OFFLINE = 'HANDLE_PERFORMER_ONLINE_OFFLINE';

@Injectable()
export class PerformerConnectedListener {
  constructor(
    @InjectModel(Performer.name) private readonly PerformerModel: Model<Performer>,
    private readonly queueEventService: QueueEventService
  ) {
    this.queueEventService.subscribe(
      PERFORMER_SOCKET_CONNECTED_CHANNEL,
      HANDLE_PERFORMER_ONLINE_OFFLINE,
      this.handleOnlineOffline.bind(this)
    );
  }

  private async handleOnlineOffline(event: QueueEvent): Promise<void> {
    const { source, sourceId } = event.data;
    if (source !== 'performer') {
      return;
    }

    let updateData = {};
    switch (event.eventName) {
      case USER_SOCKET_EVENT.CONNECTED:
        updateData = {
          isOnline: 1,
          onlineAt: new Date(),
          offlineAt: null
        };
        break;
      case USER_SOCKET_EVENT.DISCONNECTED:
        updateData = {
          isOnline: 0,
          streamingStatus: OFFLINE,
          live: false,
          onlineAt: null,
          offlineAt: new Date()
        };
        break;
      default: return;
    }
    await this.PerformerModel.updateOne({ _id: sourceId }, updateData);
  }
}
