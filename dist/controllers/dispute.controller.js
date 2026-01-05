"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dispute_service_1 = __importDefault(require("../services/dispute.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class DisputeController {
    constructor() {
        /**
         * Create dispute
         */
        this.createDispute = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const dispute = await dispute_service_1.default.createDispute(userId, req.body);
            return response_1.default.created(res, 'Dispute created successfully', { dispute });
        });
        /**
         * Add evidence to dispute
         */
        this.addEvidence = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { disputeId } = req.params;
            const userId = req.user.id;
            const { evidence } = req.body;
            const dispute = await dispute_service_1.default.addEvidence(disputeId, userId, evidence);
            return response_1.default.success(res, 'Evidence added successfully', { dispute });
        });
        /**
         * Add message to dispute
         */
        this.addMessage = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { disputeId } = req.params;
            const userId = req.user.id;
            const { message, attachments } = req.body;
            const dispute = await dispute_service_1.default.addMessage(disputeId, userId, message, attachments);
            return response_1.default.success(res, 'Message sent successfully', { dispute });
        });
        /**
         * Get dispute by ID
         */
        this.getDisputeById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { disputeId } = req.params;
            const userId = req.user.id;
            const dispute = await dispute_service_1.default.getDisputeById(disputeId, userId);
            return response_1.default.success(res, 'Dispute retrieved successfully', { dispute });
        });
        /**
         * Get user disputes
         */
        this.getUserDisputes = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                status: req.query.status,
                category: req.query.category,
            };
            const result = await dispute_service_1.default.getUserDisputes(userId, filters, page, limit);
            return response_1.default.paginated(res, 'Disputes retrieved successfully', result.disputes, page, limit, result.total);
        });
        // ==================== ADMIN ENDPOINTS ====================
        /**
         * Get all disputes (Admin)
         */
        this.getAllDisputes = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                status: req.query.status,
                category: req.query.category,
                priority: req.query.priority,
                assignedTo: req.query.assignedTo,
            };
            const result = await dispute_service_1.default.getAllDisputes(filters, page, limit);
            return response_1.default.paginated(res, 'Disputes retrieved successfully', result.disputes, page, limit, result.total);
        });
        /**
         * Assign dispute (Admin)
         */
        this.assignDispute = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { disputeId } = req.params;
            const adminId = req.user.id;
            const { assignToId } = req.body;
            const dispute = await dispute_service_1.default.assignDispute(disputeId, adminId, assignToId);
            return response_1.default.success(res, 'Dispute assigned successfully', { dispute });
        });
        /**
         * Update dispute priority (Admin)
         */
        this.updatePriority = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { disputeId } = req.params;
            const { priority } = req.body;
            const dispute = await dispute_service_1.default.updatePriority(disputeId, priority);
            return response_1.default.success(res, 'Priority updated successfully', { dispute });
        });
        /**
         * Resolve dispute (Admin)
         */
        this.resolveDispute = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { disputeId } = req.params;
            const adminId = req.user.id;
            const dispute = await dispute_service_1.default.resolveDispute(disputeId, adminId, req.body);
            return response_1.default.success(res, 'Dispute resolved successfully', { dispute });
        });
        /**
         * Close dispute (Admin)
         */
        this.closeDispute = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { disputeId } = req.params;
            const adminId = req.user.id;
            const dispute = await dispute_service_1.default.closeDispute(disputeId, adminId);
            return response_1.default.success(res, 'Dispute closed successfully', { dispute });
        });
        /**
         * Get dispute statistics (Admin)
         */
        this.getDisputeStats = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const stats = await dispute_service_1.default.getDisputeStats();
            return response_1.default.success(res, 'Statistics retrieved successfully', { stats });
        });
    }
}
exports.default = new DisputeController();
//# sourceMappingURL=dispute.controller.js.map