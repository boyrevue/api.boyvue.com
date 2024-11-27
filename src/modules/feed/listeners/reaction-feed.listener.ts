import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { QueueEventService, QueueEvent } from 'src/kernel';
import { REACTION_CHANNEL, REACTION_TYPE, REACTION } from 'src/modules/reaction/constants';
import { EVENT } from 'src/kernel/constants';
import { PerformerService } from 'src/modules/performer/services';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Feed } from '../schemas';

const REACTION_FEED_CHANNEL = 'REACTION_FEED_CHANNEL';

@Injectable()
export class ReactionFeedListener {
  constructor(
    @InjectModel(Feed.name) private readonly FeedModel: Model<Feed>,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    private readonly queueEventService: QueueEventService
  ) {
    this.queueEventService.subscribe(
      REACTION_CHANNEL,
      REACTION_FEED_CHANNEL,
      this.handleReactFeed.bind(this)
    );
  }

  public async handleReactFeed(event: QueueEvent) {
    if (![EVENT.CREATED, EVENT.DELETED].includes(event.eventName)) {
      return;
    }
    const { objectId, objectType, action } = event.data;
    if (![REACTION_TYPE.FEED].includes(objectType) || action !== REACTION.LIKE) {
      return;
    }
    if (REACTION.LIKE && event.eventName === EVENT.CREATED) {
      const feed = await this.FeedModel.findById(objectId);
      if (feed) {
        await this.FeedModel.updateOne({ _id: objectId }, { $inc: { totalLike: 1 } }, { upsert: true });
        await this.performerService.updateLikeStat(feed.fromSourceId, 1);
      }
    }
    if (REACTION.LIKE && event.eventName === EVENT.DELETED) {
      const feed = await this.FeedModel.findById(objectId);
      if (feed) {
        await this.FeedModel.updateOne({ _id: objectId }, { $inc: { totalLike: -1 } }, { upsert: true });
        await this.performerService.updateLikeStat(feed.fromSourceId, -1);
      }
    }
  }
}
