import { Request, Response, NextFunction } from 'express';
declare class AppConfigController {
    /**
     * GET /api/v1/app/version
     * Public — called by the mobile app on every launch
     */
    getVersion: (req: Request, res: Response, next: NextFunction) => void;
    /**
     * PATCH /api/v1/app/version
     * Admin only — called from the admin dashboard
     */
    updateVersion: (req: Request, res: Response, next: NextFunction) => void;
}
declare const _default: AppConfigController;
export default _default;
//# sourceMappingURL=appConfig.controller.d.ts.map