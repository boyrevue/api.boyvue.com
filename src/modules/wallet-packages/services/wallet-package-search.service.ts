import { Injectable } from '@nestjs/common';
import { Model, SortOrder } from 'mongoose';
import { PageableData } from 'src/kernel';
import { InjectModel } from '@nestjs/mongoose';
import { WalletPackageDto } from '../dtos';
import { WalletPackageSearchRequest } from '../payloads';
import { WalletPackage } from '../schemas';

@Injectable()
export class WalletPackageSearchService {
  constructor(
    @InjectModel(WalletPackage.name) private readonly WalletPackageModel: Model<WalletPackage>
  ) { }

  public async search(req: WalletPackageSearchRequest): Promise<PageableData<Partial<WalletPackageDto>>> {
    const query: Record<string, any> = {
      status: 'active'
    };
    if (req.q) {
      query.$or = [
        {
          name: { $regex: req.q }
        }
      ];
    }

    const sort = {
      [req.sortBy || 'updatedAt']: req.sort
    };
    const [walletPackages, total] = await Promise.all([
      this.WalletPackageModel
        .find(query)
        .sort(sort)
        .skip(Number(req.offset))
        .limit(Number(req.limit))
        .exec(),
      this.WalletPackageModel.countDocuments(query)
    ]);

    return {
      total,
      data: walletPackages.map((walletPackage) => WalletPackageDto.fromModel(walletPackage).toResponse())
    };
  }

  public async adminSearch(req: WalletPackageSearchRequest): Promise<PageableData<WalletPackageDto>> {
    const query: Record<string, any> = {};
    if (req.q) {
      query.$or = [
        {
          name: { $regex: req.q }
        }
      ];
    }
    if (req.status) query.status = req.status;
    const sort: Record<string, SortOrder> = {
      [req.sortBy || 'updatedAt']: req.sort
    };
    const [walletPackages, total] = await Promise.all([
      this.WalletPackageModel
        .find(query)
        .sort(sort)
        .skip(Number(req.offset))
        .limit(Number(req.limit))
        .exec(),
      this.WalletPackageModel.countDocuments(query)
    ]);

    return {
      total,
      data: walletPackages.map((walletPackage) => WalletPackageDto.fromModel(walletPackage))
    };
  }
}
