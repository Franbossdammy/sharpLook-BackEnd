import { Response, NextFunction } from 'express';
declare class DisputeController {
    /**
     * Create a new dispute
     * POST /api/v1/disputes
     */
    createDispute: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get dispute by ID
     * GET /api/v1/disputes/:disputeId
     */
    getDisputeById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get user's disputes (customer or seller)
     * GET /api/v1/disputes/my-disputes
     */
    getUserDisputes: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get all disputes (admin)
     * GET /api/v1/disputes
     */
    getAllDisputes: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Add message to dispute
     * POST /api/v1/disputes/:disputeId/messages
     */
    addMessage: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Assign dispute to admin
     * POST /api/v1/disputes/:disputeId/assign
     */
    assignDispute: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Resolve dispute (admin)
     * POST /api/v1/disputes/:disputeId/resolve
     */
    resolveDispute: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Close dispute (admin)
     * POST /api/v1/disputes/:disputeId/close
     */
    closeDispute: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Escalate dispute
     * POST /api/v1/disputes/:disputeId/escalate
     */
    escalateDispute: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get dispute statistics (admin)
     * GET /api/v1/disputes/stats
     */
    getDisputeStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get open disputes (admin dashboard)
     * GET /api/v1/disputes/open
     */
    getOpenDisputes: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get high priority disputes (admin dashboard)
     * GET /api/v1/disputes/high-priority
     */
    getHighPriorityDisputes: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get my assigned disputes (admin)
     * GET /api/v1/disputes/assigned-to-me
     */
    getMyAssignedDisputes: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: DisputeController;
export default _default;
//# sourceMappingURL=disputeProduct.controller.d.ts.map