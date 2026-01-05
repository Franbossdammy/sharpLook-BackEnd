import { ITransaction } from '../models/Transaction';
import { IWithdrawal } from '../models/Withdrawal';
import { TransactionType, PaymentStatus } from '../types';
declare class WalletService {
    private paystackSecretKey;
    private paystackBaseUrl;
    constructor();
    /**
     * Get wallet balance
     */
    getBalance(userId: string): Promise<number>;
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
     * Request withdrawal
   // FIX: Update requestWithdrawal in wallet.service.ts
  // The issue is that withdrawalPin is not being selected from the database
  
  /**
   * Request withdrawal
   */
    requestWithdrawal(userId: string, data: {
        amount: number;
        bankName: string;
        bankCode: string;
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
     * Get wallet statistics
     */
    getWalletStats(userId: string): Promise<any>;
    /**
     * Helper: Get bank code from bank name
     */
    private getBankCode;
}
declare const _default: WalletService;
export default _default;
//# sourceMappingURL=wallet.service.d.ts.map