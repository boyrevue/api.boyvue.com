import { Injectable } from '@nestjs/common';
import { QueueEventService, QueueEvent } from 'src/kernel';
import { Model } from 'mongoose';
import { EVENT } from 'src/kernel/constants';
import { InjectModel } from '@nestjs/mongoose';
import { PERFORMER_FEED_CHANNEL, POLL_TARGET_SOURCE, VOTE_FEED_CHANNEL } from '../constants';
import { Poll } from '../schemas';

const POLL_FEED_TOPIC = 'POLL_FEED_TOPIC';
const VOTE_POLL_TOPIC = 'VOTE_POLL_TOPIC';

@Injectable()
export class PollFeedListener {
  constructor(
    @InjectModel(Poll.name) private readonly PollModel: Model<Poll>,
    private readonly queueEventService: QueueEventService
  ) {
    this.queueEventService.subscribe(
      PERFORMER_FEED_CHANNEL,
      POLL_FEED_TOPIC,
      this.handleRefPoll.bind(this)
    );

    this.queueEventService.subscribe(
      VOTE_FEED_CHANNEL,
      VOTE_POLL_TOPIC,
      this.handleVotePoll.bind(this)
    );
  }

  public async handleRefPoll(event: QueueEvent) {
    if (![EVENT.CREATED].includes(event.eventName)) {
      return;
    }
    const { pollIds, _id: feedId } = event.data;
    if (!pollIds || !pollIds.length) return;
    if (event.eventName === EVENT.CREATED) {
      await this.PollModel.updateMany({ _id: { $in: pollIds } }, { refId: feedId, fromRef: POLL_TARGET_SOURCE.FEED }, { upsert: true });
    }
  }

  public async handleVotePoll(event: QueueEvent) {
    if (![EVENT.CREATED, EVENT.DELETED].includes(event.eventName)) {
      return;
    }
    const { targetId } = event.data;

    if (event.eventName === EVENT.CREATED) {
      await this.PollModel.updateOne({ _id: targetId }, { $inc: { totalVote: 1 } }, { upsert: true });
    }
  }
}
