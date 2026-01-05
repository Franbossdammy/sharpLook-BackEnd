import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ValidationError } from '../utils/errors';

/**
 * Validate request using express-validator rules
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const formattedErrors = errors.array().map((error) => ({
      field: error.type === 'field' ? error.path : undefined,
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    // Send validation error response
    return next(new ValidationError('Validation failed', formattedErrors));
  };
};

/**
 * Sanitize request body to prevent NoSQL injection
 */
export const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};

/**
 * Sanitize an object recursively
 */
const sanitizeObject = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};
  
  for (const key in obj) {
    // Remove keys that start with '$' (MongoDB operators)
    if (key.startsWith('$')) {
      continue;
    }
    sanitized[key] = sanitizeObject(obj[key]);
  }

  return sanitized;
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  // Ensure page and limit are positive integers
  if (page < 1) {
    return next(new ValidationError('Page must be a positive integer'));
  }

  if (limit < 1 || limit > 100) {
    return next(new ValidationError('Limit must be between 1 and 100'));
  }

  // Attach to request
  req.query.page = page.toString();
  req.query.limit = limit.toString();

  next();
};

/**
 * Validate sort parameters
 */
export const validateSort = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const sortOrder = (req.query.sortOrder as string)?.toLowerCase();

  if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
    return next(new ValidationError('Sort order must be either "asc" or "desc"'));
  }

  next();
};
