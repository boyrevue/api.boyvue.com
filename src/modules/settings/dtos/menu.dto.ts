import { ObjectId } from 'mongodb';
import { pick } from 'lodash';
import { Expose, Transform, plainToInstance } from 'class-transformer';

export class MenuDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  title: string;

  @Expose()
  path: string;

  @Expose()
  internal: boolean;

  @Expose()
  @Transform(({ obj }) => obj.parentId)
  parentId: string;

  @Expose()
  help: string;

  @Expose()
  section: string;

  @Expose()
  public: boolean;

  @Expose()
  ordering: number;

  @Expose()
  isNewTab: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(data: Partial<MenuDto>) {
    Object.assign(
      this,
      pick(data, [
        '_id',
        'title',
        'path',
        'internal',
        'parentId',
        'help',
        'section',
        'public',
        'ordering',
        'isNewTab',
        'createdAt',
        'updatedAt'
      ])
    );
  }

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(MenuDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }
}
