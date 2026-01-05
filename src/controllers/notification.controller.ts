import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import notificationService from '../services/notification.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';
import Notification from '../models/Notification';
import User from '../models/User';

class NotificationController {
  public registerDeviceToken = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { token, deviceType, deviceName } = req.body;
      
      await notificationService.registerDeviceToken(userId, token, deviceType, deviceName);
      
      return ResponseHandler.success(res, 'Device token registered');
    }
  );

  public unregisterDeviceToken = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { token } = req.body;
      
      await notificationService.unregisterDeviceToken(token);
      
      return ResponseHandler.success(res, 'Device token unregistered');
    }
  );

  public getUserNotifications = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        type: req.query.type as any,
        isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
      };
      
      const result = await notificationService.getUserNotifications(userId, filters, page, limit);
      
      return ResponseHandler.success(
        res,
        'Notifications retrieved',
        result.notifications,
        200,
        {
          pagination: {
            currentPage: page,
            totalPages: result.totalPages,
            pageSize: limit,
            totalItems: result.total,
            hasNextPage: page < result.totalPages,
            hasPrevPage: page > 1,
          },
          unreadCount: result.unreadCount,
        }
      );
    }
  );

  public markAsRead = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { notificationId } = req.params;
      const userId = req.user!.id;
      
      await notificationService.markAsRead(notificationId, userId);
      
      return ResponseHandler.success(res, 'Notification marked as read');
    }
  );

  public markAllAsRead = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      await notificationService.markAllAsRead(userId);
      
      return ResponseHandler.success(res, 'All notifications marked as read');
    }
  );

  public getUnreadCount = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      const count = await notificationService.getUnreadCount(userId);
      
      return ResponseHandler.success(res, 'Unread count retrieved', { count });
    }
  );

  public deleteNotification = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { notificationId } = req.params;
      const userId = req.user!.id;
      
      await notificationService.deleteNotification(notificationId, userId);
      
      return ResponseHandler.success(res, 'Notification deleted');
    }
  );

  public clearAllNotifications = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      await notificationService.clearAllNotifications(userId);
      
      return ResponseHandler.success(res, 'All notifications cleared');
    }
  );

  public getNotificationSettings = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      const settings = await notificationService.getNotificationSettings(userId);
      
      return ResponseHandler.success(res, 'Settings retrieved', { settings });
    }
  );

  public updateNotificationSettings = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      await notificationService.updateNotificationSettings(userId, req.body);
      
      return ResponseHandler.success(res, 'Settings updated');
    }
  );

  /**
 * Send notification to all users (admin)
 * POST /api/v1/notifications/admin/send-to-all
 */
public sendToAllUsers = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { type, title, message, actionUrl, channels, filters } = req.body;

    // Get all users or filtered users
    let userQuery: any = {};
    
    if (filters?.role) {
      if (filters.role === 'vendor') {
        userQuery.isVendor = true;
      } else if (filters.role === 'client') {
        userQuery.isVendor = false;
      }
    }

    if (filters?.isVerified !== undefined) {
      userQuery['vendorProfile.isVerified'] = filters.isVerified;
    }

    const users = await User.find(userQuery).select('_id');
    const userIds = users.map(u => u._id.toString());

    await notificationService.sendBulkNotifications(userIds, {
      type,
      title,
      message,
      actionUrl,
      channels,
    });

    return ResponseHandler.success(
      res,
      `Notification sent to ${userIds.length} users`,
      { userCount: userIds.length }
    );
  }
);

/**
 * Send notification to specific users (admin)
 * POST /api/v1/notifications/admin/send-to-users
 */
public sendToSpecificUsers = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { userIds, type, title, message, actionUrl, channels } = req.body;

    await notificationService.sendBulkNotifications(userIds, {
      type,
      title,
      message,
      actionUrl,
      channels,
    });

    return ResponseHandler.success(
      res,
      `Notification sent to ${userIds.length} users`,
      { userCount: userIds.length }
    );
  }
);

/**
 * Get notification statistics (admin)
 * GET /api/v1/notifications/admin/stats
 */
public getNotificationStats = asyncHandler(
  async (_req: AuthRequest, res: Response, _next: NextFunction) => {
    const [
      totalNotifications,
      totalSent,
      totalRead,
      totalUnread,
      notificationsByType,
    ] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ isSent: true }),
      Notification.countDocuments({ isRead: true }),
      Notification.countDocuments({ isRead: false }),
      Notification.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const byType = notificationsByType.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return ResponseHandler.success(res, 'Notification statistics retrieved', {
      stats: {
        total: totalNotifications,
        sent: totalSent,
        read: totalRead,
        unread: totalUnread,
        byType,
      },
    });
  }
);

/**
 * Get all notifications (admin)
 * GET /api/v1/notifications/admin/all
 */
public getAllNotifications = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filters: any = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.isRead !== undefined) filters.isRead = req.query.isRead === 'true';
    if (req.query.isSent !== undefined) filters.isSent = req.query.isSent === 'true';

    const [notifications, total] = await Promise.all([
      Notification.find(filters)
        .populate('user', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Notification.countDocuments(filters),
    ]);

    return ResponseHandler.paginated(
      res,
      'Notifications retrieved',
      notifications,
      page,
      limit,
      total
    );
  }
);
}

export default new NotificationController();
