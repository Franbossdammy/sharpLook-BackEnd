import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IDeviceToken extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  token: string;
  deviceType: 'ios' | 'android' | 'web';
  deviceName?: string;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const deviceTokenSchema = new Schema<IDeviceToken>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true,
      index: true,
    },
    deviceType: {
      type: String,
      enum: ['ios', 'android', 'web'],
      required: true,
    },
    deviceName: String,
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
deviceTokenSchema.index({ user: 1, isActive: 1 });
deviceTokenSchema.index({ token: 1 }, { unique: true });

const DeviceToken: Model<IDeviceToken> = mongoose.model<IDeviceToken>(
  'DeviceToken',
  deviceTokenSchema
);

export default DeviceToken;
