import { Injectable } from '@nestjs/common';
import { Model, SortOrder } from 'mongoose';
import { PageableData } from 'src/kernel/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserDto } from '../dtos';
import { UserSearchRequestPayload } from '../payloads';
import { ROLE_ADMIN, STATUS_ACTIVE } from '../constants';
import { User } from '../schemas';

@Injectable()
export class UserSearchService {
  constructor(
    @InjectModel(User.name) private readonly UserModel: Model<User>
  ) { }

  public async search(req: UserSearchRequestPayload): Promise<PageableData<Partial<UserDto>>> {
    const query: Record<string, any> = {};
    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''),
        'i'
      );
      query.$or = [
        {
          name: { $regex: regexp }
        },
        {
          username: { $regex: regexp }
        },
        {
          email: { $regex: regexp }
        }
      ];
    }
    if (req.role) {
      query.roles = { $in: [req.role] };
    }
    if (req.status) {
      query.status = req.status;
    }
    let sort: Record<string, SortOrder> = {
      createdAt: -1
    };
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.UserModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.UserModel.countDocuments(query)
    ]);
    return {
      data: data.map((item) => UserDto.fromModel(item).toResponse(true)),
      total
    };
  }

  public async performerSearch(req: UserSearchRequestPayload): Promise<PageableData<Partial<UserDto>>> {
    const query: Record<string, any> = {
      status: STATUS_ACTIVE,
      roles: { $ne: ROLE_ADMIN }
    };
    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''),
        'i'
      );
      query.$or = [
        {
          name: { $regex: regexp }
        },
        {
          username: { $regex: regexp }
        }
      ];
    }
    let sort: Record<string, SortOrder> = {
      createdAt: -1
    };
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.UserModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.UserModel.countDocuments(query)
    ]);

    return {
      data: data.map((d) => UserDto.fromModel(d).toResponse()),
      total
    };
  }

  public async searchByKeyword(req: UserSearchRequestPayload): Promise<UserDto[]> {
    const query: Record<string, any> = {};
    if (req.q) {
      const regexp = new RegExp(
        req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''),
        'i'
      );
      query.$or = [
        {
          name: { $regex: regexp }
        },
        {
          email: { $regex: regexp }
        },
        {
          username: { $regex: regexp }
        }
      ];
    }

    const [data] = await Promise.all([
      this.UserModel.find(query)
    ]);
    return data.map((item) => UserDto.fromModel(item));
  }
}
