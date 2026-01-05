declare class PaystackHelper {
    private readonly secretKey;
    private readonly baseUrl;
    constructor();
    /**
     * Initialize Paystack payment
     */
    initializePayment(email: string, amount: number, reference: string, metadata?: any): Promise<any>;
    /**
     * Verify Paystack payment
     */
    verifyPayment(reference: string): Promise<any>;
    /**
     * Get list of banks
     */
    getBanks(): Promise<any[]>;
    /**
     * Verify bank account
     */
    verifyBankAccount(accountNumber: string, bankCode: string): Promise<any>;
    /**
     * Create transfer recipient
     */
    createTransferRecipient(name: string, accountNumber: string, bankCode: string): Promise<any>;
    /**
     * Initiate transfer
     */
    initiateTransfer(amount: number, recipientCode: string, reference: string, reason?: string): Promise<any>;
    /**
     * Verify transfer
     */
    verifyTransfer(reference: string): Promise<any>;
}
declare const _default: PaystackHelper;
export default _default;
//# sourceMappingURL=paystackHelper.d.ts.map