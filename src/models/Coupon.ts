import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ICoupon extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  maxUses?: number | null;
  usedCount: number;
  usedBy: {
    user: mongoose.Types.ObjectId;
    usedAt: Date;
  }[];
  maxUsesPerUser: number;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: [true, 'Discount type is required'],
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order amount cannot be negative'],
    },
    maxDiscountAmount: {
      type: Number,
      min: [0, 'Max discount amount cannot be negative'],
    },
    maxUses: {
      type: Number,
      default: null,
      min: [1, 'Max uses must be at least 1'],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, 'Used count cannot be negative'],
    },
    usedBy: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    maxUsesPerUser: {
      type: Number,
      default: 1,
      min: [1, 'Max uses per user must be at least 1'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, expiresAt: 1 });

const Coupon: Model<ICoupon> = mongoose.model<ICoupon>('Coupon', couponSchema);

export default Coupon;
