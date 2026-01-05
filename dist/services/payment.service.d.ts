import { IPayment } from '../models/Payment';
declare class PaymentService {
    private paystackSecretKey;
    private paystackBaseUrl;
    constructor();
    /**
     * Initialize payment for booking
     */
    initializePayment(userId: string, bookingId: string, metadata?: any): Promise<{
        payment: IPayment;
        authorizationUrl: string;
        accessCode: string;
    }>;
    /**
     * Verify Paystack payment webhook
     */
    verifyWebhookSignature(payload: string, signature: string): boolean;
    /**
     * Handle Paystack webhook
     */
    /**
     * Handle Paystack webhook
     */
    handlePaystackWebhook(event: any): Promise<void>;
    private handleSuccessfulPayment;
    /**
     * Verify payment manually
     */
    verifyPayment(reference: string): Promise<IPayment>;
    /**
     * Release payment to vendor - CREATE TRANSACTION FOR VENDOR EARNING
     */
    releasePayment(bookingId: string): Promise<IPayment>;
    /**
     * Refund payment - CREATE TRANSACTION FOR CLIENT REFUND
     */
    refundPayment(bookingId: string, refundedBy: string, reason?: string): Promise<IPayment>;
    /**
     * Get payment by ID
     */
    getPaymentById(paymentId: string): Promise<IPayment>;
    /**
     * Get user payments
     */
    getUserPayments(userId: string, page?: number, limit?: number): Promise<{
        payments: IPayment[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Pay for order using wallet balance
     */
    payOrderFromWallet(orderId: string, customerId: string): Promise<{
        order: any;
        payment: any;
    }>;
    /**
     * Check if customer can pay order from wallet
     */
    canPayOrderFromWallet(orderId: string, customerId: string): Promise<{
        canPay: boolean;
        balance: number;
        required: number;
        shortfall: number;
    }>;
    /**
     * Initialize order payment (for card payment via Paystack)
     */
    initializeOrderPayment(userId: string, orderId: string, metadata?: any): Promise<{
        payment: IPayment;
        authorizationUrl: string;
        reference: string;
        accessCode: string;
    }>;
    /**
     * Verify order payment
     */
    verifyOrderPayment(orderId: string, reference: string): Promise<{
        payment: IPayment;
        order: any;
    }>;
    /**
     * Release payment to seller after order completion
     */
    releaseOrderPayment(orderId: string, _releasedBy: string): Promise<IPayment>;
    /**
     * Refund order payment
     */
    refundOrderPayment(orderId: string, refundedBy: string, reason?: string): Promise<IPayment>;
    /**
     * Handle successful transfer (withdrawal)
     */
    private handleSuccessfulTransfer;
    /**
     * Handle failed transfer
     */
    private handleFailedTransfer;
}
declare const _default: PaymentService;
export default _default;
//# sourceMappingURL=payment.service.d.ts.map