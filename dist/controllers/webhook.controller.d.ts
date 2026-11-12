import { Request, Response } from 'express';
/**
 * Handle Paystack Webhook
 * POST /api/v1/webhooks/paystack
 */
export declare const handlePaystackWebhook: (req: Request, res: Response) => Promise<Response>;
/**
 * Handle successful charge (wallet funding or booking payment)
 * Exported so the payment reconciliation cron can finish payments the
 * webhook missed, using exactly the same code path.
 */
export declare function handleChargeSuccess(data: any): Promise<void>;
declare const _default: {
    handlePaystackWebhook: (req: Request, res: Response) => Promise<Response>;
};
export default _default;
//# sourceMappingURL=webhook.controller.d.ts.map