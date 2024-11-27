import { HttpException, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { EntityNotFoundException } from 'src/kernel';
import { InjectModel } from '@nestjs/mongoose';
import {
  BlockCountryCreatePayload
} from '../payloads';
import { BlockCountry } from '../schemas';
import { BlockCountryDto } from '../dtos';

@Injectable()
export class SiteBlockCountryService {
  constructor(
    @InjectModel(BlockCountry.name) private readonly BlockCountryModel: Model<BlockCountry>
  ) { }

  public async create(payload: BlockCountryCreatePayload): Promise<BlockCountryDto> {
    const country = await this.BlockCountryModel.findOne({ countryCode: payload.countryCode });
    if (country) {
      throw new HttpException('ALREADY_BLOCKED', 400);
    }
    const item = await this.BlockCountryModel.create({
      countryCode: payload.countryCode,
      createdAt: new Date()
    });

    return BlockCountryDto.fromModel(item);
  }

  public async getAll(): Promise<BlockCountryDto[]> {
    const items = await this.BlockCountryModel.find();
    return items.map((item) => BlockCountryDto.fromModel(item));
  }

  public async delete(code): Promise<boolean> {
    const country = await this.BlockCountryModel.findOne({ countryCode: code });
    if (!country) {
      throw new EntityNotFoundException();
    }
    await country.deleteOne();
    return true;
  }

  public async checkCountryBlock(countryCode) {
    const country = await this.BlockCountryModel.countDocuments({ countryCode });

    return { blocked: country > 0 };
  }
}
