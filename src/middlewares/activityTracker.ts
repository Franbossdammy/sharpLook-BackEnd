import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import User from '../models/User';
import logger from '../utils/logger';

/**
 * Middleware to update user activity on each request
 */
export const updateUserActivity = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  if (req.user?.id) {
    // Update in background, don't await to avoid slowing down requests
    User.findByIdAndUpdate(req.user.id, {
      isOnline: true,
      lastSeen: new Date(),
    }).catch((err) => {
      logger.error('Failed to update user activity:', err);
    });
  }
  next();
};

/**
 * Middleware to track user heartbeat (for real-time status)
 */
export const heartbeat = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  if (req.user?.id) {
    try {
      await User.findByIdAndUpdate(req.user.id, {
        isOnline: true,
        lastSeen: new Date(),
      });
    } catch (error) {
      logger.error('Heartbeat update failed:', error);
    }
  }
  next();
};