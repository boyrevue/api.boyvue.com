import {
  Injectable, Inject, forwardRef, ForbiddenException
} from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { FileDto } from 'src/modules/file';
import {
  EntityNotFoundException, StringHelper, QueueEventService,
  QueueEvent
} from 'src/kernel';
import { EVENT } from 'src/kernel/constants';
import { AuthService } from 'src/modules/auth/services';
import { PerformerService } from 'src/modules/performer/services';
import { PerformerDto } from 'src/modules/performer/dtos';
import { SocketUserService } from 'src/modules/socket/services/socket-user.service';
import { InjectModel } from '@nestjs/mongoose';
import {
  UserUpdatePayload, UserAuthUpdatePayload, UserAuthCreatePayload, UserCreatePayload
} from '../payloads';
import { UserDto } from '../dtos';
import { DELETE_USER_CHANNEL, ROLE_USER, STATUS_ACTIVE } from '../constants';
import { EmailHasBeenTakenException } from '../exceptions';
import { UsernameExistedException } from '../exceptions/username-existed.exception';
import { User } from '../schemas';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly UserModel: Model<User>,
    private readonly queueEventService: QueueEventService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => SocketUserService))
    private readonly socketService: SocketUserService
  ) { }

  public async findByUsernameOrEmail(text: string): Promise<UserDto> {
    if (!text) return null;

    const query = {
      $or: [{
        email: text.toLowerCase()
      }, {
        username: text.toLowerCase()
      }]
    };
    return this.UserModel.findOne(query);
  }

  public async findByEmail(email: string): Promise<UserDto> {
    if (!email) return null;

    const item = await this.UserModel.findOne({ email: email.toLowerCase() });
    if (!item) return null;

    return UserDto.fromModel(item);
  }

  public async findById(id: string | ObjectId): Promise<UserDto> {
    const item = await this.UserModel.findById(id);
    if (!item) return null;

    return UserDto.fromModel(item);
  }

  public async getMe(id: string | ObjectId, jwToken: string): Promise<Partial<UserDto | PerformerDto>> {
    const user = await this.UserModel.findById(id);
    if (user) {
      const dto = UserDto.fromModel(user);
      return dto.toResponse(true);
    }
    const performer = await this.performerService.getDetails(id, jwToken);
    if (!performer && !user) {
      throw new EntityNotFoundException();
    }
    return performer.toResponse(true);
  }

  public async findByUsername(username: string): Promise<UserDto> {
    const newUsername = username.trim().toLowerCase();
    const user = await this.UserModel.findOne({ username: newUsername });
    if (!user) return null;
    return UserDto.fromModel(user);
  }

  public async findByIds(ids: any[]): Promise<UserDto[]> {
    const items = await this.UserModel.find({ _id: { $in: ids } });
    return items.map((item) => UserDto.fromModel(item));
  }

  public async isEmailorUsernameTaken(payload: {
    username?: string;
    email?: string;
  }) {
    const val = (payload.username || payload.email).trim().toLowerCase();
    const count = await this.UserModel.countDocuments({
      $or: [{
        email: val
      }, {
        username: val
      }]
    });
    return count > 0;
  }

  public async create(data: UserCreatePayload | UserAuthCreatePayload, options: Record<string, any> = {}): Promise<UserDto> {
    if (!data || !data.email) {
      throw new EntityNotFoundException();
    }
    const countUserEmail = await this.UserModel.countDocuments({
      email: data.email.toLowerCase()
    });
    const countPerformerEmail = await this.performerService.isEmailorUsernameTaken({ email: data.email });
    if (countUserEmail || countPerformerEmail) {
      throw new EmailHasBeenTakenException();
    }
    const countUserUsername = data.username && await this.findByUsername(data.username);
    const countPerformerUsername = data.username && await this.performerService.isEmailorUsernameTaken({ username: data.username });
    if (countUserUsername || countPerformerUsername) {
      throw new UsernameExistedException();
    }
    const payload: Record<string, any> = { ...data };
    payload.email = data.email.toLowerCase();
    payload.username = data.username && data.username.trim().toLowerCase();
    payload.createdAt = new Date();
    payload.updatedAt = new Date();
    payload.roles = options.roles || [ROLE_USER];
    payload.status = options.status || STATUS_ACTIVE;
    if (!payload.name) {
      payload.name = payload.username || [payload.firstName || '', payload.lastName || ''].filter((n) => !!n).join(' ');
    }
    const resp = await this.UserModel.create(payload);

    return UserDto.fromModel(resp);
  }

  /**
   * TODO - check me!!
   * @param data
   * @returns
   */
  public async socialCreate(data): Promise<UserDto> {
    const payload = { ...data };
    if (!data.name) {
      payload.name = payload.username || [payload.firstName || '', payload.lastName || ''].filter((n) => !!n).join(' ');
    }
    const resp = await this.UserModel.create(payload);
    return UserDto.fromModel(resp);
  }

  public async update(id: string | ObjectId, payload: UserUpdatePayload, user?: UserDto): Promise<any> {
    const data: Record<string, any> = {
      ...payload,
      updatedAt: new Date()
    };
    const eUser = await this.UserModel.findById(id);
    if (!eUser) {
      throw new EntityNotFoundException();
    }
    if (user && !user.roles.includes('admin') && `${user._id}` !== `${id}`) {
      throw new ForbiddenException();
    }
    if (!data.name) {
      data.name = data.username || [data.firstName || '', data.lastName || ''].filter((n) => !!n).join(' ');
    }
    if (data.username && data.username !== eUser.username) {
      const countUserUsername = await this.UserModel.countDocuments({
        username: data.username.trim().toLowerCase(),
        _id: { $ne: eUser._id }
      });
      const countPerformerUsername = await this.performerService.isEmailorUsernameTaken({ username: data.username });
      if (countUserUsername || countPerformerUsername) {
        throw new UsernameExistedException();
      }
      data.username = data.username.trim().toLowerCase();
    }
    if (data.email && data.email !== eUser.email) {
      const countUserEmail = await this.UserModel.countDocuments({
        email: data.email.toLowerCase(),
        _id: { $ne: eUser._id }
      });
      const countPerformerEmail = await this.performerService.isEmailorUsernameTaken({ email: data.email });
      if (countUserEmail || countPerformerEmail) {
        throw new EmailHasBeenTakenException();
      }
      data.email = data.email.toLowerCase();
      data.verifiedEmail = false;
    }
    await this.UserModel.updateOne({ _id: id }, data);
    const newUser = await this.UserModel.findById(id);
    if (data.email && data.email !== eUser.email) {
      await Promise.all([
        this.authService.sendVerificationEmail({
          source: 'user',
          sourceId: newUser._id,
          email: newUser.email
        }),
        this.authService.updateEmailKey(newUser._id, newUser.email.toLowerCase())
      ]);
    }
    return newUser;
  }

  public async updateAvatar(user: UserDto, file: FileDto) {
    // TODO - double check me
    await this.UserModel.updateOne(
      { _id: user._id },
      {
        avatarId: file._id,
        avatarPath: file.path
      }
    );

    // resend user info?
    // TODO - check others config for other storage
    return file;
  }

  public async adminUpdate(id: string | ObjectId, payload: UserAuthUpdatePayload): Promise<boolean> {
    const user = await this.UserModel.findById(id);
    if (!user) {
      throw new EntityNotFoundException();
    }

    const data = { ...payload, updatedAt: new Date() };
    if (!data.name) {
      data.name = data.username || [data.firstName || '', data.lastName || ''].filter((n) => !!n).join(' ');
    }

    if (data.username && data.username !== user.username) {
      const countUserUsername = await this.UserModel.countDocuments({
        username: data.username.trim().toLowerCase(),
        _id: { $ne: user._id }
      });
      const countPerformerUsername = await this.performerService.isEmailorUsernameTaken({ username: data.username });
      if (countUserUsername || countPerformerUsername) {
        throw new UsernameExistedException();
      }
      data.username = data.username.trim().toLowerCase();
    }
    if (data.email && data.email !== user.email) {
      const countUserEmail = await this.UserModel.countDocuments({
        email: data.email.toLowerCase(),
        _id: { $ne: user._id }
      });
      const countPerformerEmail = await this.performerService.isEmailorUsernameTaken({ email: data.email });
      if (countUserEmail || countPerformerEmail) {
        throw new EmailHasBeenTakenException();
      }
      data.email = data.email.toLowerCase();
      data.verifiedEmail = false;
    }

    await this.UserModel.updateOne({ _id: id }, data);
    // update auth key if username or email has changed
    const newUser = await this.UserModel.findById(id);
    if (data.email && data.email.toLowerCase() !== user.email) {
      await this.authService.sendVerificationEmail({
        source: 'user',
        sourceId: user._id,
        email: newUser.email
      });
      await this.authService.updateEmailKey(newUser._id, newUser.email);
    }

    return true;
  }

  public async updateVerificationStatus(userId: string | ObjectId, status = STATUS_ACTIVE): Promise<boolean> {
    await this.UserModel.updateOne(
      {
        _id: userId
      },
      {
        verifiedEmail: true,
        status
      }
    );
    return true;
  }

  public async updateStats(
    id: string | ObjectId,
    payload: Record<string, number>
  ) {
    return this.UserModel.updateOne({ _id: id }, { $inc: payload });
  }

  public async delete(id: string) {
    if (!StringHelper.isObjectId(id)) throw new ForbiddenException();
    const user = await this.UserModel.findById(id);
    if (!user) throw new EntityNotFoundException();

    await this.UserModel.deleteOne({ _id: id });
    await this.queueEventService.publish(new QueueEvent({
      channel: DELETE_USER_CHANNEL,
      eventName: EVENT.DELETED,
      data: UserDto.fromModel(user)
    }));
    return { deleted: true };
  }

  public async increaseBalance(id: string | ObjectId, amount: number, withStats = true) {
    const $inc = withStats
      ? {
        balance: amount,
        'stats.totalTokenEarned': amount > 0 ? Math.abs(amount) : 0,
        'stats.totalTokenSpent': amount <= 0 ? Math.abs(amount) : 0
      } : { balance: amount };
    await this.UserModel.updateOne(
      { _id: id },
      {
        $inc
      }
    );

    const newBalance = await this.UserModel.findOne({ _id: id }).select('balance');
    if (newBalance) {
      await this.socketService.emitToUsers(id, 'balance_update', {
        balance: newBalance.balance
      });
    }

    return true;
  }

  public async buyTokenSuccess(id: string | ObjectId, value: number) {
    await this.UserModel.updateOne({ _id: id }, { $inc: { balance: value } });
    return true;
  }

  public async getUserBalance(id: string | ObjectId) {
    const user = await this.UserModel.findById(id);
    return {
      balance: user?.balance || 0
    };
  }

  public async countByStatus(status: string): Promise<number> {
    return this.UserModel.countDocuments({ status });
  }
}
