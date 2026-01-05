import { IPayment } from '../models/Payment';
declare class WalletFundingService {
    private paystackSecretKey;
    private paystackBaseUrl;
    constructor();
    /**
     * Initialize wallet funding via Paystack
     */
    initializeWalletFunding(userId: string, amount: number, metadata?: any): Promise<{
        payment: IPayment;
        authorizationUrl: string;
        accessCode: string;
        reference: string;
    }>;
    /**
     * Verify wallet funding payment
     */
    verifyWalletFunding(reference: string): Promise<{
        payment: IPayment;
        user: any;
        success: boolean;
    }>;
    /**
     * Process wallet funding from webhook (called by Paystack)
     */
    processWalletFundingWebhook(data: any): Promise<void>;
    /**
     * Direct wallet credit (Admin only)
     * Used for manual credits, bonuses, refunds, etc.
     */
    creditWallet(userId: string, amount: number, description: string, adminId: string, metadata?: any): Promise<{
        user: any;
        transaction: any;
        previousBalance: number;
        newBalance: number;
    }>;
    /**
     * Direct wallet debit (Admin only)
     * Used for manual debits, corrections, chargebacks, etc.
     */
    debitWallet(userId: string, amount: number, description: string, adminId: string, metadata?: any): Promise<{
        user: any;
        transaction: any;
        previousBalance: number;
        newBalance: number;
    }>;
    /**
     * Get wallet funding history
     */
    getFundingHistory(userId: string, page?: number, limit?: number): Promise<{
        transactions: any[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
declare const _default: WalletFundingService;
export default _default;
//# sourceMappingURL=walletFunding.service.d.ts.map