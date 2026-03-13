import { Response, NextFunction } from 'express';
declare class AuditLogController {
    /**
     * Get all audit logs (Admin)
     * GET /api/v1/audit-logs
     */
    getAll: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get audit logs for a specific resource
     * GET /api/v1/audit-logs/:resource/:resourceId
     */
    getByResource: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: AuditLogController;
export default _default;
//# sourceMappingURL=auditLog.controller.d.ts.map