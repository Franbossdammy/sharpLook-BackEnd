import { Response, NextFunction } from 'express';
declare class VendorController {
    /**
     * Get vendor profile
     * GET /api/v1/vendors/profile
     */
    getProfile: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update vendor profile
     * PUT /api/v1/vendors/profile
     */
    updateProfile: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update vendor availability schedule
     * PUT /api/v1/vendors/availability
     */
    updateAvailability: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update vendor location
     * PUT /api/v1/vendors/location
     */
    updateLocation: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Upload vendor document
     * POST /api/v1/vendors/documents
     */
    uploadDocument: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Check vendor profile completion
     * GET /api/v1/vendors/profile/completion
     */
    checkProfileCompletion: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: VendorController;
export default _default;
//# sourceMappingURL=vendor.controller.d.ts.map