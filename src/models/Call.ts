import mongoose, { Document, Schema } from 'mongoose';

export interface ICall extends Document {
  caller: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  type: 'voice' | 'video';
  status: 'initiated' | 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended' | 'busy' | 'cancelled';
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema = new Schema<ICall>(
  {
    caller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['voice', 'video'],
      required: true,
    },
    status: {
      type: String,
      enum: ['initiated', 'ringing', 'accepted', 'rejected', 'missed', 'ended', 'busy', 'cancelled'],
      default: 'initiated',
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
CallSchema.index({ caller: 1, createdAt: -1 });
CallSchema.index({ receiver: 1, createdAt: -1 });
CallSchema.index({ status: 1 });
CallSchema.index({ createdAt: -1 });

// Virtual for populating user details
CallSchema.virtual('callerDetails', {
  ref: 'User',
  localField: 'caller',
  foreignField: '_id',
  justOne: true,
});

CallSchema.virtual('receiverDetails', {
  ref: 'User',
  localField: 'receiver',
  foreignField: '_id',
  justOne: true,
});

CallSchema.set('toJSON', { virtuals: true });
CallSchema.set('toObject', { virtuals: true });

export default mongoose.model<ICall>('Call', CallSchema);