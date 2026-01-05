import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
/**
 * Middleware to update user activity on each request
 */
export declare const updateUserActivity: (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to track user heartbeat (for real-time status)
 */
export declare const heartbeat: (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=activityTracker.d.ts.map