import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IReferral extends Document {
  _id: mongoose.Types.ObjectId;
  referrer: mongoose.Types.ObjectId;
  referee: mongoose.Types.ObjectId;
  referralCode: string;
  
  // Status
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  
  // Rewards
  referrerReward: number;
  refereeReward: number;
  
  // Conditions
  requiresFirstBooking: boolean;
  firstBookingCompleted: boolean;
  firstBookingId?: mongoose.Types.ObjectId;
  
  // Payout
  referrerPaid: boolean;
  referrerPaidAt?: Date;
  referrerPaymentId?: mongoose.Types.ObjectId;
  refereePaid: boolean;
  refereePaidAt?: Date;
  refereePaymentId?: mongoose.Types.ObjectId;
  
  // Tracking
  completedAt?: Date;
  expiresAt?: Date;
  
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferral>(
  {
    referrer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Referrer is required'],
      index: true,
    },
    referee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Referee is required'],
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'expired', 'cancelled'],
      default: 'pending',
      index: true,
    },
    referrerReward: {
      type: Number,
      default: 1000, // ₦1,000 for referrer
    },
    refereeReward: {
      type: Number,
      default: 500, // ₦500 for referee
    },
    requiresFirstBooking: {
      type: Boolean,
      default: true,
    },
    firstBookingCompleted: {
      type: Boolean,
      default: false,
    },
    firstBookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    referrerPaid: {
      type: Boolean,
      default: false,
    },
    referrerPaidAt: Date,
    referrerPaymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    refereePaid: {
      type: Boolean,
      default: false,
    },
    refereePaidAt: Date,
    refereePaymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    completedAt: Date,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      index: true,
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
referralSchema.index({ referrer: 1, status: 1 });
referralSchema.index({ referee: 1 });
referralSchema.index({ referralCode: 1 });
referralSchema.index({ status: 1, expiresAt: 1 });
referralSchema.index({ createdAt: -1 });

// Don't return deleted referrals in queries by default
referralSchema.pre(/^find/, function (next) {
  // @ts-ignore
  this.find({ isDeleted: { $ne: true } });
  next();
});

const Referral: Model<IReferral> = mongoose.model<IReferral>('Referral', referralSchema);

export default Referral;
