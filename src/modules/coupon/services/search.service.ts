import { Injectable } from '@nestjs/common';
import { Model, SortOrder } from 'mongoose';
import { PageableData } from 'src/kernel';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { CouponSearchRequestPayload } from '../payloads';
import { CouponDto } from '../dtos';
import { Coupon } from '../schemas';

@Injectable()
export class CouponSearchService {
  constructor(
    @InjectModel(Coupon.name) private readonly CouponModel: Model<Coupon>
  ) { }

  public async search(req: CouponSearchRequestPayload): Promise<PageableData<CouponDto>> {
    const query: Record<string, any> = {};
    if (req.q) {
      query.$or = [
        {
          name: { $regex: new RegExp(req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''), 'i') }
        },
        {
          code: { $regex: new RegExp(req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''), 'i') }
        }
      ];
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
      this.CouponModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.CouponModel.countDocuments(query)
    ]);

    return {
      data: data.map((item) => plainToInstance(CouponDto, item.toObject())),
      total
    };
  }
}
