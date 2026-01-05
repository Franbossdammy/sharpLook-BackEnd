import mongoose, { Document, Model } from 'mongoose';
import { TransactionType, PaymentStatus } from '../types';
export interface ITransaction extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    type: TransactionType;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    status: PaymentStatus;
    reference: string;
    description: string;
    booking?: mongoose.Types.ObjectId;
    order?: mongoose.Types.ObjectId;
    payment?: mongoose.Types.ObjectId;
    withdrawal?: mongoose.Types.ObjectId;
    metadata?: any;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const Transaction: Model<ITransaction>;
export default Transaction;
//# sourceMappingURL=Transaction.d.ts.map