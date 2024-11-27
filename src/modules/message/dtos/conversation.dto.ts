import { ObjectId } from 'mongodb';
import { UserDto } from 'src/modules/user/dtos';
import { PerformerDto } from 'src/modules/performer/dtos';
import { Expose, Transform, plainToInstance } from 'class-transformer';

export class ConversationDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  type: string;

  @Expose()
  name: string;

  @Expose()
  @Transform(({ obj }) => obj.recipients)
  recipients: Array<{
    sourceId: string | ObjectId;
    source: string;
  }>;

  @Expose()
  lastMessage: string;

  @Expose()
  @Transform(({ obj }) => obj.lastSenderId)
  lastSenderId: string | ObjectId;

  @Expose()
  lastMessageCreatedAt: Date;

  @Expose()
  @Transform(({ obj }) => obj.meta)
  meta: Record<string, any>;

  @Expose()
  recipientInfo?: Partial<UserDto | PerformerDto>;

  @Expose()
  totalNotSeenMessages?: number;

  @Expose()
  isSubscribed?: boolean;

  @Expose()
  isBlocked?: boolean;

  @Expose()
  @Transform(({ obj }) => obj.streamId)
  streamId: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.performerId)
  performerId: ObjectId;

  @Expose()
  isPinned: boolean;

  @Expose()
  pinnedAt: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(ConversationDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  public getRoomName(): string {
    return `conversation-${this.type}-${this._id}`;
  }

  public setRecipientInfo(recipient: UserDto | PerformerDto) {
    if (!recipient) return;
    this.recipientInfo = recipient.toSearchResponse();
  }

  public setIsSubscribed(subscribed: boolean) {
    this.isSubscribed = subscribed;
  }

  public setIsBlocked(blocked: boolean) {
    this.isBlocked = blocked;
  }

  public setTotalNotSeenMessage(total) {
    this.totalNotSeenMessages = total || 0;
  }
}
