import { Response, NextFunction } from 'express';
declare class SubscriptionController {
    createSubscription: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getMySubscription: (req: import("express").Request, res: Response, next: NextFunction) => void;
    paySubscription: (req: import("express").Request, res: Response, next: NextFunction) => void;
    cancelSubscription: (req: import("express").Request, res: Response, next: NextFunction) => void;
    changeSubscriptionPlan: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getAllSubscriptions: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getSubscriptionStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: SubscriptionController;
export default _default;
//# sourceMappingURL=subscription.controller.d.ts.map