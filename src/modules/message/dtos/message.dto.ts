import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { UserDto } from 'src/modules/user/dtos';
import { PerformerDto } from 'src/modules/performer/dtos';

export class MessageDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.conversationId)
  conversationId: ObjectId;

  @Expose()
  type: string;

  @Expose()
  @Transform(({ obj }) => obj.fileId)
  fileId: ObjectId;

  @Expose()
  text: string;

  @Expose()
  @Transform(({ obj }) => obj.senderId)
  senderId: ObjectId;

  @Expose()
  senderSource?: string;

  @Expose()
  meta: Record<string, any>;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  imageUrl: string;

  senderInfo: Partial<UserDto> | Partial<PerformerDto>;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(MessageDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  public setSenderInfo(dto: UserDto | PerformerDto) {
    if (!dto) return;
    this.senderInfo = dto.toResponse();
  }
}
