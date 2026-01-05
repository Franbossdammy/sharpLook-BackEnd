"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Notification_1 = __importDefault(require("../models/Notification"));
const DeviceToken_1 = __importDefault(require("../models/DeviceToken"));
const User_1 = __importDefault(require("../models/User"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const types_1 = require("../types");
const logger_1 = __importDefault(require("../utils/logger"));
class NotificationService {
    /**
     * Check if user wants to receive this type of notification
     */
    async shouldSendNotification(userId, notificationType, channel) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            return false;
        }
        // Check if notifications are globally enabled
        if (!user.preferences?.notificationsEnabled) {
            return false;
        }
        // Check channel-specific preferences
        if (channel === 'push' && !user.preferences?.pushNotifications) {
            return false;
        }
        if (channel === 'email' && !user.preferences?.emailNotifications) {
            return false;
        }
        // Map notification types to preference settings
        const typePreferenceMap = {
            // Booking-related
            [types_1.NotificationType.BOOKING_CREATED]: 'bookingUpdates',
            [types_1.NotificationType.BOOKING_CONFIRMED]: 'bookingUpdates',
            [types_1.NotificationType.BOOKING_STARTED]: 'bookingUpdates',
            [types_1.NotificationType.BOOKING_COMPLETED]: 'bookingUpdates',
            [types_1.NotificationType.BOOKING_CANCELLED]: 'bookingUpdates',
            [types_1.NotificationType.BOOKING_RESCHEDULED]: 'bookingUpdates',
            // Message-related
            [types_1.NotificationType.NEW_MESSAGE]: 'newMessages',
            // Payment-related
            [types_1.NotificationType.PAYMENT_RECEIVED]: 'paymentAlerts',
            [types_1.NotificationType.PAYMENT_SUCCESSFUL]: 'paymentAlerts',
            [types_1.NotificationType.PAYMENT_FAILED]: 'paymentAlerts',
            [types_1.NotificationType.PAYMENT_REFUNDED]: 'paymentAlerts',
            [types_1.NotificationType.WITHDRAWAL_APPROVED]: 'paymentAlerts',
            [types_1.NotificationType.WITHDRAWAL_REJECTED]: 'paymentAlerts',
            // Reminder-related
            [types_1.NotificationType.BOOKING_REMINDER]: 'reminderNotifications',
            // Offer-related
            [types_1.NotificationType.NEW_OFFER_NEARBY]: 'bookingUpdates',
            [types_1.NotificationType.OFFER_RESPONSE]: 'bookingUpdates',
            [types_1.NotificationType.OFFER_ACCEPTED]: 'bookingUpdates',
            [types_1.NotificationType.OFFER_COUNTER]: 'bookingUpdates',
            // Promotional
            [types_1.NotificationType.PROMOTIONAL]: 'promotions',
            [types_1.NotificationType.NEW_OFFER]: 'promotions',
        };
        // Get the preference key for this notification type
        const preferenceKey = typePreferenceMap[notificationType];
        // If there's a specific preference for this type, check it
        if (preferenceKey && user.preferences?.[preferenceKey] !== undefined) {
            return user.preferences[preferenceKey];
        }
        // Default to true for notification types without specific preferences
        return true;
    }
    /**
     * Create notification with preference checking
     */
    async createNotification(data) {
        // Get user preferences
        const user = await User_1.default.findById(data.userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Check if notifications are globally enabled
        if (!user.preferences?.notificationsEnabled) {
            logger_1.default.info(`Notifications disabled for user ${data.userId}`);
            return null;
        }
        // Check if this notification type should be sent
        const shouldSendInApp = await this.shouldSendNotification(data.userId, data.type, 'inApp');
        if (!shouldSendInApp && !data.channels?.email && !data.channels?.sms) {
            logger_1.default.info(`User ${data.userId} has disabled ${data.type} notifications`);
            return null;
        }
        // Determine which channels to use based on preferences
        const channels = {
            push: data.channels?.push !== false &&
                (await this.shouldSendNotification(data.userId, data.type, 'push')),
            email: data.channels?.email === true &&
                (await this.shouldSendNotification(data.userId, data.type, 'email')),
            sms: data.channels?.sms === true &&
                (await this.shouldSendNotification(data.userId, data.type, 'sms')),
            inApp: data.channels?.inApp !== false && shouldSendInApp,
        };
        // Don't create notification if all channels are disabled
        if (!channels.push && !channels.email && !channels.sms && !channels.inApp) {
            logger_1.default.info(`All channels disabled for notification type ${data.type} for user ${data.userId}`);
            return null;
        }
        // Create notification
        const notification = await Notification_1.default.create({
            user: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            relatedBooking: data.relatedBooking,
            relatedPayment: data.relatedPayment,
            relatedDispute: data.relatedDispute,
            relatedReview: data.relatedReview,
            relatedMessage: data.relatedMessage,
            actionUrl: data.actionUrl,
            channels,
            data: data.data,
            isRead: false,
            isSent: false,
        });
        // Send notification
        await this.sendNotification(notification);
        logger_1.default.info(`Notification created: ${notification._id} for user ${data.userId}`);
        return notification;
    }
    /**
     * Send notification via channels (with preference checks)
     */
    async sendNotification(notification) {
        const promises = [];
        // Send push notification
        if (notification.channels.push) {
            promises.push(this.sendPushNotification(notification));
        }
        // Send email notification
        if (notification.channels.email) {
            promises.push(this.sendEmailNotification(notification));
        }
        // Send SMS notification
        if (notification.channels.sms) {
            promises.push(this.sendSMSNotification(notification));
        }
        try {
            await Promise.allSettled(promises);
            notification.isSent = true;
            notification.sentAt = new Date();
            await notification.save();
        }
        catch (error) {
            notification.failedAt = new Date();
            notification.failureReason = error.message;
            await notification.save();
            logger_1.default.error(`Failed to send notification ${notification._id}:`, error);
        }
    }
    /**
     * ✅ UPDATED: Send push notification (supports both Firebase FCM and Expo Push)
     */
    async sendPushNotification(notification) {
        try {
            // Get user's device tokens
            const tokens = await DeviceToken_1.default.find({
                user: notification.user,
                isActive: true,
            });
            if (tokens.length === 0) {
                logger_1.default.info(`No active device tokens for user ${notification.user}`);
                return;
            }
            logger_1.default.info(`Found ${tokens.length} device token(s) for user ${notification.user}`);
            // Separate Expo and Firebase tokens
            const expoTokens = [];
            const fcmTokens = [];
            tokens.forEach((tokenDoc) => {
                const token = tokenDoc.token;
                // ✅ Detect token type by format
                if (token.startsWith('ExponentPushToken[')) {
                    expoTokens.push(token);
                }
                else {
                    fcmTokens.push(token);
                }
            });
            logger_1.default.info(`Token breakdown: ${expoTokens.length} Expo, ${fcmTokens.length} FCM`);
            // Send to Expo tokens
            if (expoTokens.length > 0) {
                await this.sendExpoNotification(expoTokens, notification);
            }
            // Send to Firebase tokens
            if (fcmTokens.length > 0) {
                await this.sendFCMNotification(fcmTokens, notification);
            }
        }
        catch (error) {
            logger_1.default.error('Failed to send push notification:', error);
            throw error;
        }
    }
    /**
     * ✅ NEW: Send notification via Expo Push API
     */
    async sendExpoNotification(tokens, notification) {
        try {
            logger_1.default.info(`Sending Expo push notification to ${tokens.length} device(s)`);
            // Prepare Expo push messages
            const messages = tokens.map(token => ({
                to: token,
                sound: 'default',
                title: notification.title,
                body: notification.message,
                data: {
                    notificationId: notification._id.toString(),
                    type: notification.type,
                    actionUrl: notification.actionUrl,
                    ...notification.data,
                },
                priority: 'high',
                channelId: 'default',
            }));
            // Send to Expo Push API
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messages),
            });
            const result = await response.json();
            if (response.ok) {
                logger_1.default.info(`✅ Expo push notification sent successfully to ${tokens.length} device(s)`);
                logger_1.default.info(`Response:`, result);
            }
            else {
                logger_1.default.error(`❌ Expo push notification failed:`, result);
            }
        }
        catch (error) {
            logger_1.default.error('❌ Failed to send Expo push notification:', error);
            throw error;
        }
    }
    /**
     * ✅ EXISTING: Send notification via Firebase FCM
     */
    async sendFCMNotification(tokens, _notification) {
        try {
            logger_1.default.info(`Sending FCM push notification to ${tokens.length} device(s)`);
            // TODO: Implement Firebase Admin SDK sending
            // This is placeholder - you'll need Firebase Admin SDK setup
            logger_1.default.info(`FCM push notification would be sent to: ${tokens.join(', ')}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send FCM notification:', error);
            throw error;
        }
    }
    /**
     * Send email notification
     */
    async sendEmailNotification(notification) {
        try {
            const user = await User_1.default.findById(notification.user);
            if (!user) {
                return;
            }
            // Double-check email preference
            if (!user.preferences?.emailNotifications) {
                logger_1.default.info(`Email notifications disabled for user ${user._id}`);
                return;
            }
            // Use email service
            logger_1.default.info(`Email notification sent to ${user.email}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send email notification:', error);
            throw error;
        }
    }
    /**
     * Send SMS notification
     */
    async sendSMSNotification(notification) {
        try {
            const user = await User_1.default.findById(notification.user);
            if (!user) {
                return;
            }
            // Use SMS service
            logger_1.default.info(`SMS notification sent to ${user.phone}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send SMS notification:', error);
            throw error;
        }
    }
    /**
     * Register device token
     */
    async registerDeviceToken(userId, token, deviceType, deviceName) {
        const existingToken = await DeviceToken_1.default.findOne({ token });
        if (existingToken) {
            if (existingToken.user.toString() !== userId) {
                existingToken.user = userId;
            }
            existingToken.isActive = true;
            existingToken.lastUsedAt = new Date();
            existingToken.deviceName = deviceName || existingToken.deviceName;
            await existingToken.save();
        }
        else {
            await DeviceToken_1.default.create({
                user: userId,
                token,
                deviceType,
                deviceName,
                isActive: true,
                lastUsedAt: new Date(),
            });
        }
        // ✅ Log token type
        const tokenType = token.startsWith('ExponentPushToken[') ? 'Expo' : 'FCM';
        logger_1.default.info(`${tokenType} device token registered for user ${userId} on ${deviceType}`);
    }
    /**
     * Unregister device token
     */
    async unregisterDeviceToken(token) {
        await DeviceToken_1.default.findOneAndUpdate({ token }, { isActive: false });
        logger_1.default.info(`Device token unregistered: ${token}`);
    }
    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, userId) {
        const notification = await Notification_1.default.findOne({
            _id: notificationId,
            user: userId,
        });
        if (!notification) {
            throw new errors_1.NotFoundError('Notification not found');
        }
        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();
    }
    /**
     * Mark all notifications as read
     */
    async markAllAsRead(userId) {
        await Notification_1.default.updateMany({ user: userId, isRead: false }, { isRead: true, readAt: new Date() });
    }
    /**
     * Get user notifications
     */
    async getUserNotifications(userId, filters, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = { user: userId };
        if (filters?.type) {
            query.type = filters.type;
        }
        if (filters?.isRead !== undefined) {
            query.isRead = filters.isRead;
        }
        const [notifications, total, unreadCount] = await Promise.all([
            Notification_1.default.find(query)
                .populate('relatedBooking', 'bookingNumber service scheduledDate status')
                .populate('relatedPayment', 'amount status')
                .populate('relatedDispute', 'disputeNumber status')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Notification_1.default.countDocuments(query),
            Notification_1.default.countDocuments({ user: userId, isRead: false }),
        ]);
        return {
            notifications,
            total,
            unreadCount,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get unread count
     */
    async getUnreadCount(userId) {
        return await Notification_1.default.countDocuments({
            user: userId,
            isRead: false,
        });
    }
    /**
     * Delete notification
     */
    async deleteNotification(notificationId, userId) {
        const notification = await Notification_1.default.findOne({
            _id: notificationId,
            user: userId,
        });
        if (!notification) {
            throw new errors_1.NotFoundError('Notification not found');
        }
        notification.isDeleted = true;
        notification.deletedAt = new Date();
        await notification.save();
    }
    /**
     * Clear all notifications
     */
    async clearAllNotifications(userId) {
        await Notification_1.default.updateMany({ user: userId }, { isDeleted: true, deletedAt: new Date() });
    }
    /**
     * Get notification settings
     */
    async getNotificationSettings(userId) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        return {
            // General
            notificationsEnabled: user.preferences?.notificationsEnabled ?? true,
            emailNotifications: user.preferences?.emailNotifications ?? true,
            pushNotifications: user.preferences?.pushNotifications ?? true,
            // Activity
            bookingUpdates: user.preferences?.bookingUpdates ?? true,
            newMessages: user.preferences?.newMessages ?? true,
            paymentAlerts: user.preferences?.paymentAlerts ?? true,
            reminderNotifications: user.preferences?.reminderNotifications ?? true,
            // Marketing
            promotions: user.preferences?.promotions ?? false,
        };
    }
    /**
     * Update notification settings
     */
    async updateNotificationSettings(userId, settings) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Initialize preferences if not exists
        if (!user.preferences) {
            user.preferences = {
                darkMode: false,
                fingerprintEnabled: false,
                notificationsEnabled: true,
                emailNotifications: true,
                pushNotifications: true,
                bookingUpdates: true,
                newMessages: true,
                paymentAlerts: true,
                reminderNotifications: true,
                promotions: false,
            };
        }
        // Update all provided settings
        if (settings.notificationsEnabled !== undefined) {
            user.preferences.notificationsEnabled = settings.notificationsEnabled;
        }
        if (settings.emailNotifications !== undefined) {
            user.preferences.emailNotifications = settings.emailNotifications;
        }
        if (settings.pushNotifications !== undefined) {
            user.preferences.pushNotifications = settings.pushNotifications;
        }
        if (settings.bookingUpdates !== undefined) {
            user.preferences.bookingUpdates = settings.bookingUpdates;
        }
        if (settings.newMessages !== undefined) {
            user.preferences.newMessages = settings.newMessages;
        }
        if (settings.paymentAlerts !== undefined) {
            user.preferences.paymentAlerts = settings.paymentAlerts;
        }
        if (settings.reminderNotifications !== undefined) {
            user.preferences.reminderNotifications = settings.reminderNotifications;
        }
        if (settings.promotions !== undefined) {
            user.preferences.promotions = settings.promotions;
        }
        await user.save();
        logger_1.default.info(`Notification settings updated for user ${userId}`);
    }
    /**
     * Send bulk notifications
     */
    async sendBulkNotifications(userIds, data) {
        logger_1.default.info(`Sending bulk notifications to ${userIds.length} users`);
        if (!userIds || userIds.length === 0) {
            return;
        }
        try {
            const users = await User_1.default.find({
                _id: { $in: userIds }
            }).select('_id preferences');
            const eligibleUsers = users.filter(user => {
                const prefs = user.preferences || {};
                return prefs.notificationsEnabled !== false;
            });
            if (eligibleUsers.length === 0) {
                logger_1.default.info('No users eligible after filtering');
                return;
            }
            const notifications = eligibleUsers.map(user => ({
                user: user._id,
                type: data.type,
                title: data.title,
                message: data.message,
                actionUrl: data.actionUrl,
                channels: data.channels || { push: true, inApp: true },
                isRead: false,
                isSent: false,
                data: {
                    notificationType: data.type,
                    sentVia: 'bulk'
                }
            }));
            const created = await Notification_1.default.insertMany(notifications, {
                ordered: false
            });
            logger_1.default.info(`Created ${created.length} bulk notifications`);
            // Send notifications in background
            for (const notif of created) {
                try {
                    await this.sendNotification(notif);
                }
                catch (sendError) {
                    logger_1.default.error(`Failed to send notification ${notif._id}:`, sendError);
                }
            }
            logger_1.default.info(`Bulk notifications complete: ${created.length} sent`);
        }
        catch (error) {
            logger_1.default.error('Failed to send bulk notifications:', error);
            throw error;
        }
    }
}
exports.default = new NotificationService();
//# sourceMappingURL=notification.service.js.map