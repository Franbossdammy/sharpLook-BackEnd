import mongoose, { Document, Model } from 'mongoose';
export interface ISubscription extends Document {
    _id: mongoose.Types.ObjectId;
    vendor: mongoose.Types.ObjectId;
    type: 'in_shop' | 'home_service' | 'both';
    monthlyFee: number;
    commissionRate: number;
    status: 'active' | 'expired' | 'cancelled' | 'pending';
    startDate: Date;
    endDate: Date;
    lastPaymentDate?: Date;
    lastPaymentAmount?: number;
    lastPaymentReference?: string;
    nextPaymentDue?: Date;
    autoRenew: boolean;
    createdAt: Date;
    updatedAt: Date;
    cancelledAt?: Date;
    cancellationReason?: string;
}
declare const Subscription: Model<ISubscription>;
export default Subscription;
//# sourceMappingURL=Subscription.d.ts.map