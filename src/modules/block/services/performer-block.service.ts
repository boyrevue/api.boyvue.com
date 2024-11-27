import {
  Injectable,
  Inject,
  forwardRef
} from '@nestjs/common';
import { Model, ObjectId as MongooseMongoId, SortOrder } from 'mongoose';
import {
  EntityNotFoundException
} from 'src/kernel';
import { ObjectId } from 'mongodb';
import { UserDto } from 'src/modules/user/dtos';
import { UserService } from 'src/modules/user/services';
import { uniq } from 'lodash';
import { MailerService } from 'src/modules/mailer';
import { InjectModel } from '@nestjs/mongoose';
import { PerformerBlockCountryDto, PerformerBlockUserDto } from '../dtos';
import {
  PerformerBlockCountriesPayload,
  PerformerBlockUserPayload,
  GetBlockListUserPayload
} from '../payloads';
import { PerformerBlockCountry, PerformerBlockUser } from '../schemas';

@Injectable()
export class PerformerBlockService {
  constructor(
    @InjectModel(PerformerBlockCountry.name) private readonly PerformerBlockCountryModel: Model<PerformerBlockCountry>,
    @InjectModel(PerformerBlockUser.name) private readonly PerformerBlockUserModel: Model<PerformerBlockUser>,
    private readonly mailService: MailerService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService
  ) { }

  public async findBlockCountriesByQuery(query: Record<string, any>): Promise<PerformerBlockCountryDto[]> {
    const items = await this.PerformerBlockCountryModel.find(query);
    return items.map((item) => PerformerBlockCountryDto.fromModel(item));
  }

  public async findOneBlockCountriesByQuery(query: Record<string, any>): Promise<PerformerBlockCountryDto> {
    const item = await this.PerformerBlockCountryModel.findOne(query);
    if (!item) return null;
    return PerformerBlockCountryDto.fromModel(item);
  }

  public async listByQuery(query): Promise<PerformerBlockUserDto[]> {
    const items = await this.PerformerBlockUserModel.find(query);
    return items.map((item) => PerformerBlockUserDto.fromModel(item));
  }

  public async checkBlockedCountryByIp(performerId: string | ObjectId | MongooseMongoId | any, countryCode: string): Promise<boolean> {
    const blockCountries = await this.PerformerBlockCountryModel.findOne({
      sourceId: performerId
    });
    if (!blockCountries) return false;

    return blockCountries.countryCodes?.indexOf(countryCode) > -1;
  }

  public async checkBlockedByPerformer(
    performerId: string | ObjectId | MongooseMongoId | any,
    userId: string | ObjectId
  ): Promise<boolean> {
    const blocked = await this.PerformerBlockUserModel.countDocuments({
      sourceId: performerId,
      targetId: userId
    });

    return blocked > 0;
  }

  public async performerBlockCountries(payload: PerformerBlockCountriesPayload, user: UserDto) {
    const { countryCodes } = payload;
    const item = await this.PerformerBlockCountryModel.findOne({
      sourceId: user._id
    });
    if (item) {
      return this.PerformerBlockCountryModel.updateOne({ sourceId: user._id }, { countryCodes });
    }
    return this.PerformerBlockCountryModel.create({
      source: 'performer',
      sourceId: user._id,
      countryCodes
    });
  }

  public async blockUser(user: UserDto, payload: PerformerBlockUserPayload): Promise<PerformerBlockUserDto> {
    const blocked = await this.PerformerBlockUserModel.findOne({
      sourceId: user._id,
      targetId: payload.targetId
    });
    if (blocked) {
      return PerformerBlockUserDto.fromModel(blocked);
    }
    const target = await this.userService.findById(payload.targetId);
    if (!target) throw new EntityNotFoundException('Target not found!');

    const newBlock = await this.PerformerBlockUserModel.create({
      ...payload,
      source: 'performer',
      sourceId: user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // mailer
    target.email && await this.mailService.send({
      subject: 'Model block',
      to: target.email,
      data: {
        userName: target.name || target.username || `${target.firstName} ${target.lastName}` || 'there',
        message: `${user.name || user.username || 'Model'} has blocked you`
      },
      template: 'block-user-notification'
    });
    return PerformerBlockUserDto.fromModel(newBlock);
  }

  public async unblockUser(user: UserDto, targetId: string) {
    const blocked = await this.PerformerBlockUserModel.findOne({
      sourceId: user._id,
      targetId
    });
    if (!blocked) {
      throw new EntityNotFoundException();
    }

    await blocked.deleteOne();
    const target = await this.userService.findById(targetId);
    // mailer
    target?.email && await this.mailService.send({
      subject: 'Model unblock',
      to: target.email,
      data: {
        userName: target.name || target.username || `${target.firstName} ${target.lastName}` || 'there',
        message: `${user.name || user.username || 'Model'} has unblocked you`
      },
      template: 'block-user-notification'
    });
    return { unlocked: true };
  }

  public async getBlockedUsers(user: UserDto, req: GetBlockListUserPayload) {
    const query: Record<string, any> = { sourceId: user._id };
    let sort: Record<string, SortOrder> = {
      createdAt: -1
    };
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy || 'updatedAt']: req.sort || -1
      };
    }
    const [data, total] = await Promise.all([
      this.PerformerBlockUserModel
        .find(query)
        .sort(sort)
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.PerformerBlockUserModel.countDocuments(query)
    ]);
    const list = data.map((d) => PerformerBlockUserDto.fromModel(d));
    const targetIds = uniq(data.map((d) => d.targetId));
    const users = await this.userService.findByIds(targetIds);
    list.forEach((u) => {
      const info = users.find((s) => `${s._id}` === `${u.targetId}`);
      if (info) u.setTargetInfo(new UserDto(info));
    });
    return {
      data: list,
      total
    };
  }
}
