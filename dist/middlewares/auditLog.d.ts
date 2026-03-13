import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
/**
 * Middleware that logs user actions based on HTTP method and route.
 * Attach after authenticate middleware so req.user is available.
 */
export declare const auditMiddleware: (resource: string) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auditLog.d.ts.map