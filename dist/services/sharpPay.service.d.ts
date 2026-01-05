import { ITransaction } from '../models/Transaction';
import { IWithdrawal } from '../models/Withdrawal';
import { TransactionType, PaymentStatus } from '../types';
declare class SharpPayService {
    private paystackSecretKey;
    private paystackBaseUrl;
    constructor();
    /**
     * Get wallet balance
     */
    getBalance(userId: string): Promise<{
        balance: number;
        currency: string;
    }>;
    /**
     * Initialize wallet deposit/funding
     */
    initializeDeposit(userId: string, amount: number, metadata?: any): Promise<{
        authorizationUrl: string;
        reference: string;
        accessCode: string;
    }>;
    /**
     * Verify wallet deposit
     */
    verifyDeposit(reference: string): Promise<{
        success: boolean;
        transaction: ITransaction;
        newBalance: number;
    }>;
    /**
     * Get wallet transactions
     */
    getTransactions(userId: string, filters?: {
        type?: TransactionType;
        status?: PaymentStatus;
        startDate?: Date;
        endDate?: Date;
    }, page?: number, limit?: number): Promise<{
        transactions: ITransaction[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get wallet statistics
     */
    getWalletStats(userId: string): Promise<any>;
    /**
     * Request withdrawal
     */
    requestWithdrawal(userId: string, data: {
        amount: number;
        bankName: string;
        accountNumber: string;
        accountName: string;
        pin: string;
    }): Promise<IWithdrawal>;
    /**
     * Process withdrawal (Admin)
     */
    processWithdrawal(withdrawalId: string, adminId: string): Promise<IWithdrawal>;
    /**
     * Reject withdrawal (Admin)
     */
    rejectWithdrawal(withdrawalId: string, adminId: string, reason: string): Promise<IWithdrawal>;
    /**
     * Get withdrawal by ID
     */
    getWithdrawalById(withdrawalId: string, userId: string): Promise<IWithdrawal>;
    /**
     * Get user withdrawals
     */
    getUserWithdrawals(userId: string, page?: number, limit?: number): Promise<{
        withdrawals: IWithdrawal[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get all withdrawals (Admin)
     */
    getAllWithdrawals(filters?: {
        status?: string;
        startDate?: Date;
        endDate?: Date;
    }, page?: number, limit?: number): Promise<{
        withdrawals: IWithdrawal[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Helper: Get bank code from bank name
     */
    private getBankCode;
}
declare const _default: SharpPayService;
export default _default;
//# sourceMappingURL=sharpPay.service.d.ts.map