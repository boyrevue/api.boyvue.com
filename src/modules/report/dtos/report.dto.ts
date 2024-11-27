import { Expose, Transform, plainToInstance } from 'class-transformer';
import { ObjectId } from 'mongodb';
import { PerformerDto } from 'src/modules/performer/dtos';
import { UserDto } from 'src/modules/user/dtos';

export class ReportDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  source: string;

  @Expose()
  @Transform(({ obj }) => obj.sourceId)
  sourceId: ObjectId;

  @Expose()
  sourceInfo: any;

  @Expose()
  @Transform(({ obj }) => obj.performerId)
  performerId: ObjectId;

  @Expose()
  performerInfo: any;

  @Expose()
  target: string;

  @Expose()
  @Transform(({ obj }) => obj.targetId)
  targetId: ObjectId;

  @Expose()
  targetInfo: any;

  @Expose()
  status: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(ReportDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  public setPerformerInfo(performer: PerformerDto) {
    if (!performer) return;
    this.performerInfo = performer.toSearchResponse();
  }

  public setTargetInfo(target: any) {
    this.targetInfo = target;
  }

  public setSourceInfo(source: UserDto | PerformerDto) {
    if (!source) return;
    this.sourceInfo = source.toSearchResponse();
  }
}
