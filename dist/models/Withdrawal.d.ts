import mongoose, { Document, Model } from 'mongoose';
export interface IWithdrawal extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    amount: number;
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    reference: string;
    withdrawalFee: number;
    netAmount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';
    paystackRecipientCode?: string;
    paystackTransferCode?: string;
    requestedAt: Date;
    processedAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
    rejectedAt?: Date;
    processedBy?: mongoose.Types.ObjectId;
    failureReason?: string;
    rejectionReason?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const Withdrawal: Model<IWithdrawal>;
export default Withdrawal;
//# sourceMappingURL=Withdrawal.d.ts.map