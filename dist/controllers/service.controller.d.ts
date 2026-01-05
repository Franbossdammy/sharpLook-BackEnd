import { Response, NextFunction } from 'express';
declare class ServiceController {
    /**
     * Create new service
     */
    createService: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update service
     */
    updateService: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get my services (vendor)
     */
    getMyServices: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get all services with filters
     */
    /**
    * Get all services with filters
    */
    /**
     * Get all services with filters
     */
    getAllServices: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get service by ID
     */
    getServiceById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get service by slug
     */
    getServiceBySlug: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Delete service
     */
    deleteService: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Toggle service status
     */
    toggleServiceStatus: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get service reviews
     */
    getServiceReviews: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Add review to service
     */
    addReview: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Respond to review
     */
    respondToReview: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get trending services
     */
    getTrendingServices: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get popular services by category
     */
    getPopularByCategory: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get pending services (Admin)
     */
    getPendingServices: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Approve service (Admin)
     */
    approveService: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Reject service (Admin)
     */
    rejectService: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
   * Search services
   */
    /**
     * Search vendors and their services
     */
    searchServices: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get approval statistics (Admin)
     */
    getApprovalStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: ServiceController;
export default _default;
//# sourceMappingURL=service.controller.d.ts.map