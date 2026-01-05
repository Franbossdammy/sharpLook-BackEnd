import { ITransaction } from '../models/Transaction';
import { TransactionType, PaymentStatus } from '../types';
declare class TransactionService {
    /**
     * Create a transaction record
     */
    createTransaction(data: {
        userId: string;
        type: TransactionType;
        amount: number;
        description: string;
        booking?: string;
        order?: string;
        payment?: string;
        withdrawal?: string;
        metadata?: any;
    }): Promise<ITransaction>;
    /**
     * Get user transactions
     */
    getUserTransactions(userId: string, filters?: {
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
     * Get transaction statistics
     */
    getTransactionStats(userId: string, startDate?: Date, endDate?: Date): Promise<any>;
    /**
     * Get transaction by ID
     */
    getTransactionById(transactionId: string, userId: string): Promise<ITransaction>;
    /**
   * Get all transactions (admin)
   */
    getAllTransactions(filters?: {
        userId?: string;
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
     * Get platform transaction statistics (admin)
     */
    getPlatformStats(startDate?: Date, endDate?: Date): Promise<any>;
    /**
     * Get transaction by ID (admin)
     */
    getTransactionByIdAdmin(transactionId: string): Promise<ITransaction>;
}
declare const _default: TransactionService;
export default _default;
//# sourceMappingURL=transaction.service.d.ts.map