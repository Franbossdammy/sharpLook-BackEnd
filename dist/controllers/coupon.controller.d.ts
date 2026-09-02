import { Response, NextFunction } from 'express';
declare class CouponController {
    /**
     * Validate a coupon code before booking
     * @route  POST /api/v1/coupons/validate
     * @access Private (Client)
     * @body   { code: string, orderAmount: number }
     */
    validateCoupon: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Seed test coupons (no auth — testing only, remove in prod)
     * @route  GET /api/v1/coupons/admin/seed
     * @access Public (DEV/TEST ONLY)
     */
    seedCoupons: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: CouponController;
export default _default;
//# sourceMappingURL=coupon.controller.d.ts.map