import { Response, NextFunction } from 'express';
declare class AnalyticsController {
    /**
     * Get vendor analytics
     * GET /api/v1/analytics/vendor
     */
    getVendorAnalytics: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get quick stats for dashboard
     * GET /api/v1/analytics/vendor/quick-stats
     */
    getVendorQuickStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: AnalyticsController;
export default _default;
//# sourceMappingURL=vendorAnalytics.controller.d.ts.map