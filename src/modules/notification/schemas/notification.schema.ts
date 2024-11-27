import { ObjectId } from 'mongodb';
import { Schema } from 'mongoose';

export const NotificationSchema = new Schema({
  userId: {
    type: ObjectId,
    index: true
  },
  type: String, // performer, video...
  action: String, // like, dislike...
  title: String,
  message: String,
  thumbnail: String,
  avatar: String,
  refId: ObjectId,
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  createdBy: ObjectId,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});
