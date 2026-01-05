import mongoose, { Document, Schema, Model } from 'mongoose';
import { NotificationType } from '../types';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  
  // Related entities
  relatedBooking?: mongoose.Types.ObjectId;
  relatedPayment?: mongoose.Types.ObjectId;
  relatedDispute?: mongoose.Types.ObjectId;
  relatedReview?: mongoose.Types.ObjectId;
  relatedMessage?: mongoose.Types.ObjectId;
  
  // Action
  actionUrl?: string;
  
  // Status
  isRead: boolean;
  readAt?: Date;
  
  // Delivery
  isSent: boolean;
  sentAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  
  // Channels
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  
  // Metadata
  data?: any;
  
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    relatedBooking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    relatedPayment: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    relatedDispute: {
      type: Schema.Types.ObjectId,
      ref: 'Dispute',
    },
    relatedReview: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
    },
    relatedMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    actionUrl: String,
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,
    isSent: {
      type: Boolean,
      default: false,
    },
    sentAt: Date,
    failedAt: Date,
    failureReason: String,
    channels: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      inApp: { type: Boolean, default: true },
    },
    data: Schema.Types.Mixed,
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ isSent: 1 });

// Don't return deleted notifications in queries by default
notificationSchema.pre(/^find/, function (next) {
  // @ts-ignore
  this.find({ isDeleted: { $ne: true } });
  next();
});

const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  notificationSchema
);

export default Notification;
