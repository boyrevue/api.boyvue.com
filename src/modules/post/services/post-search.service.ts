import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { PageableData } from 'src/kernel';
import { InjectModel } from '@nestjs/mongoose';
import { AdminSearch, UserSearch } from '../payloads';
import { Post } from '../schemas';
import { PostDto } from '../dtos';

@Injectable()
export class PostSearchService {
  constructor(
    @InjectModel(Post.name) private readonly PostModel: Model<Post>
  ) { }

  // TODO - define post DTO
  public async adminSearch(req: AdminSearch): Promise<PageableData<PostDto>> {
    const query: Record<string, any> = {};
    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''),
        'i'
      );
      query.$or = [
        {
          title: { $regex: regexp }
        }
      ];
    }
    if (req.status) {
      query.status = req.status;
    }
    if (req.type) {
      query.type = req.type;
    }
    const sort = {
      [req.sortBy || 'updatedAt']: req.sort
    };
    const [data, total] = await Promise.all([
      this.PostModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.PostModel.countDocuments(query)
    ]);
    return {
      data: data.map((item) => PostDto.fromModel(item)),
      total
    };
  }

  public async userSearch(req: UserSearch): Promise<PageableData<PostDto>> {
    const query: Record<string, any> = {};
    query.status = 'published';
    if (req.type) {
      query.type = req.type;
    }
    const sort = {
      [req.sortBy || 'updatedAt']: req.sort
    };
    const [data, total] = await Promise.all([
      this.PostModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.PostModel.countDocuments(query)
    ]);
    return {
      data: data.map((item) => PostDto.fromModel(item)),
      total
    };
  }
}
