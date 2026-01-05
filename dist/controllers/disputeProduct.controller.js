"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const DisputeProduct_service_1 = __importDefault(require("../services/DisputeProduct.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
const DisputeProduct_1 = require("../models/DisputeProduct");
const cloudinary_1 = require("../utils/cloudinary");
const errors_1 = require("../utils/errors");
class DisputeController {
    constructor() {
        /**
         * Create a new dispute
         * POST /api/v1/disputes
         */
        this.createDispute = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            // Handle evidence uploads
            const files = req.files;
            const evidenceUrls = [];
            if (files && files.length > 0) {
                for (const file of files) {
                    const evidenceUrl = await (0, cloudinary_1.uploadToCloudinary)(file.buffer, {
                        folder: 'sharplook/disputes',
                        transformation: [
                            { quality: 'auto' },
                            { fetch_format: 'auto' }
                        ]
                    });
                    evidenceUrls.push(evidenceUrl);
                }
            }
            const disputeData = {
                ...req.body,
                evidence: evidenceUrls,
            };
            const dispute = await DisputeProduct_service_1.default.createDispute(userId, disputeData);
            return response_1.default.success(res, 'Dispute created successfully. An admin will review your case.', {
                dispute,
            }, 201);
        });
        /**
         * Get dispute by ID
         * GET /api/v1/disputes/:disputeId
         */
        this.getDisputeById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { disputeId } = req.params;
            const userId = req.user.id;
            const dispute = await DisputeProduct_service_1.default.getDisputeById(disputeId, userId);
            return response_1.default.success(res, 'Dispute retrieved successfully', {
                dispute,
            });
        });
        /**
         * Get user's disputes (customer or seller)
         * GET /api/v1/disputes/my-disputes
         */
        this.getUserDisputes = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const role = req.query.role || 'customer';
            const status = req.query.status;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await DisputeProduct_service_1.default.getUserDisputes(userId, role, status, page, limit);
            return response_1.default.paginated(res, 'Your disputes retrieved successfully', result.disputes, page, limit, result.total);
        });
        /**
         * Get all disputes (admin)
         * GET /api/v1/disputes
         */
        this.getAllDisputes = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                status: req.query.status,
                priority: req.query.priority,
                assignedTo: req.query.assignedTo,
                reason: req.query.reason,
            };
            // Remove undefined filters
            Object.keys(filters).forEach(key => {
                if (filters[key] === undefined) {
                    delete filters[key];
                }
            });
            const result = await DisputeProduct_service_1.default.getAllDisputes(filters, page, limit);
            return response_1.default.paginated(res, 'Disputes retrieved successfully', result.disputes, page, limit, result.total);
        });
        /**
         * Add message to dispute
         * POST /api/v1/disputes/:disputeId/messages
         */
        this.addMessage = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { disputeId } = req.params;
            const senderId = req.user.id;
            const { message } = req.body;
            // Handle attachment uploads
            const files = req.files;
            const attachmentUrls = [];
            if (files && files.length > 0) {
                for (const file of files) {
                    const attachmentUrl = await (0, cloudinary_1.uploadToCloudinary)(file.buffer, {
                        folder: 'sharplook/disputes/messages',
                        transformation: [
                            { quality: 'auto' },
                            { fetch_format: 'auto' }
                        ]
                    });
                    attachmentUrls.push(attachmentUrl);
                }
            }
            const dispute = await DisputeProduct_service_1.default.addMessage(disputeId, senderId, message, attachmentUrls.length > 0 ? attachmentUrls : undefined);
            return response_1.default.success(res, 'Message added successfully', {
                dispute,
            });
        });
        /**
         * Assign dispute to admin
         * POST /api/v1/disputes/:disputeId/assign
         */
        this.assignDispute = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { disputeId } = req.params;
            const { adminId } = req.body;
            // Use provided adminId or current admin
            const assignToAdminId = adminId || req.user.id;
            const dispute = await DisputeProduct_service_1.default.assignDispute(disputeId, assignToAdminId);
            return response_1.default.success(res, 'Dispute assigned successfully', {
                dispute,
            });
        });
        /**
         * Resolve dispute (admin)
         * POST /api/v1/disputes/:disputeId/resolve
         */
        this.resolveDispute = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { disputeId } = req.params;
            const adminId = req.user.id;
            const { resolution, resolutionNote, refundAmount } = req.body;
            // Validate refundAmount for partial refund
            if (resolution === DisputeProduct_1.DisputeResolution.PARTIAL_REFUND && !refundAmount) {
                throw new errors_1.BadRequestError('Refund amount is required for partial refund');
            }
            const dispute = await DisputeProduct_service_1.default.resolveDispute(disputeId, adminId, resolution, resolutionNote, refundAmount);
            return response_1.default.success(res, 'Dispute resolved successfully', {
                dispute,
            });
        });
        /**
         * Close dispute (admin)
         * POST /api/v1/disputes/:disputeId/close
         */
        this.closeDispute = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { disputeId } = req.params;
            const adminId = req.user.id;
            const { closureNote } = req.body;
            const dispute = await DisputeProduct_service_1.default.closeDispute(disputeId, adminId, closureNote);
            return response_1.default.success(res, 'Dispute closed successfully', {
                dispute,
            });
        });
        /**
         * Escalate dispute
         * POST /api/v1/disputes/:disputeId/escalate
         */
        this.escalateDispute = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { disputeId } = req.params;
            const { reason } = req.body;
            const dispute = await DisputeProduct_service_1.default.escalateDispute(disputeId, reason);
            return response_1.default.success(res, 'Dispute escalated successfully', {
                dispute,
            });
        });
        /**
         * Get dispute statistics (admin)
         * GET /api/v1/disputes/stats
         */
        this.getDisputeStats = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const stats = await DisputeProduct_service_1.default.getDisputeStats();
            return response_1.default.success(res, 'Dispute statistics retrieved successfully', {
                stats,
            });
        });
        /**
         * Get open disputes (admin dashboard)
         * GET /api/v1/disputes/open
         */
        this.getOpenDisputes = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await DisputeProduct_service_1.default.getAllDisputes({ status: DisputeProduct_1.DisputeStatus.OPEN }, page, limit);
            return response_1.default.paginated(res, 'Open disputes retrieved successfully', result.disputes, page, limit, result.total);
        });
        /**
         * Get high priority disputes (admin dashboard)
         * GET /api/v1/disputes/high-priority
         */
        this.getHighPriorityDisputes = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await DisputeProduct_service_1.default.getAllDisputes({ priority: 'high' }, page, limit);
            return response_1.default.paginated(res, 'High priority disputes retrieved successfully', result.disputes, page, limit, result.total);
        });
        /**
         * Get my assigned disputes (admin)
         * GET /api/v1/disputes/assigned-to-me
         */
        this.getMyAssignedDisputes = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const adminId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await DisputeProduct_service_1.default.getAllDisputes({ assignedTo: adminId }, page, limit);
            return response_1.default.paginated(res, 'Your assigned disputes retrieved successfully', result.disputes, page, limit, result.total);
        });
    }
}
exports.default = new DisputeController();
//# sourceMappingURL=disputeProduct.controller.js.map