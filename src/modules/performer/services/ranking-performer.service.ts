import { Injectable, HttpException } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { PerformerDto } from '../dtos';
import { Performer, RankingPerformer } from '../schemas';

@Injectable()
export class RankingPerformerService {
  constructor(
    @InjectModel(Performer.name) private readonly PerformerModel: Model<Performer>,
    @InjectModel(RankingPerformer.name) private readonly RankingPerformerModel: Model<RankingPerformer>
  ) { }

  public async create(payload) {
    if (payload.ordering < 0) throw new HttpException('Ordering can not be smaller than 0', 409);
    const item = await this.RankingPerformerModel.findOne({ performerId: payload.performerId });
    if (item) throw new HttpException('Performer is in the list already', 409);
    await this.RankingPerformerModel.create({
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  public async update(id, payload) {
    await this.RankingPerformerModel.updateOne({ _id: id }, {
      $set: {
        ...payload
      }
    });
  }

  public async delete(id) {
    await this.RankingPerformerModel.deleteOne({ _id: id });
    return true;
  }

  public async getAll() {
    const items = await this.RankingPerformerModel.find({});
    const ids = items.map((i) => i.performerId);
    const performers = await this.PerformerModel.find({
      _id: {
        $in: ids
      }
    });
    return performers.map((p) => {
      const item = PerformerDto.fromModel(p).toSearchResponse();
      const ordering = items.find((i) => i.performerId.toString() === p._id.toString());
      return {
        ...item,
        performerId: item._id,
        _id: ordering._id,
        ordering: ordering?.ordering || 0
      };
    }).sort((a, b) => (a.ordering > b.ordering ? 1 : -1));
  }
}
