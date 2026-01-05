import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import config from '../config';
import ResponseHandler from '../utils/response';

/**
 * Handle MongoDB Cast Error (Invalid ID)
 */
const handleCastError = (error: any): AppError => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400, 'INVALID_ID');
};

/**
 * Handle MongoDB Duplicate Key Error
 */
const handleDuplicateKeyError = (error: any): AppError => {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
  return new AppError(message, 409, 'DUPLICATE_KEY');
};

/**
 * Handle MongoDB Validation Error
 */
const handleValidationError = (error: any): AppError => {
  // Extract validation errors
  Object.values(error.errors).map((err: any) => ({
    field: err.path,
    message: err.message,
  }));
  
  return new AppError('Validation failed', 400, 'VALIDATION_ERROR');
};

/**
 * Handle JWT Error
 */
const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again', 401, 'INVALID_TOKEN');
};

/**
 * Handle JWT Expired Error
 */
const handleJWTExpiredError = (): AppError => {
  return new AppError('Your token has expired. Please log in again', 401, 'TOKEN_EXPIRED');
};

/**
 * Send error response in development
 */
const sendErrorDev = (error: AppError, res: Response): void => {
  ResponseHandler.error(
    res,
    error.message,
    error.statusCode,
    {
      status: error.statusCode,
      error: error,
      message: error.message,
      stack: error.stack,
    },
    error.code
  );
};

/**
 * Send error response in production
 */
const sendErrorProd = (error: AppError, res: Response): void => {
  // Operational, trusted error: send message to client
  if (error.isOperational) {
    ResponseHandler.error(
      res,
      error.message,
      error.statusCode,
      undefined,
      error.code
    );
  } else {
    // Programming or unknown error: don't leak error details
    logger.error('ERROR 💥', error);
    
    ResponseHandler.error(
      res,
      'Something went wrong. Please try again later',
      500,
      undefined,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

 if (config.env === 'development') {
    console.error("🔥 REAL ERROR:", err); 
    sendErrorDev(err, res);
} else {
    let error = { ...err };
    error.message = err.message;

    if (err.name === 'CastError') error = handleCastError(err);
    if (err.code === 11000) error = handleDuplicateKeyError(err);
    if (err.name === 'ValidationError') error = handleValidationError(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
}

};

/**
 * Handle 404 - Not Found
 */
export const notFound = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const message = `Cannot ${req.method} ${req.originalUrl}`;
  next(new AppError(message, 404, 'ROUTE_NOT_FOUND'));
};

/**
 * Async error handler wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
