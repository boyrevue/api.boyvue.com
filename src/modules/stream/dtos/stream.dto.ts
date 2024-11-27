import { Expose, Transform, plainToInstance } from 'class-transformer';
import { ObjectId } from 'mongodb';

export declare type StreamType = 'public' | 'group' | 'private';

export class StreamDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.performerId)
  performerId: string | ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.userIds)
  userIds: ObjectId[];

  @Expose()
  @Transform(({ obj }) => obj.streamIds)
  streamIds: string[];

  @Expose()
  type: string;

  @Expose()
  sessionId: string;

  @Expose()
  isStreaming: boolean;

  @Expose()
  totalViewer: number;

  @Expose()
  streamingTime: number;

  @Expose()
  lastStreamingTime: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(StreamDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  toResponse(includePrivateInfo = false) {
    const publicInfo = {
      _id: this._id,
      isStreaming: this.isStreaming,
      totalViewer: this.totalViewer,
      streamingTime: this.streamingTime,
      lastStreamingTime: this.lastStreamingTime
    };
    if (!includePrivateInfo) {
      return publicInfo;
    }

    return {
      ...publicInfo,
      performerId: this.performerId,
      userIds: this.userIds,
      type: this.type,
      streamIds: this.streamIds,
      sessionId: this.sessionId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
