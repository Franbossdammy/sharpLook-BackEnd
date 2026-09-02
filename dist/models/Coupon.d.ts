import mongoose, { Document, Model } from 'mongoose';
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
declare const Coupon: Model<ICoupon>;
export default Coupon;
//# sourceMappingURL=Coupon.d.ts.map