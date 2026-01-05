import { Response, NextFunction } from 'express';
declare class ReferralController {
    validateReferralCode: (req: import("express").Request, res: Response, next: NextFunction) => void;
    applyReferralCode: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getReferralStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getUserReferrals: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getReferralById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getLeaderboard: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getAllReferrals: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getAdminStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: ReferralController;
export default _default;
//# sourceMappingURL=referral.controller.d.ts.map