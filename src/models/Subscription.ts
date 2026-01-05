import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISubscription extends Document {
  _id: mongoose.Types.ObjectId;
  vendor: mongoose.Types.ObjectId;
  
  // Subscription type
  type: 'in_shop' | 'home_service' | 'both';
  
  // Pricing
  monthlyFee: number; // ₦5,000 for in-shop, ₦0 for home service only, ₦5,000 for both
  commissionRate: number; // 0% for in-shop, 10% for home service, 12% for both
  
  // Status
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  
  // Subscription period
  startDate: Date;
  endDate: Date;
  
  // Payment
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  lastPaymentReference?: string;
  nextPaymentDue?: Date;
  
  // Auto-renewal
  autoRenew: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vendor is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['in_shop', 'home_service', 'both'],
      required: [true, 'Subscription type is required'],
    },
    monthlyFee: {
      type: Number,
      required: true,
      default: 0,
    },
    commissionRate: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending'],
      default: 'pending',
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    lastPaymentDate: Date,
    lastPaymentAmount: Number,
    lastPaymentReference: String,
    nextPaymentDue: Date,
    autoRenew: {
      type: Boolean,
      default: true,
    },
    cancelledAt: Date,
    cancellationReason: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
subscriptionSchema.index({ vendor: 1, status: 1 });
subscriptionSchema.index({ endDate: 1, status: 1 });
subscriptionSchema.index({ nextPaymentDue: 1, status: 1 });

// Virtual: days remaining
subscriptionSchema.virtual('daysRemaining').get(function () {
  if (this.status !== 'active') return 0;
  const now = new Date();
  const diff = this.endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

const Subscription: Model<ISubscription> = mongoose.model<ISubscription>(
  'Subscription',
  subscriptionSchema
);

export default Subscription;
