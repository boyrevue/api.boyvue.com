import { Injectable, HttpException } from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import {
  EntityNotFoundException
} from 'src/kernel';
import { FileDto } from 'src/modules/file';
import { FileService } from 'src/modules/file/services';
import { merge } from 'lodash';
import { REF_TYPE } from 'src/modules/file/constants';
import { InjectModel } from '@nestjs/mongoose';
import { BANNER_STATUS } from '../constants';
import { BannerDto } from '../dtos';
import { BannerCreatePayload, BannerUpdatePayload } from '../payloads';
import { Banner } from '../schemas';

export const BANNER_CHANNEL = 'BANNER_CHANNEL';

@Injectable()
export class BannerService {
  constructor(
    @InjectModel(Banner.name) private readonly BannerModel: Model<Banner>,
    private readonly fileService: FileService
  ) {
  }

  public async create(file: FileDto, payload: BannerCreatePayload): Promise<BannerDto> {
    if (!file) throw new HttpException('File is valid!', 400);
    if (!file.isImage()) {
      await this.fileService.removeIfNotHaveRef(file._id);
      throw new HttpException('Invalid image!', 400);
    }

    const banner = new this.BannerModel(payload);
    if (!banner.title) banner.title = file.name;

    banner.fileId = file._id;
    banner.createdAt = new Date();
    banner.updatedAt = new Date();
    await banner.save();
    await Promise.all([
      this.fileService.addRef(file._id, {
        itemType: REF_TYPE.BANNER,
        itemId: banner._id
      })
    ]);

    return BannerDto.fromModel(banner);
  }

  public async updateInfo(id: string | ObjectId, payload: BannerUpdatePayload): Promise<BannerDto> {
    const banner = await this.BannerModel.findById(id);
    if (!banner) {
      throw new EntityNotFoundException();
    }

    merge(banner, payload);
    if (
      banner.status !== BANNER_STATUS.FILE_ERROR
      && payload.status !== BANNER_STATUS.FILE_ERROR
    ) {
      banner.status = payload.status;
    }
    banner.updatedAt = new Date();
    await banner.save();
    return BannerDto.fromModel(banner);
  }

  public async details(id: string | ObjectId): Promise<BannerDto> {
    const banner = await this.BannerModel.findOne({ _id: id });
    if (!banner) {
      throw new EntityNotFoundException();
    }

    const dto = BannerDto.fromModel(banner);
    const [file] = await Promise.all([
      banner.fileId ? this.fileService.findById(banner.fileId) : null
    ]);
    if (file) {
      dto.photo = {
        url: file.getUrl(),
        thumbnails: file.getThumbnails(),
        width: file.width,
        height: file.height
      };
    }

    return dto;
  }

  public async delete(id: string | ObjectId) {
    const banner = await this.BannerModel.findById(id);
    if (!banner) {
      throw new EntityNotFoundException();
    }
    const { fileId } = banner;

    await banner.deleteOne();
    // TODO - should check ref and remove
    fileId && await this.fileService.remove(banner.fileId);
    return true;
  }
}
