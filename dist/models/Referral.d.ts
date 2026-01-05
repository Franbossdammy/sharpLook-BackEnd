import mongoose, { Document, Model } from 'mongoose';
export interface IReferral extends Document {
    _id: mongoose.Types.ObjectId;
    referrer: mongoose.Types.ObjectId;
    referee: mongoose.Types.ObjectId;
    referralCode: string;
    status: 'pending' | 'completed' | 'expired' | 'cancelled';
    referrerReward: number;
    refereeReward: number;
    requiresFirstBooking: boolean;
    firstBookingCompleted: boolean;
    firstBookingId?: mongoose.Types.ObjectId;
    referrerPaid: boolean;
    referrerPaidAt?: Date;
    referrerPaymentId?: mongoose.Types.ObjectId;
    refereePaid: boolean;
    refereePaidAt?: Date;
    refereePaymentId?: mongoose.Types.ObjectId;
    completedAt?: Date;
    expiresAt?: Date;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const Referral: Model<IReferral>;
export default Referral;
//# sourceMappingURL=Referral.d.ts.map