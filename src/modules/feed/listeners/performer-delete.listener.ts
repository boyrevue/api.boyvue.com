import { Injectable } from '@nestjs/common';
import { QueueEvent, QueueEventService } from 'src/kernel';
import { Model } from 'mongoose';
import { EVENT, STATUS } from 'src/kernel/constants';
import { UserDto } from 'src/modules/user/dtos';
import { DELETE_PERFORMER_CHANNEL } from 'src/modules/performer/constants';
import { InjectModel } from '@nestjs/mongoose';
import { DBLoggerService } from 'src/modules/logger';
import { PERFORMER_FEED_CHANNEL } from '../constants';
import { Feed } from '../schemas';

const DELETE_PERFORMER_MESSAGE_TOPIC = 'DELETE_PERFORMER_MESSAGE_TOPIC';

@Injectable()
export class DeletePerformerFeedListener {
  constructor(
    @InjectModel(Feed.name) private readonly FeedModel: Model<Feed>,
    private readonly queueEventService: QueueEventService,
    private readonly logger: DBLoggerService
  ) {
    this.queueEventService.subscribe(
      DELETE_PERFORMER_CHANNEL,
      DELETE_PERFORMER_MESSAGE_TOPIC,
      this.handleDeleteData.bind(this)
    );
  }

  private async handleDeleteData(event: QueueEvent): Promise<void> {
    try {
      if (event.eventName !== EVENT.DELETED) return;
      const user: UserDto = event.data;
      const count = await this.FeedModel.countDocuments({
        fromSourceId: user._id,
        status: STATUS.ACTIVE
      });
      count && await this.FeedModel.updateMany({
        fromSourceId: user._id
      }, { status: STATUS.INACTIVE });
      count && await this.queueEventService.publish(
        new QueueEvent({
          channel: PERFORMER_FEED_CHANNEL,
          eventName: EVENT.DELETED,
          data: { fromSourceId: user._id, count: -count }
        })
      );
    } catch (e) {
      this.logger.error(e.stack || e, { context: 'DeletePerformerFeedListener' });
    }
  }
}
