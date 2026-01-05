import { Response, NextFunction } from 'express';
declare class DisputeController {
    /**
     * Create dispute
     */
    createDispute: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Add evidence to dispute
     */
    addEvidence: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Add message to dispute
     */
    addMessage: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get dispute by ID
     */
    getDisputeById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get user disputes
     */
    getUserDisputes: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get all disputes (Admin)
     */
    getAllDisputes: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Assign dispute (Admin)
     */
    assignDispute: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update dispute priority (Admin)
     */
    updatePriority: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Resolve dispute (Admin)
     */
    resolveDispute: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Close dispute (Admin)
     */
    closeDispute: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get dispute statistics (Admin)
     */
    getDisputeStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: DisputeController;
export default _default;
//# sourceMappingURL=dispute.controller.d.ts.map