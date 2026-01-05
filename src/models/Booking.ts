import mongoose, { Document, Schema, Model } from 'mongoose';
import { BookingStatus, BookingType } from '../types';

export interface IBooking extends Document {
  _id: mongoose.Types.ObjectId;
  bookingType: BookingType;
  client: mongoose.Types.ObjectId;
  vendor: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  offer?: mongoose.Types.ObjectId; // If offer-based booking
  
  // Booking details
  scheduledDate: Date;
  scheduledTime?: string;
  duration?: number; // in minutes
  
  // Location (for home services)
  location?: {
    type: string;
    coordinates: [number, number];
    address: string;
    city: string;
    state: string;
  };
  
  // Pricing
  servicePrice: number;
  distanceCharge: number;
  totalAmount: number;
  
  // Status
  status: BookingStatus;
  statusHistory: {
    status: BookingStatus;
    changedAt: Date;
    changedBy: mongoose.Types.ObjectId;
    reason?: string;
  }[];
  
  // Notes
  clientNotes?: string;
  vendorNotes?: string;
  
  // Completion
  completedAt?: Date;
  completedBy?: 'client' | 'vendor' | 'both';
  clientMarkedComplete: boolean;
  vendorMarkedComplete: boolean;
  
  // Payment
  paymentId?: mongoose.Types.ObjectId;
  paymentStatus: 'pending' | 'escrowed' | 'released' | 'refunded' | 'partially_refunded';
  paymentReference?: string;
  paymentExpiresAt?: Date;
  cancellationPenalty?: number;
  
  // Cancellation
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancellationReason?: string;
  
  // Dispute
  hasDispute: boolean;
  disputeId?: mongoose.Types.ObjectId;
  
  // Review
  hasReview: boolean;
  reviewId?: mongoose.Types.ObjectId;
  
  // Timestamps
  acceptedAt?: Date;
  rejectedAt?: Date;
  
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    bookingType: {
      type: String,
      enum: Object.values(BookingType),
      default: BookingType.STANDARD,
      required: true,
    },
    client: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Client is required'],
      index: true,
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vendor is required'],
      index: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
       required: function(this: IBooking) {
    // Service is only required for direct bookings, not offer-based bookings
    return this.bookingType !== BookingType.OFFER_BASED;
  },
      index: true,
    },
    offer: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
      index: true,
    },
    scheduledTime: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    duration: {
      type: Number,
      min: [0, 'Duration cannot be negative'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
      address: String,
      city: String,
      state: String,
    },
    servicePrice: {
      type: Number,
      required: true,
      min: [0, 'Service price cannot be negative'],
    },
    distanceCharge: {
      type: Number,
      default: 0,
      min: [0, 'Distance charge cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
      index: true,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: Object.values(BookingStatus),
          required: true,
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        reason: String,
      },
    ],
    clientNotes: {
      type: String,
      maxlength: [1000, 'Client notes cannot exceed 1000 characters'],
    },
    vendorNotes: {
      type: String,
      maxlength: [1000, 'Vendor notes cannot exceed 1000 characters'],
    },
    completedAt: Date,
    completedBy: {
      type: String,
      enum: ['client', 'vendor', 'both'],
    },
    clientMarkedComplete: {
      type: Boolean,
      default: false,
    },
    vendorMarkedComplete: {
      type: Boolean,
      default: false,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    paymentStatus: {
      type: String,
       enum: ['pending', 'escrowed', 'released', 'refunded', 'partially_refunded'],
      default: 'pending',
    },
    paymentReference: String,
    cancelledAt: Date,
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    cancellationReason: String,
    hasDispute: {
      type: Boolean,
      default: false,
    },
    disputeId: {
      type: Schema.Types.ObjectId,
      ref: 'Dispute',
    },
    hasReview: {
      type: Boolean,
      default: false,
    },
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
    },
    acceptedAt: Date,
    rejectedAt: Date,
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
bookingSchema.index({ client: 1, status: 1 });
bookingSchema.index({ vendor: 1, status: 1 });
bookingSchema.index({ service: 1 });
bookingSchema.index({ scheduledDate: 1, status: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ paymentStatus: 1 });

// Don't return deleted bookings in queries by default
bookingSchema.pre(/^find/, function (next) {
  // @ts-ignore
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Add status to history when status changes
bookingSchema.pre('save', function (next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: this.client, // Will be overridden with actual user
      reason: undefined,
    });
  }
  next();
});

// Check if both parties marked complete
bookingSchema.methods.checkCompletion = function (): void {
  if (this.clientMarkedComplete && this.vendorMarkedComplete) {
    this.status = BookingStatus.COMPLETED;
    this.completedAt = new Date();
    this.completedBy = 'both';
  }
};

const Booking: Model<IBooking> = mongoose.model<IBooking>('Booking', bookingSchema);

export default Booking;
