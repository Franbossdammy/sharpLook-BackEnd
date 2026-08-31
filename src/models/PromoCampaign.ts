import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPromoRedemption {
  user: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  redeemedAt: Date;
  refundedAt?: Date;
}

export interface IPromoCampaign extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  discountAmount: number;
  vendorBonusAmount: number;
  minServicePrice: number;
  maxSlots: number;
  slotsRemaining: number;
  maxUsesPerUser: number;
  appliesTo: 'ALL' | 'HOME_SERVICE' | 'IN_SHOP';
  redemptions: IPromoRedemption[];
  startsAt?: Date;
  endsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const promoRedemptionSchema = new Schema<IPromoRedemption>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    redeemedAt: {
      type: Date,
      default: Date.now,
    },
    refundedAt: {
      type: Date,
    },
  },
  { _id: true }
);

const promoCampaignSchema = new Schema<IPromoCampaign>(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    discountAmount: {
      type: Number,
      required: [true, 'Discount amount is required'],
      min: [0, 'Discount amount cannot be negative'],
    },
    vendorBonusAmount: {
      type: Number,
      required: [true, 'Vendor bonus amount is required'],
      min: [0, 'Vendor bonus amount cannot be negative'],
    },
    minServicePrice: {
      type: Number,
      required: [true, 'Minimum service price is required'],
      min: [0, 'Minimum service price cannot be negative'],
    },
    maxSlots: {
      type: Number,
      required: [true, 'Max slots is required'],
      min: [1, 'Max slots must be at least 1'],
    },
    slotsRemaining: {
      type: Number,
      required: true,
      min: [0, 'Slots remaining cannot be negative'],
    },
    maxUsesPerUser: {
      type: Number,
      default: 1,
      min: [1, 'Max uses per user must be at least 1'],
    },
    appliesTo: {
      type: String,
      enum: ['ALL', 'HOME_SERVICE', 'IN_SHOP'],
      default: 'ALL',
    },
    redemptions: [promoRedemptionSchema],
    startsAt: {
      type: Date,
    },
    endsAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

promoCampaignSchema.index({ isActive: 1, slotsRemaining: 1 });
promoCampaignSchema.index({ 'redemptions.user': 1 });

const PromoCampaign: Model<IPromoCampaign> = mongoose.model<IPromoCampaign>(
  'PromoCampaign',
  promoCampaignSchema
);

export default PromoCampaign;
