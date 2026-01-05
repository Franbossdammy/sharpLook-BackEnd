import mongoose, { Document, Schema, Model } from 'mongoose';
import { DisputeStatus, DisputeResolution } from '../types';

export interface IDispute extends Document {
  _id: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  raisedBy: mongoose.Types.ObjectId;
  against: mongoose.Types.ObjectId;
  
  // Dispute details
  reason: string;
  description: string;
  category: 'service_quality' | 'payment' | 'cancellation' | 'communication' | 'other';
  
  // Evidence
  evidence: {
    type: 'text' | 'image' | 'document';
    content: string;
    uploadedAt: Date;
    uploadedBy: mongoose.Types.ObjectId;
  }[];
  
  // Status
  status: DisputeStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Admin handling
  assignedTo?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  
  // Resolution
  resolution?: DisputeResolution;
  resolutionDetails?: string;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  
  // Refund details (if applicable)
  refundAmount?: number;
  vendorPaymentAmount?: number;
  
  // Communication
  messages: {
    sender: mongoose.Types.ObjectId;
    message: string;
    attachments?: string[];
    sentAt: Date;
  }[];
  
  // Tracking
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId;
  
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const disputeSchema = new Schema<IDispute>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking is required'],
      index: true,
    },
    raisedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Raised by user is required'],
      index: true,
    },
    against: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Against user is required'],
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [200, 'Reason cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      enum: ['service_quality', 'payment', 'cancellation', 'communication', 'other'],
      required: true,
      index: true,
    },
    evidence: [
      {
        type: {
          type: String,
          enum: ['text', 'image', 'document'],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        uploadedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      },
    ],
    status: {
      type: String,
      enum: Object.values(DisputeStatus),
      default: DisputeStatus.OPEN,
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    reviewNotes: String,
    resolution: {
      type: String,
      enum: Object.values(DisputeResolution),
    },
    resolutionDetails: String,
    resolvedAt: Date,
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    refundAmount: Number,
    vendorPaymentAmount: Number,
    messages: [
      {
        sender: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        message: {
          type: String,
          required: true,
          maxlength: [1000, 'Message cannot exceed 1000 characters'],
        },
        attachments: [String],
        sentAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    closedAt: Date,
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
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
disputeSchema.index({ booking: 1 });
disputeSchema.index({ raisedBy: 1, status: 1 });
disputeSchema.index({ against: 1, status: 1 });
disputeSchema.index({ assignedTo: 1, status: 1 });
disputeSchema.index({ status: 1, priority: -1 });
disputeSchema.index({ createdAt: -1 });
disputeSchema.index({ category: 1 });

// Don't return deleted disputes in queries by default
disputeSchema.pre(/^find/, function (next) {
  // @ts-ignore
  this.find({ isDeleted: { $ne: true } });
  next();
});

const Dispute: Model<IDispute> = mongoose.model<IDispute>('Dispute', disputeSchema);

export default Dispute;
