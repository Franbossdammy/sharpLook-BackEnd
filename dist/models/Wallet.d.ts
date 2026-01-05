import mongoose, { Document, Model } from 'mongoose';
export declare enum TransactionType {
    DEPOSIT = "deposit",
    WITHDRAWAL = "withdrawal",
    BOOKING_PAYMENT = "booking_payment",
    REFUND = "refund",
    COMMISSION = "commission",
    REFERRAL_BONUS = "referral_bonus",
    SUBSCRIPTION_PAYMENT = "subscription_payment",
    ADMIN_CREDIT = "admin_credit",
    ADMIN_DEBIT = "admin_debit"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed",
    REFUNDED = "refunded",
    ESCROWED = "escrowed",
    RELEASED = "released"
}
export interface ITransaction {
    type: TransactionType;
    amount: number;
    status: PaymentStatus;
    reference?: string;
    booking?: mongoose.Types.ObjectId;
    description?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}
export interface IWallet extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    availableBalance: number;
    pendingBalance: number;
    totalEarned: number;
    totalWithdrawn: number;
    transactions: ITransaction[];
    lastTransactionAt?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    addTransaction(transaction: Partial<ITransaction>): Promise<IWallet>;
    creditAvailable(amount: number, type: TransactionType, reference?: string, booking?: string, description?: string): Promise<IWallet>;
    debitAvailable(amount: number, type: TransactionType, reference?: string, booking?: string, description?: string): Promise<IWallet>;
    moveToEscrow(amount: number, bookingId: string): Promise<IWallet>;
    releaseFromEscrow(amount: number, bookingId: string): Promise<IWallet>;
    refundFromEscrow(amount: number, bookingId: string): Promise<IWallet>;
    getBalance(): {
        available: number;
        pending: number;
        total: number;
    };
    canWithdraw(amount: number): boolean;
}
declare const Wallet: Model<IWallet>;
export default Wallet;
//# sourceMappingURL=Wallet.d.ts.map