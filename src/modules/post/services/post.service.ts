import {
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import {
  EntityNotFoundException
} from 'src/kernel';
import { UserDto } from 'src/modules/user/dtos';
import { createAlias, isObjectId } from 'src/kernel/helpers/string.helper';
import { FileService } from 'src/modules/file/services';
import { InjectModel } from '@nestjs/mongoose';
import { PostDto } from '../dtos';
import { PostCreatePayload } from '../payloads/post-create.payload';
import { Post } from '../schemas';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(Post.name) private readonly PostModel: Model<Post>,
    private readonly fileService: FileService
  ) { }

  public async find(params: any): Promise<PostDto[]> {
    const items = await this.PostModel.find(params);
    return items.map((i) => PostDto.fromModel(i));
  }

  public async findByIdOrSlug(id: string): Promise<PostDto> {
    const query = isObjectId(id) ? { _id: id } : { slug: id };
    const item = await this.PostModel.findOne(query);
    return PostDto.fromModel(item);
  }

  public async generateSlug(title: string, id?: string | ObjectId | any) {
    // consider if need unique slug with post type
    const slug = createAlias(title);
    const query: Record<string, any> = { slug };
    if (id) {
      query._id = { $ne: id };
    }
    const count = await this.PostModel.countDocuments(query);
    if (!count) {
      return slug;
    }

    return this.generateSlug(`${slug}1`, id);
  }

  public async create(payload: PostCreatePayload, user?: UserDto): Promise<PostDto> {
    const data = {
      ...payload,
      updatedAt: new Date(),
      createdAt: new Date()
    };
    if (user && !data.authorId) {
      data.authorId = user._id;
    }
    data.slug = await this.generateSlug(payload.slug || payload.title);
    const post = await this.PostModel.create(data);

    return PostDto.fromModel(post);
  }

  public async update(
    id: string,
    payload: PostCreatePayload,
    user?: UserDto
  ): Promise<PostDto> {
    const post = await this.PostModel.findById(id);
    if (!post) {
      throw new NotFoundException();
    }

    post.title = payload.title;
    post.content = payload.content;
    post.shortDescription = payload.shortDescription;
    payload.slug
      && post.set('slug', await this.generateSlug(payload.slug, post._id));
    payload.status && post.set('status', payload.status);
    payload.image && post.set('image', payload.image);
    payload.ordering && post.set('ordering', payload.ordering);
    post.set('metaTitle', payload.metaTitle);
    post.set('metaDescription', payload.metaDescription);
    post.set('metaKeywords', payload.metaKeywords);
    user && post.set('updatedBy', user._id);
    post.set('updatedAt', new Date());
    await post.save();
    return PostDto.fromModel(post);
  }

  public async delete(id: string): Promise<boolean> {
    const post = await this.PostModel.findById(id);
    if (!post) {
      throw new NotFoundException();
    }
    await post.deleteOne();
    return true;
  }

  public async adminGetDetails(id: string): Promise<PostDto> {
    return this.findByIdOrSlug(id);
  }

  public async getPublic(id: string): Promise<PostDto> {
    const post = await this.findByIdOrSlug(id);
    // TODO - map details from meta data
    if (!post || post.status !== 'published') {
      throw new EntityNotFoundException();
    }

    let { image } = post;
    if (isObjectId(post.image)) {
      const file = await this.fileService.findById(post.image);
      if (file) {
        image = file.toPublicResponse();
      }
    }

    post.image = image;
    return post;
  }
}
