import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { Model } from 'mongoose';
import { merge } from 'lodash';
import { EntityNotFoundException } from 'src/kernel';
import { InjectModel } from '@nestjs/mongoose';
import { WalletPackageDto } from '../dtos';
import { WalletPackageCreatePayload, WalletPackageUpdatePayload } from '../payloads';
import { WalletPackage } from '../schemas';

@Injectable()
export class WalletPackageService {
  constructor(
    @InjectModel(WalletPackage.name) private readonly WalletPackageModel: Model<WalletPackage>
  ) { }

  public async create(payload: WalletPackageCreatePayload): Promise<WalletPackageDto> {
    const data: Record<string, any> = { ...payload };
    if (!data.token) {
      data.token = data.price;
    }
    const walletPackage = await this.WalletPackageModel.create(data);
    return WalletPackageDto.fromModel(walletPackage);
  }

  async update(id: string | ObjectId, payload: WalletPackageUpdatePayload): Promise<WalletPackageDto> {
    const walletPackage = await this.WalletPackageModel.findOne({ _id: id });
    if (!walletPackage) {
      throw new EntityNotFoundException();
    }

    merge(walletPackage, payload);
    if (!payload.token) {
      walletPackage.token = walletPackage.price;
    }
    walletPackage.updatedAt = new Date();
    await walletPackage.save();

    return WalletPackageDto.fromModel(walletPackage);
  }

  async delete(id: string | ObjectId) {
    await this.WalletPackageModel.deleteOne({ _id: id });
    return true;
  }

  async findById(id: string | ObjectId): Promise<WalletPackageDto> {
    const walletPackage = await this.WalletPackageModel.findOne({ _id: id });
    if (!walletPackage) return null;
    return WalletPackageDto.fromModel(walletPackage);
  }
}
