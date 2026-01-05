"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFound = exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
const config_1 = __importDefault(require("../config"));
const response_1 = __importDefault(require("../utils/response"));
/**
 * Handle MongoDB Cast Error (Invalid ID)
 */
const handleCastError = (error) => {
    const message = `Invalid ${error.path}: ${error.value}`;
    return new errors_1.AppError(message, 400, 'INVALID_ID');
};
/**
 * Handle MongoDB Duplicate Key Error
 */
const handleDuplicateKeyError = (error) => {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
    return new errors_1.AppError(message, 409, 'DUPLICATE_KEY');
};
/**
 * Handle MongoDB Validation Error
 */
const handleValidationError = (error) => {
    // Extract validation errors
    Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
    }));
    return new errors_1.AppError('Validation failed', 400, 'VALIDATION_ERROR');
};
/**
 * Handle JWT Error
 */
const handleJWTError = () => {
    return new errors_1.AppError('Invalid token. Please log in again', 401, 'INVALID_TOKEN');
};
/**
 * Handle JWT Expired Error
 */
const handleJWTExpiredError = () => {
    return new errors_1.AppError('Your token has expired. Please log in again', 401, 'TOKEN_EXPIRED');
};
/**
 * Send error response in development
 */
const sendErrorDev = (error, res) => {
    response_1.default.error(res, error.message, error.statusCode, {
        status: error.statusCode,
        error: error,
        message: error.message,
        stack: error.stack,
    }, error.code);
};
/**
 * Send error response in production
 */
const sendErrorProd = (error, res) => {
    // Operational, trusted error: send message to client
    if (error.isOperational) {
        response_1.default.error(res, error.message, error.statusCode, undefined, error.code);
    }
    else {
        // Programming or unknown error: don't leak error details
        logger_1.default.error('ERROR 💥', error);
        response_1.default.error(res, 'Something went wrong. Please try again later', 500, undefined, 'INTERNAL_SERVER_ERROR');
    }
};
/**
 * Global error handling middleware
 */
const errorHandler = (err, _req, res, _next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    if (config_1.default.env === 'development') {
        console.error("🔥 REAL ERROR:", err);
        sendErrorDev(err, res);
    }
    else {
        let error = { ...err };
        error.message = err.message;
        if (err.name === 'CastError')
            error = handleCastError(err);
        if (err.code === 11000)
            error = handleDuplicateKeyError(err);
        if (err.name === 'ValidationError')
            error = handleValidationError(err);
        if (err.name === 'JsonWebTokenError')
            error = handleJWTError();
        if (err.name === 'TokenExpiredError')
            error = handleJWTExpiredError();
        sendErrorProd(error, res);
    }
};
exports.errorHandler = errorHandler;
/**
 * Handle 404 - Not Found
 */
const notFound = (req, _res, next) => {
    const message = `Cannot ${req.method} ${req.originalUrl}`;
    next(new errors_1.AppError(message, 404, 'ROUTE_NOT_FOUND'));
};
exports.notFound = notFound;
/**
 * Async error handler wrapper
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=error.js.map