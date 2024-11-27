import {
  Prop, Schema, SchemaFactory
} from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({
  _id: false
})
export class VideoStats {
  @Prop({
    default: 0
  })
  likes: number;

  @Prop({
    default: 0
  })
  favourites: number;

  @Prop({
    default: 0
  })
  comments: number;

  @Prop({
    default: 0
  })
  views: number;

  @Prop({
    default: 0
  })
  wishlists: number;
}

const VideoStatsSchema = SchemaFactory.createForClass(VideoStats);

@Schema({
  collection: 'performervideos'
})
export class Video {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true
  })
  performerId: ObjectId;

  @Prop({
    _id: false,
    type: [{
      type: MongooseSchema.Types.ObjectId
    }],
    index: true
  })
  participantIds: ObjectId[];

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  fileId: ObjectId;

  @Prop({
    index: true
  })
  type: string;

  @Prop()
  title: string;

  @Prop({
    index: true,
    unique: true,
    lowercase: true,
    trim: true,
    sparse: true
  })
  slug: string;

  @Prop()
  description: string;

  @Prop({
    default: 'active',
    index: true
  })
  status: string;

  @Prop({
    type: [{
      type: String
    }],
    index: true
  })
  tags: string[];

  @Prop({
    default: false
  })
  isSchedule: boolean;

  @Prop()
  scheduledAt: Date;

  @Prop({
    default: false
  })
  isSaleVideo: boolean;

  @Prop({
    default: 0
  })
  price: number;

  @Prop()
  processing: boolean;

  @Prop()
  teaserProcessing: boolean;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  thumbnailId: ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  teaserId: ObjectId;

  @Prop()
  tagline: string;

  @Prop({
    type: VideoStatsSchema,
    default: {
      likes: 0,
      favourites: 0,
      comments: 0,
      views: 0,
      wishlists: 0
    }
  })
  stats: VideoStats;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  createdBy: ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId
  })
  updatedBy: ObjectId;

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

export type VideoDocument = HydratedDocument<Video>;

export const VideoSchema = SchemaFactory.createForClass(Video);
