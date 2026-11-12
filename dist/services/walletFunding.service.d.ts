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
     * Atomically mark a wallet-funding payment completed and credit the wallet.
     * Returns null if the payment was already completed by someone else, so the
     * webhook, the app's verify call and the reconciliation cron can never credit
     * the same payment twice. The balance uses $inc so concurrent wallet changes
     * aren't overwritten.
     */
    private completeFundingAndCredit;
    /**
     * Recent successful card payments and manual credits for a user (Admin only).
     * Shown on the admin Wallet Top-Up page so admins can see a user has already
     * paid before crediting them manually.
     */
    getCreditCheck(userId: string, days?: number): Promise<{
        cardPayments: any[];
        manualCredits: any[];
    }>;
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