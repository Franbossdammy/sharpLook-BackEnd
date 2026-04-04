import { Response, NextFunction } from 'express';
declare class AnalyticsController {
    getDashboardOverview: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getUserAnalytics: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getBookingAnalytics: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getRevenueAnalytics: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getVendorPerformance: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getServiceAnalytics: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getDisputeAnalytics: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getReferralAnalytics: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getAcquisitionAnalytics: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getUserDetails: (req: import("express").Request, res: Response, next: NextFunction) => void;
    exportUserData: (req: import("express").Request, res: Response, next: NextFunction) => void;
    exportAnalytics: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: AnalyticsController;
export default _default;
//# sourceMappingURL=analytics.controller.d.ts.map