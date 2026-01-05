import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { UserRole } from '../types';
/**
 * Verify JWT token and attach user to request
 */
export declare const authenticate: (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
/**
 * Check if user has required role
 */
export declare const authorize: (...roles: UserRole[]) => (req: AuthRequest, _res: Response, next: NextFunction) => void;
/**
 * Check if user is a vendor
 */
export declare const requireVendor: (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
/**
 * Optional authentication - doesn't throw error if no token
 */
export declare const optionalAuth: (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
/**
 * Check if user is admin (any admin role)
 */
export declare const requireAdmin: (req: AuthRequest, _res: Response, next: NextFunction) => void;
/**
 * Check if user is super admin only
 */
export declare const requireSuperAdmin: (req: AuthRequest, _res: Response, next: NextFunction) => void;
/**
 * Check if user is financial admin
 */
export declare const requireFinancialAdmin: (req: AuthRequest, _res: Response, next: NextFunction) => void;
/**
 * Check if user is analytics admin
 */
export declare const requireAnalyticsAdmin: (req: AuthRequest, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map