import { Injectable } from '@nestjs/common';
import { Model, SortOrder } from 'mongoose';
import { ObjectId } from 'mongodb';
import {
  EntityNotFoundException, ForbiddenException, QueueEventService, QueueEvent, PageableData
} from 'src/kernel';
import { EVENT } from 'src/kernel/constants';
import { ReactionService } from 'src/modules/reaction/services/reaction.service';
import { InjectModel } from '@nestjs/mongoose';
import {
  CommentCreatePayload, CommentEditPayload, CommentSearchRequestPayload
} from '../payloads';
import { UserDto } from '../../user/dtos';
import { CommentDto } from '../dtos/comment.dto';
import { UserService } from '../../user/services';
import { PerformerService } from '../../performer/services';
import { COMMENT_CHANNEL } from '../contants';
import { Comment } from '../schemas/comment.schema';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name) private readonly CommentModel: Model<Comment>,
    private readonly queueEventService: QueueEventService,
    private readonly userService: UserService,
    private readonly performerService: PerformerService,
    private readonly reactionService: ReactionService
  ) { }

  public async increaseComment(commentId, num = 1) {
    await this.CommentModel.updateOne({ _id: commentId }, { $inc: { totalReply: num } });
  }

  public async selfCreate(payload: CommentCreatePayload, user: UserDto): Promise<CommentDto> {
    const comment: Record<string, any> = { ...payload };
    comment.createdBy = user._id;
    comment.createdAt = new Date();
    comment.updatedAt = new Date();
    const newComment = await this.CommentModel.create(comment);
    const dto = CommentDto.fromModel(newComment);
    await this.queueEventService.publish(
      new QueueEvent({
        channel: COMMENT_CHANNEL,
        eventName: EVENT.CREATED,
        data: dto
      })
    );
    const returnData = dto;
    returnData.setCreator(user);
    return returnData;
  }

  public async selfUpdate(id: string | ObjectId, payload: CommentEditPayload, user: UserDto): Promise<any> {
    const comment = await this.CommentModel.findById(id);
    if (!comment) {
      throw new EntityNotFoundException();
    }

    const data = { ...payload };
    if (comment.createdBy.toString() !== user._id.toString()) {
      throw new ForbiddenException();
    }
    await this.CommentModel.updateOne({ _id: id }, data);
    return { updated: true };
  }

  public async selfDelete(id: string | ObjectId, user: UserDto) {
    const comment = await this.CommentModel.findById(id);
    if (!comment) {
      throw new EntityNotFoundException();
    }
    if (comment.createdBy.toString() !== user._id.toString()) {
      throw new ForbiddenException();
    }
    await this.CommentModel.deleteOne({ _id: id });
    await this.queueEventService.publish(
      new QueueEvent({
        channel: COMMENT_CHANNEL,
        eventName: EVENT.DELETED,
        data: CommentDto.fromModel(comment)
      })
    );
    return { deleted: true };
  }

  public async search(req: CommentSearchRequestPayload, user?: UserDto): Promise<PageableData<CommentDto>> {
    const query: Record<string, any> = {};
    if (req.objectId) query.objectId = req.objectId;
    if (req.objectType) query.objectType = req.objectType;

    const sort: Record<string, SortOrder> = {
      createdAt: -1
    };
    const [data, total] = await Promise.all([
      this.CommentModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.CommentModel.countDocuments(query)
    ]);
    const comments = data.map((d) => CommentDto.fromModel(d));
    const commentIds = data.map((d) => d._id);
    const UIds = data.map((d) => d.createdBy);
    const [users, performers, reactions] = await Promise.all([
      UIds.length ? this.userService.findByIds(UIds) : [],
      UIds.length ? this.performerService.findByIds(UIds) : [],
      user && commentIds.length ? this.reactionService.findByQuery({ objectId: { $in: commentIds }, createdBy: user._id }) : []
    ]);
    comments.forEach((comment: CommentDto) => {
      const performer = performers.find((p) => p._id.toString() === comment.createdBy.toString());
      const userComment = users.find((u) => u._id.toString() === comment.createdBy.toString());
      const liked = reactions.find((reaction) => reaction.objectId.toString() === comment._id.toString());

      comment.setCreator(performer ? new UserDto(performer) : new UserDto(userComment));
      comment.setIsLiked(!!liked);
    });
    return {
      data: comments,
      total
    };
  }
}
