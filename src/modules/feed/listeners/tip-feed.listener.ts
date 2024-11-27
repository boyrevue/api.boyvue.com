import { QueueEvent, QueueEventService } from 'src/kernel';
import { Injectable } from '@nestjs/common';
import { EVENT } from 'src/kernel/constants';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Feed } from '../schemas';

const TIP_FEED = 'TIP_FEED';

@Injectable()
export class TipFeedListener {
  constructor(
    @InjectModel(Feed.name) private readonly FeedModel: Model<Feed>,
    private readonly queueEventService: QueueEventService
  ) {
    this.queueEventService.subscribe(
      'PAYMENT_WALLET_CHANNEL',
      TIP_FEED,
      this.handler.bind(this)
    );
  }

  async handler(event: QueueEvent) {
    const { eventName } = event;
    const { feedId, orderDetail } = event.data;
    if (eventName !== EVENT.CREATED || !feedId) {
      return;
    }

    const feed = await this.FeedModel.findOne({ _id: feedId });
    if (!feed) {
      return;
    }
    await this.FeedModel.updateOne({ _id: feedId }, { $inc: { totalTips: orderDetail.totalPrice } });
  }
}
