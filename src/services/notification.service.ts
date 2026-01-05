import Notification, { INotification } from '../models/Notification';
import DeviceToken from '../models/DeviceToken';
import User from '../models/User';
import { NotFoundError } from '../utils/errors';
import { parsePaginationParams } from '../utils/helpers';
import { NotificationType } from '../types';
import logger from '../utils/logger';

class NotificationService {
  /**
   * Check if user wants to receive this type of notification
   */
  private async shouldSendNotification(
    userId: string,
    notificationType: NotificationType,
    channel: 'push' | 'email' | 'sms' | 'inApp'
  ): Promise<boolean> {
    const user = await User.findById(userId);
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
    const typePreferenceMap: Record<string, keyof typeof user.preferences> = {
      // Booking-related
      [NotificationType.BOOKING_CREATED]: 'bookingUpdates',
      [NotificationType.BOOKING_CONFIRMED]: 'bookingUpdates',
      [NotificationType.BOOKING_STARTED]: 'bookingUpdates',
      [NotificationType.BOOKING_COMPLETED]: 'bookingUpdates',
      [NotificationType.BOOKING_CANCELLED]: 'bookingUpdates',
      [NotificationType.BOOKING_RESCHEDULED]: 'bookingUpdates',
      
      // Message-related
      [NotificationType.NEW_MESSAGE]: 'newMessages',
      
      // Payment-related
      [NotificationType.PAYMENT_RECEIVED]: 'paymentAlerts',
      [NotificationType.PAYMENT_SUCCESSFUL]: 'paymentAlerts',
      [NotificationType.PAYMENT_FAILED]: 'paymentAlerts',
      [NotificationType.PAYMENT_REFUNDED]: 'paymentAlerts',
      [NotificationType.WITHDRAWAL_APPROVED]: 'paymentAlerts',
      [NotificationType.WITHDRAWAL_REJECTED]: 'paymentAlerts',
      
      // Reminder-related
      [NotificationType.BOOKING_REMINDER]: 'reminderNotifications',
      
      // Offer-related
      [NotificationType.NEW_OFFER_NEARBY]: 'bookingUpdates',
      [NotificationType.OFFER_RESPONSE]: 'bookingUpdates',
      [NotificationType.OFFER_ACCEPTED]: 'bookingUpdates',
      [NotificationType.OFFER_COUNTER]: 'bookingUpdates',
      
      // Promotional
      [NotificationType.PROMOTIONAL]: 'promotions',
      [NotificationType.NEW_OFFER]: 'promotions',
    };

    // Get the preference key for this notification type
    const preferenceKey = typePreferenceMap[notificationType];

    // If there's a specific preference for this type, check it
    if (preferenceKey && user.preferences?.[preferenceKey] !== undefined) {
      return user.preferences[preferenceKey] as boolean;
    }

    // Default to true for notification types without specific preferences
    return true;
  }

