import { Response, NextFunction } from 'express';
declare class UserController {
    /**
     * Get user profile
     * GET /api/v1/users/profile
     */
    /**
     * Get user profile
     */
    getProfile: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update user profile
     * PUT /api/v1/users/profile
     */
    updateProfile: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update user preferences
     * PUT /api/v1/users/preferences
     */
    updatePreferences: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Set withdrawal PIN
     * POST /api/v1/users/withdrawal-pin
     */
    setWithdrawalPin: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Verify withdrawal PIN
     * POST /api/v1/users/verify-withdrawal-pin
     */
    verifyWithdrawalPin: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Become vendor
     * POST /api/v1/users/become-vendor
     */
    becomeVendor: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update vendor profile
     * PUT /api/v1/users/vendor-profile
     */
    updateVendorProfile: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get all users (admin)
     * GET /api/v1/users
     */
    getAllUsers: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get vendors
     * GET /api/v1/users/vendors
     */
    getVendors: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getTopVendors: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get full vendor details
     * GET /api/v1/users/vendors/:vendorId
     */
    getVendorFullDetails: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get user by ID (admin)
     * GET /api/v1/users/:userId
     */
    getUserById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update user status (admin)
     * PUT /api/v1/users/:userId/status
     */
    updateUserStatus: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Verify vendor (admin)
     * POST /api/v1/users/:userId/verify-vendor
     */
    verifyVendor: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Soft delete user (admin)
     * DELETE /api/v1/users/:userId
     */
    softDeleteUser: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Restore deleted user (admin)
     * POST /api/v1/users/:userId/restore
     */
    restoreUser: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get user statistics
     * GET /api/v1/users/stats
     */
    getUserStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
    uploadAvatar: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Delete avatar
     * DELETE /api/v1/users/avatar
     */
    deleteAvatar: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update online status manually
     * POST /api/v1/users/online-status
     */
    updateOnlineStatus: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Heartbeat endpoint to keep user online
     * POST /api/v1/users/heartbeat
     */
    heartbeat: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update user location
     * PUT /api/v1/users/location
     */
    updateLocation: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
    * Get nearby vendors
    * GET /api/v1/users/nearby-vendors
    */
    getNearbyVendors: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: UserController;
export default _default;
//# sourceMappingURL=user.controller.d.ts.map