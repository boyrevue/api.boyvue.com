import {
  OFFLINE
} from 'src/modules/stream/constant';

import { ObjectId } from 'mongodb';

import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  _id: false
})
export class PerformerStats {
  @Prop({
    default: 0
  })
  likes: number;

  @Prop({
    default: 0
  })
  subscribers: number;

  @Prop({
    default: 0
  })
  views: number;

  @Prop({
    default: 0
  })
  totalVideos: number;

  @Prop({
    default: 0
  })
  totalPhotos: number;

  @Prop({
    default: 0
  })
  totalGalleries: number;

  @Prop({
    default: 0
  })
  totalProducts: number;

  @Prop({
    default: 0
  })
  totalStreamTime: number;

  @Prop({
    default: 0
  })
  totalTokenEarned: number;

  @Prop({
    default: 0
  })
  totalTokenSpent: number;

  @Prop({
    default: 0
  })
  totalFeeds: number;
}

const PerformerStatsSchema = SchemaFactory.createForClass(PerformerStats);

@Schema({
  collection: 'performers'
})
export class Performer {
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

  @Prop()
  status: string;

  @Prop()
  phone: string;

  @Prop()
  phoneCode: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  avatarId: ObjectId;

  @Prop()
  avatarPath: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  coverId: ObjectId;

  @Prop()
  coverPath: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  idVerificationId: ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  documentVerificationId: ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  welcomeVideoId: ObjectId;

  @Prop()
  welcomeVideoPath: string;

  @Prop({
    default: false
  })
  completedAccount: boolean;

  @Prop()
  ondatoIDV: String;

  @Prop({
    type: MongooseSchema.Types.Mixed
  })
  ondatoMetadata: Record<string, any>;

  @Prop({
    default: true
  })
  activateWelcomeVideo: boolean;

  @Prop({
    default: false
  })
  verifiedEmail: boolean;

  @Prop({
    default: false
  })
  verifiedAccount: boolean;

  @Prop({
    default: false
  })
  verifiedDocument: boolean;

  @Prop()
  gender: string;

  @Prop()
  country: string;

  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop()
  zipcode: string;

  @Prop()
  address: string;

  @Prop({
    type: [{
      type: String
    }]
  })
  languages: string[];

  @Prop({
    type: [{
      type: MongooseSchema.Types.ObjectId
    }]
  })
  categoryIds: ObjectId[];

  @Prop()
  height: string;

  @Prop()
  weight: string;

  @Prop()
  bio: string;

  @Prop()
  eyes: string;

  @Prop()
  sexualPreference: string;

  @Prop()
  butt: string;

  @Prop()
  hair: string;

  @Prop()
  pubicHair: string;

  @Prop()
  ethnicity: string;

  @Prop()
  bodyType: string;

  @Prop()
  dateOfBirth: Date;

  @Prop({
    default: 1
  })
  monthlyPrice: number;

  @Prop({
    default: 1
  })
  yearlyPrice: number;

  @Prop({
    type: PerformerStatsSchema,
    default: {
      likes: 0,
      subscribers: 0,
      views: 0,
      totalVideos: 0,
      totalPhotos: 0,
      totalGalleries: 0,
      totalProducts: 0,
      totalStreamTime: 0,
      totalTokenEarned: 0,
      totalTokenSpent: 0,
      totalFeeds: 0
    }
  })
  stats: PerformerStats;

  @Prop()
  score: number;

  @Prop({
    default: false
  })
  isOnline: boolean;

  @Prop()
  onlineAt: Date;

  @Prop()
  offlineAt: Date;

  @Prop({
    default: 20
  })
  groupChatPrice: number;

  @Prop({
    default: 30
  })
  privateChatPrice: number;

  @Prop()
  lastStreamingTime: Date;

  @Prop()
  maxParticipantsAllowed: number;

  @Prop({
    default: false
  })
  live: boolean;

  @Prop({
    default: OFFLINE
  })
  streamingStatus: string;

  @Prop({
    default: 0
  })
  balance: number;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  createdBy: ObjectId;

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

export type PerformerDocument = HydratedDocument<Performer>;

export const PerformerSchema = SchemaFactory.createForClass(Performer);

PerformerSchema.index({ email: 1 }, {
  name: 'idx_email',
  unique: true,
  sparse: true
});

PerformerSchema.index({ username: 1 }, {
  name: 'idx_username',
  unique: true,
  sparse: true
});

PerformerSchema.index({ status: 1 }, {
  name: 'idx_status'
});

PerformerSchema.index({ streamingStatus: 1 }, {
  name: 'idx_streamingStatus'
});

PerformerSchema.index({ score: 1 }, {
  name: 'idx_score'
});

// TODO - check and index field correctly
// TODO - move to service
// performerSchema.pre<any>('updateOne', async function preUpdateOne(next) {
//   const model = await this.model.findOne(this.getQuery());
//   if (!model) return next(null);
//   const { stats } = model;
//   if (!stats) {
//     return next(null);
//   }
//   const score = (stats.subscribers || 0) * 3 + (stats.likes || 0) * 2 + (stats.views || 0);
//   model.score = score || 0;
//   await model.save();
//   return next(null);
// });
