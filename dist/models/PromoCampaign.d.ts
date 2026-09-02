import mongoose, { Document, Model } from 'mongoose';
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
declare const PromoCampaign: Model<IPromoCampaign>;
export default PromoCampaign;
//# sourceMappingURL=PromoCampaign.d.ts.map