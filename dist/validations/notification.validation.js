"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettingsValidation = exports.getNotificationsValidation = exports.notificationIdValidation = exports.unregisterDeviceTokenValidation = exports.registerDeviceTokenValidation = void 0;
const express_validator_1 = require("express-validator");
const types_1 = require("../types");
exports.registerDeviceTokenValidation = [
    (0, express_validator_1.body)('token').notEmpty().trim().withMessage('Token is required'),
    (0, express_validator_1.body)('deviceType').isIn(['ios', 'android', 'web']).withMessage('Invalid device type'),
    (0, express_validator_1.body)('deviceName').optional().trim().isLength({ max: 100 }),
];
exports.unregisterDeviceTokenValidation = [
    (0, express_validator_1.body)('token').notEmpty().trim().withMessage('Token is required'),
];
exports.notificationIdValidation = [
    (0, express_validator_1.param)('notificationId').isMongoId().withMessage('Invalid notification ID'),
];
exports.getNotificationsValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    (0, express_validator_1.query)('type')
        .optional()
        .isIn(Object.values(types_1.NotificationType))
        .withMessage('Invalid notification type'),
    (0, express_validator_1.query)('isRead').optional().isBoolean().withMessage('isRead must be boolean'),
];
exports.updateSettingsValidation = [
    // General Settings
    (0, express_validator_1.body)('notificationsEnabled')
        .optional()
        .isBoolean()
        .withMessage('notificationsEnabled must be boolean'),
    (0, express_validator_1.body)('emailNotifications')
        .optional()
        .isBoolean()
        .withMessage('emailNotifications must be boolean'),
    (0, express_validator_1.body)('pushNotifications')
        .optional()
        .isBoolean()
        .withMessage('pushNotifications must be boolean'),
    // Activity Notifications
    (0, express_validator_1.body)('bookingUpdates')
        .optional()
        .isBoolean()
        .withMessage('bookingUpdates must be boolean'),
    (0, express_validator_1.body)('newMessages')
        .optional()
        .isBoolean()
        .withMessage('newMessages must be boolean'),
    (0, express_validator_1.body)('paymentAlerts')
        .optional()
        .isBoolean()
        .withMessage('paymentAlerts must be boolean'),
    (0, express_validator_1.body)('reminderNotifications')
        .optional()
        .isBoolean()
        .withMessage('reminderNotifications must be boolean'),
    // Marketing Notifications
    (0, express_validator_1.body)('promotions')
        .optional()
        .isBoolean()
        .withMessage('promotions must be boolean'),
];
//# sourceMappingURL=notification.validation.js.map