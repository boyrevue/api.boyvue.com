import { Expose, Transform, plainToInstance } from 'class-transformer';

export interface IPostAuthor {
  _id?: any;
  name?: string;
  avatar?: string;
  roles?: string[];
}

export class PostDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: any;

  @Expose()
  @Transform(({ obj }) => obj.authorId)
  authorId: any;

  @Expose()
  author: IPostAuthor;

  @Expose()
  type: string = 'post';

  @Expose()
  title: string;

  @Expose()
  slug: string;

  @Expose()
  ordering: number;

  @Expose()
  content: string;

  @Expose()
  shortDescription: string;

  @Expose()
  @Transform(({ obj }) => obj.categoryIds)
  categoryIds: string[] = [];

  @Expose()
  status = 'draft';

  @Expose()
  meta: any[] = [];

  @Expose()
  image: any;

  @Expose()
  metaTitle: string;

  @Expose()
  metaKeywords: string;

  @Expose()
  metaDescription: string;

  @Expose()
  @Transform(({ obj }) => obj.updatedBy)
  updatedBy: any;

  @Expose()
  @Transform(({ obj }) => obj.createdBy)
  createdBy: any;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(PostDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  public addAuthor(author: any) {
    this.author = {
      _id: author._id,
      name: author.username || author.name,
      avatar: author.avatar // TODO - parse avatar if needed
    };
  }
}
