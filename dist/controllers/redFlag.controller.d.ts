import { Request, Response, NextFunction } from 'express';
declare class RedFlagController {
    /**
     * Get all red flags with filters
     * @route GET /api/admin/red-flags
     */
    getRedFlags(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get red flag statistics
     * @route GET /api/admin/red-flags/stats
     */
    getStats(_req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get users with most red flags
     * @route GET /api/admin/red-flags/top-users
     */
    getTopFlaggedUsers(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get single red flag by ID
     * @route GET /api/admin/red-flags/:id
     */
    getRedFlagById(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Update red flag status
     * @route PATCH /api/admin/red-flags/:id/status
     */
    updateStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Resolve red flag with action
     * @route POST /api/admin/red-flags/:id/resolve
     */
    resolveRedFlag(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Assign red flag to admin
     * @route PATCH /api/admin/red-flags/:id/assign
     */
    assignRedFlag(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Add note to red flag
     * @route POST /api/admin/red-flags/:id/notes
     */
    addNote(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Manually create a red flag
     * @route POST /api/admin/red-flags/manual
     */
    createManualRedFlag(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get red flags for a specific user
     * @route GET /api/admin/red-flags/user/:userId
     */
    getRedFlagsByUser(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Bulk update red flag statuses
     * @route PATCH /api/admin/red-flags/bulk/status
     */
    bulkUpdateStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get red flag types summary
     * @route GET /api/admin/red-flags/types/summary
     */
    getTypesSummary(_req: Request, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: RedFlagController;
export default _default;
//# sourceMappingURL=redFlag.controller.d.ts.map