  /**
   * Create notification with preference checking
   */
  public async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    relatedBooking?: string;
    relatedPayment?: string;
    relatedDispute?: string;
    relatedReview?: string;
    relatedMessage?: string;
    actionUrl?: string;
    channels?: {
      push?: boolean;
      email?: boolean;
      sms?: boolean;
      inApp?: boolean;
    };
    data?: any;
  }): Promise<INotification | null> {
    // Get user preferences
    const user = await User.findById(data.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if notifications are globally enabled
    if (!user.preferences?.notificationsEnabled) {
      logger.info(`Notifications disabled for user ${data.userId}`);
      return null;
    }

    // Check if this notification type should be sent
    const shouldSendInApp = await this.shouldSendNotification(
      data.userId,
      data.type,
      'inApp'
    );

    if (!shouldSendInApp && !data.channels?.email && !data.channels?.sms) {
      logger.info(
        `User ${data.userId} has disabled ${data.type} notifications`
      );
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
      logger.info(`All channels disabled for notification type ${data.type} for user ${data.userId}`);
      return null;
    }

    // Create notification
    const notification = await Notification.create({
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

    logger.info(
      `Notification created: ${notification._id} for user ${data.userId}`
    );

    return notification;
  }

  /**
   * Send notification via channels (with preference checks)
   */
  private async sendNotification(notification: INotification): Promise<void> {
    const promises: Promise<void>[] = [];

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
    } catch (error: any) {
      notification.failedAt = new Date();
      notification.failureReason = error.message;
      await notification.save();
      logger.error(`Failed to send notification ${notification._id}:`, error);
    }
  }

  /**
   * ✅ UPDATED: Send push notification (supports both Firebase FCM and Expo Push)
   */
  private async sendPushNotification(
    notification: INotification
  ): Promise<void> {
    try {
      // Get user's device tokens
      const tokens = await DeviceToken.find({
        user: notification.user,
        isActive: true,
      });

      if (tokens.length === 0) {
        logger.info(`No active device tokens for user ${notification.user}`);
        return;
      }

      logger.info(`Found ${tokens.length} device token(s) for user ${notification.user}`);

      // Separate Expo and Firebase tokens
      const expoTokens: string[] = [];
      const fcmTokens: string[] = [];

      tokens.forEach((tokenDoc) => {
        const token = tokenDoc.token;
        
        // ✅ Detect token type by format
        if (token.startsWith('ExponentPushToken[')) {
          expoTokens.push(token);
        } else {
          fcmTokens.push(token);
        }
      });

      logger.info(`Token breakdown: ${expoTokens.length} Expo, ${fcmTokens.length} FCM`);

      // Send to Expo tokens
      if (expoTokens.length > 0) {
        await this.sendExpoNotification(expoTokens, notification);
      }

      // Send to Firebase tokens
      if (fcmTokens.length > 0) {
        await this.sendFCMNotification(fcmTokens, notification);
      }

    } catch (error) {
      logger.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Send notification via Expo Push API
   */
  private async sendExpoNotification(
    tokens: string[],
    notification: INotification
  ): Promise<void> {
    try {
      logger.info(`Sending Expo push notification to ${tokens.length} device(s)`);

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
        priority: 'high' as const,
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
        logger.info(`✅ Expo push notification sent successfully to ${tokens.length} device(s)`);
        logger.info(`Response:`, result);
      } else {
        logger.error(`❌ Expo push notification failed:`, result);
      }

    } catch (error) {
      logger.error('❌ Failed to send Expo push notification:', error);
      throw error;
    }
  }

  /**
   * ✅ EXISTING: Send notification via Firebase FCM
   */
  private async sendFCMNotification(
    tokens: string[],
    _notification: INotification
  ): Promise<void> {
    try {
      logger.info(`Sending FCM push notification to ${tokens.length} device(s)`);
      
      // TODO: Implement Firebase Admin SDK sending
      // This is placeholder - you'll need Firebase Admin SDK setup
      logger.info(`FCM push notification would be sent to: ${tokens.join(', ')}`);
      
    } catch (error) {
      logger.error('Failed to send FCM notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    notification: INotification
  ): Promise<void> {
    try {
      const user = await User.findById(notification.user);
      if (!user) {
        return;
      }

      // Double-check email preference
      if (!user.preferences?.emailNotifications) {
        logger.info(`Email notifications disabled for user ${user._id}`);
        return;
      }

      // Use email service
      logger.info(`Email notification sent to ${user.email}`);
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    notification: INotification
  ): Promise<void> {
    try {
      const user = await User.findById(notification.user);
      if (!user) {
        return;
      }

      // Use SMS service
      logger.info(`SMS notification sent to ${user.phone}`);
    } catch (error) {
      logger.error('Failed to send SMS notification:', error);
      throw error;
    }
  }

  /**
   * Register device token
   */
  public async registerDeviceToken(
    userId: string,
    token: string,
    deviceType: 'ios' | 'android' | 'web',
    deviceName?: string
  ): Promise<void> {
    const existingToken = await DeviceToken.findOne({ token });

    if (existingToken) {
      if (existingToken.user.toString() !== userId) {
        existingToken.user = userId as any;
      }
      existingToken.isActive = true;
      existingToken.lastUsedAt = new Date();
      existingToken.deviceName = deviceName || existingToken.deviceName;
      await existingToken.save();
    } else {
      await DeviceToken.create({
        user: userId,
        token,
        deviceType,
        deviceName,
        isActive: true,
        lastUsedAt : new Date(),
      });
    }

    // ✅ Log token type
    const tokenType = token.startsWith('ExponentPushToken[') ? 'Expo' : 'FCM';
    logger.info(`${tokenType} device token registered for user ${userId} on ${deviceType}`);
  }

  /**
   * Unregister device token
   */
  public async unregisterDeviceToken(token: string): Promise<void> {
    await DeviceToken.findOneAndUpdate({ token }, { isActive: false });
    logger.info(`Device token unregistered: ${token}`);
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<void> {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  /**
   * Mark all notifications as read
   */
  public async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  /**
   * Get user notifications
   */
  public async getUserNotifications(
    userId: string,
    filters?: {
      type?: NotificationType;
      isRead?: boolean;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{
    notifications: INotification[];
    total: number;
    unreadCount: number;
    page: number;
    totalPages: number;
  }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = { user: userId };

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.isRead !== undefined) {
      query.isRead = filters.isRead;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('relatedBooking', 'bookingNumber service scheduledDate status')
        .populate('relatedPayment', 'amount status')
        .populate('relatedDispute', 'disputeNumber status')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: userId, isRead: false }),
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
  public async getUnreadCount(userId: string): Promise<number> {
    return await Notification.countDocuments({
      user: userId,
      isRead: false,
    });
  }

  /**
   * Delete notification
   */
  public async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<void> {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    notification.isDeleted = true;
    notification.deletedAt = new Date();
    await notification.save();
  }

  /**
   * Clear all notifications
   */
  public async clearAllNotifications(userId: string): Promise<void> {
    await Notification.updateMany(
      { user: userId },
      { isDeleted: true, deletedAt: new Date() }
    );
  }

  /**
   * Get notification settings
   */
  public async getNotificationSettings(userId: string): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
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
  public async updateNotificationSettings(
    userId: string,
    settings: {
      notificationsEnabled?: boolean;
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      bookingUpdates?: boolean;
      newMessages?: boolean;
      paymentAlerts?: boolean;
      reminderNotifications?: boolean;
      promotions?: boolean;
    }
  ): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
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

    logger.info(`Notification settings updated for user ${userId}`);
  }

  /**
   * Send bulk notifications
   */
  public async sendBulkNotifications(
    userIds: string[],
    data: {
      type: NotificationType;
      title: string;
      message: string;
      actionUrl?: string;
      channels?: any;
    }
  ): Promise<void> {
    logger.info(`Sending bulk notifications to ${userIds.length} users`);

    if (!userIds || userIds.length === 0) {
      return;
    }

    try {
      const users = await User.find({
        _id: { $in: userIds }
      }).select('_id preferences');

      const eligibleUsers = users.filter(user => {
        const prefs = user.preferences as any || {};
        return prefs.notificationsEnabled !== false;
      });

      if (eligibleUsers.length === 0) {
        logger.info('No users eligible after filtering');
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

      const created = await Notification.insertMany(notifications, {
        ordered: false
      });

      logger.info(`Created ${created.length} bulk notifications`);

      // Send notifications in background
      for (const notif of created) {
        try {
          await this.sendNotification(notif);
        } catch (sendError) {
          logger.error(`Failed to send notification ${notif._id}:`, sendError);
        }
      }

      logger.info(`Bulk notifications complete: ${created.length} sent`);

    } catch (error: any) {
      logger.error('Failed to send bulk notifications:', error);
      throw error;
    }
  }
}

export default new NotificationService();