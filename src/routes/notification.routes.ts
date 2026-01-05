import { Router } from 'express';
import notificationController from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  registerDeviceTokenValidation,
  unregisterDeviceTokenValidation,
  notificationIdValidation,
  getNotificationsValidation,
  updateSettingsValidation,
} from '../validations/notification.validation';
import { requireAdmin } from '../middlewares/auth';


const router = Router();

/**
 * @route   POST /api/v1/notifications/register-device
 * @desc    Register device token for push notifications
 * @access  Private
 */
router.post(
  '/register-device',
  authenticate,
  validate(registerDeviceTokenValidation),
  notificationController.registerDeviceToken
);

/**
 * @route   POST /api/v1/notifications/unregister-device
 * @desc    Unregister device token
 * @access  Private
 */
router.post(
  '/unregister-device',
  authenticate,
  validate(unregisterDeviceTokenValidation),
  notificationController.unregisterDeviceToken
);

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  validatePagination,
  validate(getNotificationsValidation),
  notificationController.getUserNotifications
);

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

/**
 * @route   PUT /api/v1/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put(
  '/:notificationId/read',
  authenticate,
  validate(notificationIdValidation),
  notificationController.markAsRead
);

/**
 * @route   PUT /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', authenticate, notificationController.markAllAsRead);

/**
 * @route   DELETE /api/v1/notifications/:notificationId
 * @desc    Delete notification
 * @access  Private
 */
router.delete(
  '/:notificationId',
  authenticate,
  validate(notificationIdValidation),
  notificationController.deleteNotification
);

/**
 * @route   DELETE /api/v1/notifications
 * @desc    Clear all notifications
 * @access  Private
 */
router.delete('/', authenticate, notificationController.clearAllNotifications);

/**
 * @route   GET /api/v1/notifications/settings
 * @desc    Get notification settings
 * @access  Private
 */
router.get('/settings', authenticate, notificationController.getNotificationSettings);

/**
 * @route   PUT /api/v1/notifications/settings
 * @desc    Update notification settings
 * @access  Private
 */
router.put(
  '/settings',
  authenticate,
  validate(updateSettingsValidation),
  notificationController.updateNotificationSettings
);


// ==================== ADMIN ROUTES ====================

/**
 * @route   POST /api/v1/notifications/admin/send-to-all
 * @desc    Send notification to all users
 * @access  Private (Admin)
 */
router.post(
  '/admin/send-to-all',
  authenticate,
  requireAdmin,
  notificationController.sendToAllUsers
);

/**
 * @route   POST /api/v1/notifications/admin/send-to-users
 * @desc    Send notification to specific users
 * @access  Private (Admin)
 */
router.post(
  '/admin/send-to-users',
  authenticate,
  requireAdmin,
  notificationController.sendToSpecificUsers
);

/**
 * @route   GET /api/v1/notifications/admin/stats
 * @desc    Get notification statistics
 * @access  Private (Admin)
 */
router.get(
  '/admin/stats',
  authenticate,
  requireAdmin,
  notificationController.getNotificationStats
);

/**
 * @route   GET /api/v1/notifications/admin/all
 * @desc    Get all notifications
 * @access  Private (Admin)
 */
router.get(
  '/admin/all',
  authenticate,
  requireAdmin,
  validatePagination,
  notificationController.getAllNotifications
);

export default router;
