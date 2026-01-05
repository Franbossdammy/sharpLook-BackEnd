import { body, param, query } from 'express-validator';
import { NotificationType } from '../types';

export const registerDeviceTokenValidation = [
  body('token').notEmpty().trim().withMessage('Token is required'),
  body('deviceType').isIn(['ios', 'android', 'web']).withMessage('Invalid device type'),
  body('deviceName').optional().trim().isLength({ max: 100 }),
];

export const unregisterDeviceTokenValidation = [
  body('token').notEmpty().trim().withMessage('Token is required'),
];

export const notificationIdValidation = [
  param('notificationId').isMongoId().withMessage('Invalid notification ID'),
];

export const getNotificationsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('type')
    .optional()
    .isIn(Object.values(NotificationType))
    .withMessage('Invalid notification type'),
  query('isRead').optional().isBoolean().withMessage('isRead must be boolean'),
];

export const updateSettingsValidation = [
  // General Settings
  body('notificationsEnabled')
    .optional()
    .isBoolean()
    .withMessage('notificationsEnabled must be boolean'),
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('emailNotifications must be boolean'),
  body('pushNotifications')
    .optional()
    .isBoolean()
    .withMessage('pushNotifications must be boolean'),
  
  // Activity Notifications
  body('bookingUpdates')
    .optional()
    .isBoolean()
    .withMessage('bookingUpdates must be boolean'),
  body('newMessages')
    .optional()
    .isBoolean()
    .withMessage('newMessages must be boolean'),
  body('paymentAlerts')
    .optional()
    .isBoolean()
    .withMessage('paymentAlerts must be boolean'),
  body('reminderNotifications')
    .optional()
    .isBoolean()
    .withMessage('reminderNotifications must be boolean'),
  
  // Marketing Notifications
  body('promotions')
    .optional()
    .isBoolean()
    .withMessage('promotions must be boolean'),
];