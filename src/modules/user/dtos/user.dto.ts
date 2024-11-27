import { ObjectId } from 'mongodb';
import { pick } from 'lodash';
import { FileDto } from 'src/modules/file';
import { Expose, Transform, plainToInstance } from 'class-transformer';

interface IUserStats {
  totalViewTime: number;
  totalTokenEarned: number;
  totalTokenSpent: number;
}

export class UserDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  name: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  email: string;

  @Expose()
  phone: string;

  @Expose()
  @Transform(({ obj }) => obj.roles)
  roles: string[] = ['user'];

  @Expose()
  @Transform(({ obj }) => obj.avatarId)
  avatarId: string | ObjectId;

  @Expose()
  avatarPath: string;

  @Expose()
  avatar: string;

  @Expose()
  status: string;

  @Expose()
  username: string;

  @Expose()
  gender: string;

  @Expose()
  country: string; // iso code

  @Expose()
  verifiedEmail: boolean;

  @Expose()
  isOnline: boolean;

  @Expose()
  stats: IUserStats;

  @Expose()
  @Transform(({ obj }) => {
    if (obj.balance < 0) return 0;
    const newVal = parseFloat((obj.balance || 0).toFixed(2));
    return newVal;
  })
  balance: number;

  @Expose()
  dateOfBirth: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  isPerformer: boolean = false;

  constructor(data: Partial<UserDto>) {
    data
      && Object.assign(
        this,
        pick(data, [
          '_id',
          'name',
          'firstName',
          'lastName',
          'email',
          'phone',
          'roles',
          'avatarId',
          'avatarPath',
          'avatar',
          'status',
          'username',
          'gender',
          'country',
          'verifiedEmail',
          'isOnline',
          'stats',
          'balance',
          'createdAt',
          'updatedAt',
          'isPerformer',
          'dateOfBirth'
        ])
      );
  }

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(UserDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  getName() {
    if (this.name) return this.name;
    return [this.firstName || '', this.lastName || ''].join(' ');
  }

  toResponse(includePrivateInfo = false, isAdmin = false): Partial<UserDto> {
    const publicInfo = {
      _id: this._id,
      firstName: this.firstName,
      lastName: this.lastName,
      name: this.getName(),
      avatar: FileDto.getPublicUrl(this.avatarPath),
      username: this.username,
      email: this.email,
      stats: this.stats,
      isOnline: this.isOnline,
      gender: this.gender,
      country: this.country,
      isPerformer: this.isPerformer,
      dateOfBirth: this.dateOfBirth,
      createdAt: this.createdAt
    };

    const privateInfo = {
      email: this.email,
      phone: this.phone,
      status: this.status,
      roles: this.roles,
      verifiedEmail: this.verifiedEmail,
      balance: this.balance,
      updatedAt: this.updatedAt
    };

    if (isAdmin) {
      return {
        ...publicInfo,
        ...privateInfo
      };
    }

    if (!includePrivateInfo) {
      return publicInfo;
    }

    return {
      ...publicInfo,
      ...privateInfo
    };
  }

  toSearchResponse() {
    return {
      _id: this._id,
      avatar: FileDto.getPublicUrl(this.avatarPath),
      username: this.username,
      email: this.email,
      stats: this.stats,
      isOnline: this.isOnline,
      gender: this.gender,
      country: this.country,
      isPerformer: this.isPerformer,
      dateOfBirth: this.dateOfBirth,
      createdAt: this.createdAt
    };
  }
}
