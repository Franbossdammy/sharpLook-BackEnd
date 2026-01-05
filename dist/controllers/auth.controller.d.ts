import { Response, NextFunction } from 'express';
declare class AuthController {
    /**
     * Register new user
     * POST /api/v1/auth/register
     */
    register: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Login user
     * POST /api/v1/auth/login
     */
    login: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Refresh access token
     * POST /api/v1/auth/refresh-token
     */
    refreshToken: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Logout user
     * POST /api/v1/auth/logout
     */
    logout: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Verify email
     * POST /api/v1/auth/verify-email
     */
    verifyEmail: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Resend verification email
     * POST /api/v1/auth/resend-verification
     */
    resendVerification: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Forgot password
     * POST /api/v1/auth/forgot-password
     */
    forgotPassword: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Reset password
     * POST /api/v1/auth/reset-password
     */
    resetPassword: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Change password
     * POST /api/v1/auth/change-password
     */
    changePassword: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get current user
     * GET /api/v1/auth/me
     */
    getCurrentUser: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: AuthController;
export default _default;
//# sourceMappingURL=auth.controller.d.ts.map