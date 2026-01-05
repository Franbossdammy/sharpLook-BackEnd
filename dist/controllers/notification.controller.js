"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const notification_service_1 = __importDefault(require("../services/notification.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
const Notification_1 = __importDefault(require("../models/Notification"));
const User_1 = __importDefault(require("../models/User"));
class NotificationController {
    constructor() {
        this.registerDeviceToken = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { token, deviceType, deviceName } = req.body;
            await notification_service_1.default.registerDeviceToken(userId, token, deviceType, deviceName);
            return response_1.default.success(res, 'Device token registered');
        });
        this.unregisterDeviceToken = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { token } = req.body;
            await notification_service_1.default.unregisterDeviceToken(token);
            return response_1.default.success(res, 'Device token unregistered');
        });
        this.getUserNotifications = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                type: req.query.type,
                isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
            };
            const result = await notification_service_1.default.getUserNotifications(userId, filters, page, limit);
            return response_1.default.success(res, 'Notifications retrieved', result.notifications, 200, {
                pagination: {
                    currentPage: page,
                    totalPages: result.totalPages,
                    pageSize: limit,
                    totalItems: result.total,
                    hasNextPage: page < result.totalPages,
                    hasPrevPage: page > 1,
                },
                unreadCount: result.unreadCount,
            });
        });
        this.markAsRead = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { notificationId } = req.params;
            const userId = req.user.id;
            await notification_service_1.default.markAsRead(notificationId, userId);
            return response_1.default.success(res, 'Notification marked as read');
        });
        this.markAllAsRead = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            await notification_service_1.default.markAllAsRead(userId);
            return response_1.default.success(res, 'All notifications marked as read');
        });
        this.getUnreadCount = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const count = await notification_service_1.default.getUnreadCount(userId);
            return response_1.default.success(res, 'Unread count retrieved', { count });
        });
        this.deleteNotification = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { notificationId } = req.params;
            const userId = req.user.id;
            await notification_service_1.default.deleteNotification(notificationId, userId);
            return response_1.default.success(res, 'Notification deleted');
        });
        this.clearAllNotifications = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            await notification_service_1.default.clearAllNotifications(userId);
            return response_1.default.success(res, 'All notifications cleared');
        });
        this.getNotificationSettings = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const settings = await notification_service_1.default.getNotificationSettings(userId);
            return response_1.default.success(res, 'Settings retrieved', { settings });
        });
        this.updateNotificationSettings = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            await notification_service_1.default.updateNotificationSettings(userId, req.body);
            return response_1.default.success(res, 'Settings updated');
        });
        /**
       * Send notification to all users (admin)
       * POST /api/v1/notifications/admin/send-to-all
       */
        this.sendToAllUsers = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { type, title, message, actionUrl, channels, filters } = req.body;
            // Get all users or filtered users
            let userQuery = {};
            if (filters?.role) {
                if (filters.role === 'vendor') {
                    userQuery.isVendor = true;
                }
                else if (filters.role === 'client') {
                    userQuery.isVendor = false;
                }
            }
            if (filters?.isVerified !== undefined) {
                userQuery['vendorProfile.isVerified'] = filters.isVerified;
            }
            const users = await User_1.default.find(userQuery).select('_id');
            const userIds = users.map(u => u._id.toString());
            await notification_service_1.default.sendBulkNotifications(userIds, {
                type,
                title,
                message,
                actionUrl,
                channels,
            });
            return response_1.default.success(res, `Notification sent to ${userIds.length} users`, { userCount: userIds.length });
        });
        /**
         * Send notification to specific users (admin)
         * POST /api/v1/notifications/admin/send-to-users
         */
        this.sendToSpecificUsers = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { userIds, type, title, message, actionUrl, channels } = req.body;
            await notification_service_1.default.sendBulkNotifications(userIds, {
                type,
                title,
                message,
                actionUrl,
                channels,
            });
            return response_1.default.success(res, `Notification sent to ${userIds.length} users`, { userCount: userIds.length });
        });
        /**
         * Get notification statistics (admin)
         * GET /api/v1/notifications/admin/stats
         */
        this.getNotificationStats = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const [totalNotifications, totalSent, totalRead, totalUnread, notificationsByType,] = await Promise.all([
                Notification_1.default.countDocuments(),
                Notification_1.default.countDocuments({ isSent: true }),
                Notification_1.default.countDocuments({ isRead: true }),
                Notification_1.default.countDocuments({ isRead: false }),
                Notification_1.default.aggregate([
                    {
                        $group: {
                            _id: '$type',
                            count: { $sum: 1 },
                        },
                    },
                ]),
            ]);
            const byType = notificationsByType.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {});
            return response_1.default.success(res, 'Notification statistics retrieved', {
                stats: {
                    total: totalNotifications,
                    sent: totalSent,
                    read: totalRead,
                    unread: totalUnread,
                    byType,
                },
            });
        });
        /**
         * Get all notifications (admin)
         * GET /api/v1/notifications/admin/all
         */
        this.getAllNotifications = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;
            const filters = {};
            if (req.query.type)
                filters.type = req.query.type;
            if (req.query.isRead !== undefined)
                filters.isRead = req.query.isRead === 'true';
            if (req.query.isSent !== undefined)
                filters.isSent = req.query.isSent === 'true';
            const [notifications, total] = await Promise.all([
                Notification_1.default.find(filters)
                    .populate('user', 'firstName lastName email')
                    .skip(skip)
                    .limit(limit)
                    .sort({ createdAt: -1 }),
                Notification_1.default.countDocuments(filters),
            ]);
            return response_1.default.paginated(res, 'Notifications retrieved', notifications, page, limit, total);
        });
    }
}
exports.default = new NotificationController();
//# sourceMappingURL=notification.controller.js.map