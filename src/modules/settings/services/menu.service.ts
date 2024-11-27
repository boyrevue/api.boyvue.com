import { Injectable, NotFoundException } from '@nestjs/common';
import { Model, SortOrder } from 'mongoose';
import { ObjectId } from 'mongodb';
import { PageableData } from 'src/kernel';
import { InjectModel } from '@nestjs/mongoose';
import { MenuDto } from '../dtos';
import { MenuCreatePayload, MenuSearchRequestPayload, MenuUpdatePayload } from '../payloads';
import { Menu } from '../schemas';

@Injectable()
export class MenuService {
  constructor(
    @InjectModel(Menu.name) private readonly MenuModel: Model<Menu>
  ) { }

  public async findById(id: string | ObjectId): Promise<MenuDto> {
    const query = { _id: id };
    const menu = await this.MenuModel.findOne(query);
    if (!menu) return null;
    return MenuDto.fromModel(menu);
  }

  public async create(payload: MenuCreatePayload): Promise<MenuDto> {
    const data = {
      ...payload,
      updatedAt: new Date(),
      createdAt: new Date()
    };
    const menu = await this.MenuModel.create(data);
    return MenuDto.fromModel(menu);
  }

  public async update(
    id: string | ObjectId,
    payload: MenuUpdatePayload
  ): Promise<MenuDto> {
    const menu = await this.findById(id);
    if (!menu) {
      throw new NotFoundException();
    }

    const data: Record<string, any> = {
      ...payload,
      updatedAt: new Date()
    };
    await this.MenuModel.updateOne({ _id: id }, data);
    return this.findById(menu._id);
  }

  public async delete(id: string | ObjectId): Promise<boolean> {
    const menu = await this.findById(id);
    if (!menu) {
      throw new NotFoundException('Menu not found');
    }
    await this.MenuModel.deleteOne({ _id: id });
    return true;
  }

  public async search(
    req: MenuSearchRequestPayload
  ): Promise<PageableData<MenuDto>> {
    const query: Record<string, any> = {};
    if (req.q) {
      query.$or = [
        {
          title: { $regex: new RegExp(req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''), 'i') }
        }
      ];
    }
    if (req.section) {
      query.section = req.section;
    }
    let sort: Record<string, SortOrder> = { ordering: 1, createdAt: -1 };
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.MenuModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.MenuModel.countDocuments(query)
    ]);

    return {
      data: data.map((item) => MenuDto.fromModel(item)), // TODO - define mdoel
      total
    };
  }

  public async userSearch(
    req: MenuSearchRequestPayload
  ): Promise<PageableData<MenuDto>> {
    const query: Record<string, any> = {};
    query.public = true;
    if (req.section) {
      query.section = req.section;
    }
    let sort: Record<string, SortOrder> = { ordering: 1, createdAt: -1 };
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.MenuModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.MenuModel.countDocuments(query)
    ]);

    return {
      data: data.map((item) => MenuDto.fromModel(item)),
      total
    };
  }

  public async getPublicMenus() {
    return this.MenuModel.find({}).sort({ ordering: 1, createdAt: -1 });
  }
}
