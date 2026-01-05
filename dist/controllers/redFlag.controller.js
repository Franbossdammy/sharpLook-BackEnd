"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redFlag_service_1 = __importDefault(require("../services/redFlag.service"));
const RedFlag_1 = require("../models/RedFlag");
const logger_1 = __importDefault(require("../utils/logger"));
class RedFlagController {
    /**
     * Get all red flags with filters
     * @route GET /api/admin/red-flags
     */
    async getRedFlags(req, res, next) {
        try {
            const { type, severity, status, userId, startDate, endDate, page = 1, limit = 20, } = req.query;
            const result = await redFlag_service_1.default.getRedFlags({
                type: type,
                severity: severity,
                status: status,
                flaggedUserId: userId,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
            }, Number(page), Number(limit));
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get red flag statistics
     * @route GET /api/admin/red-flags/stats
     */
    async getStats(_req, res, next) {
        try {
            const stats = await redFlag_service_1.default.getRedFlagStats();
            res.json({
                success: true,
                data: stats,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get users with most red flags
     * @route GET /api/admin/red-flags/top-users
     */
    async getTopFlaggedUsers(req, res, next) {
        try {
            const { limit = 10 } = req.query;
            const users = await redFlag_service_1.default.getMostFlaggedUsers(Number(limit));
            res.json({
                success: true,
                data: users,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get single red flag by ID
     * @route GET /api/admin/red-flags/:id
     */
    async getRedFlagById(req, res, next) {
        try {
            const { id } = req.params;
            const flag = await redFlag_service_1.default.getRedFlagById(id);
            res.json({
                success: true,
                data: flag,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Update red flag status
     * @route PATCH /api/admin/red-flags/:id/status
     */
    async updateStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status, note } = req.body;
            const adminId = req.user._id;
            if (!status) {
                res.status(400).json({
                    success: false,
                    error: 'Status is required',
                });
                return;
            }
            // Validate status
            const validStatuses = ['open', 'under_review', 'resolved', 'dismissed', 'escalated', 'action_taken'];
            if (!validStatuses.includes(status)) {
                res.status(400).json({
                    success: false,
                    error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
                });
                return;
            }
            const flag = await redFlag_service_1.default.updateRedFlagStatus(id, adminId, status, note);
            logger_1.default.info(`Red flag ${id} status updated to ${status} by admin ${adminId}`);
            res.json({
                success: true,
                data: flag,
                message: 'Red flag status updated successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Resolve red flag with action
     * @route POST /api/admin/red-flags/:id/resolve
     */
    async resolveRedFlag(req, res, next) {
        try {
            const { id } = req.params;
            const { action, actionDetails, notes } = req.body;
            const adminId = req.user._id;
            if (!action) {
                res.status(400).json({
                    success: false,
                    error: 'Action is required',
                });
                return;
            }
            // Validate action
            const validActions = ['warning_issued', 'temporary_suspension', 'permanent_ban', 'fine_applied', 'no_action', 'escalated'];
            if (!validActions.includes(action)) {
                res.status(400).json({
                    success: false,
                    error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
                });
                return;
            }
            const flag = await redFlag_service_1.default.resolveRedFlag(id, adminId, {
                action,
                actionDetails,
                notes,
            });
            logger_1.default.info(`Red flag ${id} resolved with action: ${action} by admin ${adminId}`);
            res.json({
                success: true,
                data: flag,
                message: `Red flag resolved with action: ${action}`,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Assign red flag to admin
     * @route PATCH /api/admin/red-flags/:id/assign
     */
    async assignRedFlag(req, res, next) {
        try {
            const { id } = req.params;
            const { adminId } = req.body;
            if (!adminId) {
                res.status(400).json({
                    success: false,
                    error: 'Admin ID is required',
                });
                return;
            }
            const flag = await redFlag_service_1.default.assignRedFlag(id, adminId);
            logger_1.default.info(`Red flag ${id} assigned to admin ${adminId}`);
            res.json({
                success: true,
                data: flag,
                message: 'Red flag assigned successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Add note to red flag
     * @route POST /api/admin/red-flags/:id/notes
     */
    async addNote(req, res, next) {
        try {
            const { id } = req.params;
            const { note } = req.body;
            const adminId = req.user._id;
            if (!note || note.trim() === '') {
                res.status(400).json({
                    success: false,
                    error: 'Note is required',
                });
                return;
            }
            const flag = await redFlag_service_1.default.addAdminNote(id, adminId, note.trim());
            logger_1.default.info(`Note added to red flag ${id} by admin ${adminId}`);
            res.json({
                success: true,
                data: flag,
                message: 'Note added successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Manually create a red flag
     * @route POST /api/admin/red-flags/manual
     */
    async createManualRedFlag(req, res, next) {
        try {
            const { type, severity, flaggedUserId, flaggedUserRole, relatedUserId, relatedUserRole, title, description, bookingId, paymentId, serviceId, } = req.body;
            const adminId = req.user._id;
            // Validate required fields
            if (!type || !severity || !flaggedUserId || !flaggedUserRole || !title || !description) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: type, severity, flaggedUserId, flaggedUserRole, title, description',
                });
                return;
            }
            // Validate type
            const validTypes = Object.values(RedFlag_1.RedFlagType);
            if (!validTypes.includes(type)) {
                res.status(400).json({
                    success: false,
                    error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
                });
                return;
            }
            // Validate severity
            const validSeverities = Object.values(RedFlag_1.RedFlagSeverity);
            if (!validSeverities.includes(severity)) {
                res.status(400).json({
                    success: false,
                    error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`,
                });
                return;
            }
            // Validate flaggedUserRole
            if (!['client', 'vendor'].includes(flaggedUserRole)) {
                res.status(400).json({
                    success: false,
                    error: 'flaggedUserRole must be either "client" or "vendor"',
                });
                return;
            }
            const flag = await redFlag_service_1.default.createRedFlag({
                type,
                severity,
                flaggedUserId,
                flaggedUserRole,
                relatedUserId,
                relatedUserRole,
                triggerSource: 'admin_manual',
                reportedBy: adminId,
                bookingId,
                paymentId,
                serviceId,
                title,
                description,
            });
            logger_1.default.info(`Manual red flag created by admin ${adminId}: ${flag._id}`);
            res.status(201).json({
                success: true,
                data: flag,
                message: 'Red flag created successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get red flags for a specific user
     * @route GET /api/admin/red-flags/user/:userId
     */
    async getRedFlagsByUser(req, res, next) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 20 } = req.query;
            const result = await redFlag_service_1.default.getRedFlags({ flaggedUserId: userId }, Number(page), Number(limit));
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Bulk update red flag statuses
     * @route PATCH /api/admin/red-flags/bulk/status
     */
    async bulkUpdateStatus(req, res, next) {
        try {
            const { flagIds, status, note } = req.body;
            const adminId = req.user._id;
            if (!flagIds || !Array.isArray(flagIds) || flagIds.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'flagIds array is required',
                });
                return;
            }
            if (!status) {
                res.status(400).json({
                    success: false,
                    error: 'Status is required',
                });
                return;
            }
            const results = await Promise.allSettled(flagIds.map((id) => redFlag_service_1.default.updateRedFlagStatus(id, adminId, status, note)));
            const successful = results.filter((r) => r.status === 'fulfilled').length;
            const failed = results.filter((r) => r.status === 'rejected').length;
            logger_1.default.info(`Bulk status update: ${successful} succeeded, ${failed} failed by admin ${adminId}`);
            res.json({
                success: true,
                data: {
                    total: flagIds.length,
                    successful,
                    failed,
                },
                message: `Updated ${successful} of ${flagIds.length} red flags`,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get red flag types summary
     * @route GET /api/admin/red-flags/types/summary
     */
    async getTypesSummary(_req, res, next) {
        try {
            const stats = await redFlag_service_1.default.getRedFlagStats();
            // Format types with descriptions
            const typeDescriptions = {
                vendor_late_cancellation: 'Vendor cancelled booking close to appointment time',
                client_frequent_cancellation: 'Client has cancelled multiple bookings',
                suspected_off_platform_meeting: 'Suspected off-platform transaction',
                location_proximity_no_booking: 'Vendor and client detected near each other without booking',
                chat_contains_contact_info: 'Contact information shared in chat',
                chat_suggests_outside_payment: 'Outside payment suggested in chat',
                frequent_refund_requests: 'Excessive refund requests',
                suspicious_payment_pattern: 'Unusual payment activity',
                fake_reviews_detected: 'Suspected fake reviews',
                no_show_vendor: 'Vendor did not show up',
                no_show_client: 'Client did not show up',
                harassment_reported: 'Harassment reported',
                safety_concern: 'Safety concern raised',
            };
            const typesWithInfo = Object.entries(stats.byType).map(([type, count]) => ({
                type,
                count,
                description: typeDescriptions[type] || 'Unknown type',
            }));
            res.json({
                success: true,
                data: typesWithInfo,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.default = new RedFlagController();
//# sourceMappingURL=redFlag.controller.js.map