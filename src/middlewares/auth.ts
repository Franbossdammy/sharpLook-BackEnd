import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { AuthRequest } from '../types';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import User from '../models/User';
import { UserRole } from '../types';
import mongoose from 'mongoose';

interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Check if user still exists
    const user = await User.findById(decoded.id).select('+refreshToken');
    
    if (!user) {
      throw new UnauthorizedError('User no longer exists');
    }

    // Check if user is active
    if (user.status !== 'active' && user.status !== 'pending_verification') {
      throw new UnauthorizedError('Your account has been deactivated');
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      throw new UnauthorizedError('Your account is temporarily locked due to multiple failed login attempts');
    }

    // Attach user to request
    req.user = {
      _id: mongoose.Types.ObjectId.createFromHexString(decoded.id),
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      isVendor: user.isVendor || false,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Check if user has required role
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError('You do not have permission to perform this action')
      );
    }

    next();
  };
};

/**
 * Check if user is a vendor
 */
export const requireVendor = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = await User.findById(req.user.id);
    
    if (!user || !user.isVendor) {
      throw new ForbiddenError('This action requires a vendor account');
    }

    if (!user.vendorProfile?.isVerified) {
      throw new ForbiddenError('Your vendor account is not verified');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't throw error if no token
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    const user = await User.findById(decoded.id);
    
    if (user && user.status === 'active') {
      req.user = {
        _id: mongoose.Types.ObjectId.createFromHexString(decoded.id),
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        isVendor: user.isVendor || false,
      };
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Check if user is admin (any admin role)
 */
export const requireAdmin = authorize(
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.FINANCIAL_ADMIN,
  UserRole.ANALYTICS_ADMIN,
  UserRole.SUPPORT
);

/**
 * Check if user is super admin only
 */
export const requireSuperAdmin = authorize(UserRole.SUPER_ADMIN);

/**
 * Check if user is financial admin
 */
export const requireFinancialAdmin = authorize(
  UserRole.SUPER_ADMIN,
  UserRole.FINANCIAL_ADMIN
);

/**
 * Check if user is analytics admin
 */
export const requireAnalyticsAdmin = authorize(
  UserRole.SUPER_ADMIN,
  UserRole.ANALYTICS_ADMIN
);