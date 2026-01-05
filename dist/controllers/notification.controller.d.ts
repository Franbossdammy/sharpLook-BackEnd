import { Response, NextFunction } from 'express';
declare class NotificationController {
    registerDeviceToken: (req: import("express").Request, res: Response, next: NextFunction) => void;
    unregisterDeviceToken: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getUserNotifications: (req: import("express").Request, res: Response, next: NextFunction) => void;
    markAsRead: (req: import("express").Request, res: Response, next: NextFunction) => void;
    markAllAsRead: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getUnreadCount: (req: import("express").Request, res: Response, next: NextFunction) => void;
    deleteNotification: (req: import("express").Request, res: Response, next: NextFunction) => void;
    clearAllNotifications: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getNotificationSettings: (req: import("express").Request, res: Response, next: NextFunction) => void;
    updateNotificationSettings: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
   * Send notification to all users (admin)
   * POST /api/v1/notifications/admin/send-to-all
   */
    sendToAllUsers: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Send notification to specific users (admin)
     * POST /api/v1/notifications/admin/send-to-users
     */
    sendToSpecificUsers: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get notification statistics (admin)
     * GET /api/v1/notifications/admin/stats
     */
    getNotificationStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get all notifications (admin)
     * GET /api/v1/notifications/admin/all
     */
    getAllNotifications: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: NotificationController;
export default _default;
//# sourceMappingURL=notification.controller.d.ts.map