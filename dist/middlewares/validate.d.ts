import { Request, Response, NextFunction } from 'express';
import { ValidationChain } from 'express-validator';
/**
 * Validate request using express-validator rules
 */
export declare const validate: (validations: ValidationChain[]) => (req: Request, _res: Response, next: NextFunction) => Promise<void>;
/**
 * Sanitize request body to prevent NoSQL injection
 */
export declare const sanitizeBody: (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Validate pagination parameters
 */
export declare const validatePagination: (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Validate sort parameters
 */
export declare const validateSort: (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=validate.d.ts.map