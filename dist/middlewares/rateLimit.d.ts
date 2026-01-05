/**
 * General API rate limiter
 */
export declare const apiLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Strict rate limiter for authentication routes
 */
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Rate limiter for password reset
 */
export declare const passwordResetLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Rate limiter for file uploads
 */
export declare const uploadLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Rate limiter for search operations
 */
export declare const searchLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Rate limiter for payment operations
 */
export declare const paymentLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rateLimit.d.ts.map