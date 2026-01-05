import { Request, Response, NextFunction } from 'express';
/**
 * Global error handling middleware
 */
export declare const errorHandler: (err: any, _req: Request, res: Response, _next: NextFunction) => void;
/**
 * Handle 404 - Not Found
 */
export declare const notFound: (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Async error handler wrapper
 */
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=error.d.ts.map