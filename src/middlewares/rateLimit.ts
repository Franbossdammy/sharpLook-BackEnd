import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import config from '../config';
import ResponseHandler from '../utils/response';
import { Request, Response } from 'express';

/**
 * General API rate limiter
 */
/**
 * Bucket per signed-in user, falling back to IP. Nigerian mobile carriers put
 * many subscribers behind one public IP, so a pure per-IP limit lets one busy
 * user (or a few) lock out everyone else on that network. The token is
 * verified, so forged tokens can't be used to get fresh buckets.
 */
const userOrIpKey = (req: Request): string => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), config.jwt.secret) as { id?: string };
      if (decoded?.id) return `user:${decoded.id}`;
    } catch {
      // expired / invalid — fall through to IP
    }
  }
  return `ip:${req.ip}`;
};

export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  // Floor of 300 per window: payment confirmation polling plus normal use
  // could exhaust the old 100 and show users errors mid-payment.
  max: Math.max(config.rateLimit.maxRequests, 300),
  keyGenerator: userOrIpKey,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    ResponseHandler.error(
      res,
      'Too many requests from this IP, please try again later',
      429,
      undefined,
      'RATE_LIMIT_EXCEEDED'
    );
  },
});

/**
 * Strict rate limiter for authentication routes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req: Request, res: Response) => {
    ResponseHandler.error(
      res,
      'Too many authentication attempts, please try again later',
      429,
      undefined,
      'AUTH_RATE_LIMIT_EXCEEDED'
    );
  },
});

/**
 * Rate limiter for password reset
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'Too many password reset attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    ResponseHandler.error(
      res,
      'Too many password reset attempts, please try again later',
      429,
      undefined,
      'PASSWORD_RESET_RATE_LIMIT_EXCEEDED'
    );
  },
});

/**
 * Rate limiter for file uploads
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per window
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    ResponseHandler.error(
      res,
      'Too many file uploads, please try again later',
      429,
      undefined,
      'UPLOAD_RATE_LIMIT_EXCEEDED'
    );
  },
});

/**
 * Rate limiter for search operations
 */
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    ResponseHandler.error(
      res,
      'Too many search requests, please try again later',
      429,
      undefined,
      'SEARCH_RATE_LIMIT_EXCEEDED'
    );
  },
});

/**
 * Rate limiter for payment operations
 */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 payment operations per hour
  message: 'Too many payment requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    ResponseHandler.error(
      res,
      'Too many payment requests, please try again later',
      429,
      undefined,
      'PAYMENT_RATE_LIMIT_EXCEEDED'
    );
  },
});
