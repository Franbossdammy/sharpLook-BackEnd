"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = __importDefault(require("../controllers/notification.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const notification_validation_1 = require("../validations/notification.validation");
const auth_2 = require("../middlewares/auth");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/notifications/register-device
 * @desc    Register device token for push notifications
 * @access  Private
 */
router.post('/register-device', auth_1.authenticate, (0, validate_1.validate)(notification_validation_1.registerDeviceTokenValidation), notification_controller_1.default.registerDeviceToken);
/**
 * @route   POST /api/v1/notifications/unregister-device
 * @desc    Unregister device token
 * @access  Private
 */
router.post('/unregister-device', auth_1.authenticate, (0, validate_1.validate)(notification_validation_1.unregisterDeviceTokenValidation), notification_controller_1.default.unregisterDeviceToken);
/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', auth_1.authenticate, validate_1.validatePagination, (0, validate_1.validate)(notification_validation_1.getNotificationsValidation), notification_controller_1.default.getUserNotifications);
/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', auth_1.authenticate, notification_controller_1.default.getUnreadCount);
/**
 * @route   PUT /api/v1/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:notificationId/read', auth_1.authenticate, (0, validate_1.validate)(notification_validation_1.notificationIdValidation), notification_controller_1.default.markAsRead);
/**
 * @route   PUT /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', auth_1.authenticate, notification_controller_1.default.markAllAsRead);
/**
 * @route   DELETE /api/v1/notifications/:notificationId
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:notificationId', auth_1.authenticate, (0, validate_1.validate)(notification_validation_1.notificationIdValidation), notification_controller_1.default.deleteNotification);
/**
 * @route   DELETE /api/v1/notifications
 * @desc    Clear all notifications
 * @access  Private
 */
router.delete('/', auth_1.authenticate, notification_controller_1.default.clearAllNotifications);
/**
 * @route   GET /api/v1/notifications/settings
 * @desc    Get notification settings
 * @access  Private
 */
router.get('/settings', auth_1.authenticate, notification_controller_1.default.getNotificationSettings);
/**
 * @route   PUT /api/v1/notifications/settings
 * @desc    Update notification settings
 * @access  Private
 */
router.put('/settings', auth_1.authenticate, (0, validate_1.validate)(notification_validation_1.updateSettingsValidation), notification_controller_1.default.updateNotificationSettings);
// ==================== ADMIN ROUTES ====================
/**
 * @route   POST /api/v1/notifications/admin/send-to-all
 * @desc    Send notification to all users
 * @access  Private (Admin)
 */
router.post('/admin/send-to-all', auth_1.authenticate, auth_2.requireAdmin, notification_controller_1.default.sendToAllUsers);
/**
 * @route   POST /api/v1/notifications/admin/send-to-users
 * @desc    Send notification to specific users
 * @access  Private (Admin)
 */
router.post('/admin/send-to-users', auth_1.authenticate, auth_2.requireAdmin, notification_controller_1.default.sendToSpecificUsers);
/**
 * @route   GET /api/v1/notifications/admin/stats
 * @desc    Get notification statistics
 * @access  Private (Admin)
 */
router.get('/admin/stats', auth_1.authenticate, auth_2.requireAdmin, notification_controller_1.default.getNotificationStats);
/**
 * @route   GET /api/v1/notifications/admin/all
 * @desc    Get all notifications
 * @access  Private (Admin)
 */
router.get('/admin/all', auth_1.authenticate, auth_2.requireAdmin, validate_1.validatePagination, notification_controller_1.default.getAllNotifications);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map