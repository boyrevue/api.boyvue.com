import { ObjectId } from 'mongodb';

import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { STATUS_ACTIVE } from '../constants';

@Schema({
  _id: false
})
export class UserStats {
  @Prop({
    default: 0
  })
  totalViewTime: number;

  @Prop({
    default: 0
  })
  totalTokenEarned: number;

  @Prop({
    default: 0
  })
  totalTokenSpent: number;
}

const UserStatsSchema = SchemaFactory.createForClass(UserStats);

@Schema({
  collection: 'users'
})
export class User {
  @Prop()
  name: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop({
    type: String,
    trim: true
  })
  username: string;

  @Prop({
    type: String,
    lowercase: true,
    trim: true
  })
  email: string;

  @Prop({
    default: false
  })
  verifiedEmail: boolean;

  @Prop()
  phone: string;

  @Prop({
    type: [{
      type: String
    }]
  })
  roles: string[];

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  avatarId: ObjectId;

  @Prop()
  avatarPath: string;

  @Prop({
    default: STATUS_ACTIVE
  })
  status: string;

  @Prop()
  gender: string;

  @Prop({
    default: 0
  })
  balance: number;

  @Prop()
  country: string;

  @Prop()
  isOnline: boolean;

  @Prop()
  onlineAt: Date;

  @Prop()
  offlineAt: Date;

  @Prop({
    type: UserStatsSchema,
    default: {
      totalViewTime: 0,
      totalTokenEarned: 0,
      totalTokenSpent: 0
    }
  })
  stats: UserStats;

  @Prop()
  dateOfBirth: Date;

  @Prop({
    type: Date,
    default: Date.now
  })
  createdAt: Date;

  @Prop({
    type: Date,
    default: Date.now
  })
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, {
  name: 'idx_email',
  unique: true,
  sparse: true
});

UserSchema.index({ username: 1 }, {
  name: 'idx_username',
  unique: true,
  sparse: true
});

UserSchema.index({ status: 1 }, {
  name: 'idx_status'
});
