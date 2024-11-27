import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { QueueEventService, QueueEvent } from 'src/kernel';
import { REACTION_CHANNEL, REACTION_TYPE, REACTION } from 'src/modules/reaction/constants';
import { EVENT } from 'src/kernel/constants';
import { PerformerService } from 'src/modules/performer/services';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Comment } from '../schemas/comment.schema';

const REACTION_COMMENT_TOPIC = 'REACTION_COMMENT_TOPIC';

@Injectable()
export class ReactionCommentListener {
  constructor(
    @InjectModel(Comment.name) private readonly CommentModel: Model<Comment>,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    private readonly queueEventService: QueueEventService
  ) {
    this.queueEventService.subscribe(
      REACTION_CHANNEL,
      REACTION_COMMENT_TOPIC,
      this.handleReactComment.bind(this)
    );
  }

  public async handleReactComment(event: QueueEvent) {
    if (![EVENT.CREATED, EVENT.DELETED].includes(event.eventName)) return;
    const { objectId, objectType, action } = event.data;
    if (![REACTION_TYPE.COMMENT].includes(objectType) || action !== REACTION.LIKE) return;

    const comment = await this.CommentModel.findById(objectId);
    if (!comment) return;
    switch (event.eventName) {
      case EVENT.CREATED:
        await Promise.all([
          this.CommentModel.updateOne({ _id: objectId }, { $inc: { totalLike: 1 } }),
          this.performerService.updateLikeStat(comment.createdBy, 1)
        ]);
        break;
      case EVENT.DELETED:
        await Promise.all([
          this.CommentModel.updateOne({ _id: objectId }, { $inc: { totalLike: -1 } }),
          this.performerService.updateLikeStat(comment.createdBy, -1)
        ]);
        break;
      default: break;
    }
  }
}
