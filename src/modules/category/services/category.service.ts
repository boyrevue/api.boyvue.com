import { Injectable } from '@nestjs/common';
import { Model, SortOrder } from 'mongoose';
import { merge } from 'lodash';
import {
  EntityNotFoundException,
  StringHelper
} from 'src/kernel';
import { ObjectId } from 'mongodb';
import { isObjectId } from 'src/kernel/helpers/string.helper';
import { InjectModel } from '@nestjs/mongoose';
import { CategorySearchRequest } from '../payloads/category-search.request';
import { CategoryUpdatePayload } from '../payloads/category-update.payload';
import { CategoryCreatePayload } from '../payloads/category-create.payload';
import { Category } from '../schemas';
import { CategoryDto } from '../dtos';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private readonly CategoryModel: Model<Category>
  ) { }

  public async find(query: Record<string, any>): Promise<CategoryDto[]> {
    const items = await this.CategoryModel.find(query);
    return items.map((item) => CategoryDto.fromModel(item));
  }

  public async findByIds(ids: string[] | ObjectId[] | any[]): Promise<CategoryDto[]> {
    const items = await this.CategoryModel.find({ _id: { $in: ids } });
    return items.map((item) => CategoryDto.fromModel(item));
  }

  public async create(payload: CategoryCreatePayload): Promise<CategoryDto> {
    const data = {
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    data.slug = StringHelper.createAlias(data.name);
    const slugCheck = await this.CategoryModel.countDocuments({
      slug: data.slug
    });
    if (slugCheck) {
      data.slug = `${data.slug}-${StringHelper.randomString(5)}`;
    }
    const item = await this.CategoryModel.create(data);
    return CategoryDto.fromModel(item);
  }

  public async update(id: string | ObjectId, payload: CategoryUpdatePayload): Promise<CategoryDto> {
    const category = await this.CategoryModel.findById(id);
    if (!category) {
      throw new EntityNotFoundException('Category not found!');
    }

    let { slug } = category;
    if (payload.name !== category.name) {
      slug = StringHelper.createAlias(payload.name);
      const slugCheck = await this.CategoryModel.countDocuments({
        slug,
        _id: { $ne: category._id }
      });
      if (slugCheck) {
        slug = `${slug}-${StringHelper.randomString(8)}`;
      }
    }
    merge(category, payload);
    category.slug = slug;
    category.updatedAt = new Date();
    await category.save();

    return CategoryDto.fromModel(category);
  }

  public async findByIdOrAlias(id: string | ObjectId): Promise<CategoryDto> {
    const query = !isObjectId(`${id}`) ? { slug: id } : { _id: id };
    const category = await this.CategoryModel.findOne(query);
    if (!category) {
      throw new EntityNotFoundException();
    }
    return CategoryDto.fromModel(category);
  }

  public async search(req: CategorySearchRequest) {
    const query: Record<string, any> = {};
    if (req.q) query.name = { $regex: new RegExp(req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''), 'i') };
    if (req.status) query.status = req.status;
    if (req.group) {
      query.group = req.group;
    }
    let sort: Record<string, SortOrder> = {
      ordering: 1
    };
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.CategoryModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.CategoryModel.countDocuments(query)
    ]);

    return {
      data: data.map((item) => CategoryDto.fromModel(item)),
      total
    };
  }

  public async delete(id: string | ObjectId) {
    const category = await this.CategoryModel.findById(id);
    if (!category) {
      throw new EntityNotFoundException();
    }
    await category.deleteOne();
    return true;
  }
}
