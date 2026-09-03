import { Response, NextFunction } from 'express';
declare class PromoController {
    /**
     * Get the currently active promo campaign, plus (if authenticated) whether
     * the requesting user is still eligible to redeem.
     * @route  GET /api/v1/promo/current
     * @access Public (auth optional)
     */
    getCurrent: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Create a new promo campaign
     * @route  POST /api/v1/admin/promo
     * @access Admin
     */
    createCampaign: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Toggle campaign active state
     * @route  PATCH /api/v1/admin/promo/:id/pause
     * @access Admin
     */
    togglePause: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update campaign settings. Cannot decrease maxSlots below already-redeemed count.
     * @route  PATCH /api/v1/admin/promo/:id
     * @access Admin
     */
    updateCampaign: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Clear all refunded redemptions from a campaign. Intended for testing so a
     * user isn't permanently blocked after an abandoned Paystack checkout or a
     * refund during a test run. In production, refunded redemptions still count
     * against the per-user cap by design — use with care.
     * @route  POST /api/v1/promo/admin/:id/clear-refunded
     * @access Admin
     */
    clearRefunded: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * List all campaigns (admin)
     * @route  GET /api/v1/admin/promo
     * @access Admin
     */
    listCampaigns: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get campaign stats
     * @route  GET /api/v1/admin/promo/:id/stats
     * @access Admin
     */
    getStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: PromoController;
export default _default;
//# sourceMappingURL=promo.controller.d.ts.map