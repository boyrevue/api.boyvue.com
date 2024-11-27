import { Injectable } from '@nestjs/common';
import { Model, SortOrder } from 'mongoose';
import { PageableData } from 'src/kernel';
import { FileService } from 'src/modules/file/services';
import { InjectModel } from '@nestjs/mongoose';
import { BannerDto } from '../dtos';
import { BannerSearchRequest } from '../payloads';
import { Banner } from '../schemas';

@Injectable()
export class BannerSearchService {
  constructor(
    @InjectModel(Banner.name) private readonly BannerModel: Model<Banner>,
    private readonly fileService: FileService
  ) { }

  public async search(req: BannerSearchRequest): Promise<PageableData<BannerDto>> {
    const query: Record<string, any> = {};
    if (req.q) query.title = { $regex: req.q };
    if (req.status) query.status = req.status;
    let sort: Record<string, SortOrder> = {
      createdAt: -1
    };
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }

    // if (req.sort === 'random') {
    //   const data = await this.bannerModel.aggregate([
    //     {
    //       $match: query
    //     },
    //     {
    //       $sample: {
    //         $size: req.limit
    //       }
    //     }
    //   ]);
    // }

    const [data, total] = await Promise.all([
      this.BannerModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.BannerModel.countDocuments(query)
    ]);

    const fileIds = data.map((d) => d.fileId);
    const banners = data.map((model) => BannerDto.fromModel(model));
    const [files] = await Promise.all([
      fileIds.length ? this.fileService.findByIds(fileIds) : []
    ]);
    banners.forEach((v) => {
      const file = files.find((f) => f._id.toString() === v.fileId.toString());
      if (file) v.setPhoto(file);
    });

    return {
      data: banners,
      total
    };
  }
}
