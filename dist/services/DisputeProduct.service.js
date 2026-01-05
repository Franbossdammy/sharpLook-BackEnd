"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const DisputeProduct_1 = __importStar(require("../models/DisputeProduct"));
const Order_1 = __importStar(require("../models/Order"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
const mongoose_1 = __importDefault(require("mongoose"));
class DisputeService {
    /**
     * Create a new dispute
     */
    async createDispute(userId, disputeData) {
        const order = await Order_1.default.findById(disputeData.order);
        if (!order) {
            throw new errors_1.NotFoundError('Order not found');
        }
        // Check if user is customer or seller
        const isCustomer = order.customer.toString() === userId;
        const isSeller = order.seller.toString() === userId;
        if (!isCustomer && !isSeller) {
            throw new errors_1.ForbiddenError('You can only create disputes for your own orders');
        }
        // Check if order can be disputed
        if (!order.canBeDisputed()) {
            throw new errors_1.BadRequestError('This order cannot be disputed');
        }
        // Check if dispute already exists
        if (order.hasDispute) {
            throw new errors_1.BadRequestError('A dispute already exists for this order');
        }
        // Determine priority based on reason
        let priority = 'medium';
        if ([DisputeProduct_1.DisputeReason.PRODUCT_NOT_RECEIVED, DisputeProduct_1.DisputeReason.PAYMENT_ISSUE].includes(disputeData.reason)) {
            priority = 'high';
        }
        // Create dispute
        const dispute = await DisputeProduct_1.default.create({
            order: disputeData.order,
            product: disputeData.product,
            customer: order.customer,
            seller: order.seller,
            reason: disputeData.reason,
            description: disputeData.description,
            evidence: disputeData.evidence,
            priority,
        });
        // Update order
        order.hasDispute = true;
        order.dispute = dispute._id;
        order.disputeReason = disputeData.reason;
        order.disputeOpenedAt = new Date();
        order.status = Order_1.OrderStatus.DISPUTED;
        await order.addStatusUpdate(Order_1.OrderStatus.DISPUTED, userId, 'Dispute opened');
        logger_1.default.info(`Dispute created: ${dispute._id} for order ${order._id}`);
        return dispute;
    }
    /**
     * Get dispute by ID
     */
    async getDisputeById(disputeId, userId) {
        const dispute = await DisputeProduct_1.default.findById(disputeId)
            .populate('order')
            .populate('product', 'name images')
            .populate('customer', 'firstName lastName email phone avatar')
            .populate('seller', 'firstName lastName email phone avatar vendorProfile')
            .populate('assignedTo', 'firstName lastName email')
            .populate('messages.sender', 'firstName lastName avatar');
        if (!dispute) {
            throw new errors_1.NotFoundError('Dispute not found');
        }
        // Verify user has access to this dispute
        const isCustomer = dispute.customer._id.toString() === userId;
        const isSeller = dispute.seller._id.toString() === userId;
        if (!isCustomer && !isSeller) {
            throw new errors_1.ForbiddenError('You do not have access to this dispute');
        }
        return dispute;
    }
    /**
     * Get user disputes (customer or seller)
     */
    async getUserDisputes(userId, role, status, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = role === 'customer' ? { customer: userId } : { seller: userId };
        if (status) {
            query.status = status;
        }
        const [disputes, total] = await Promise.all([
            DisputeProduct_1.default.find(query)
                .populate('order', 'orderNumber totalAmount')
                .populate('product', 'name images')
                .populate(role === 'customer' ? 'seller' : 'customer', 'firstName lastName avatar')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            DisputeProduct_1.default.countDocuments(query),
        ]);
        return {
            disputes,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get all disputes (admin)
     */
    async getAllDisputes(filters, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = {};
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.priority) {
            query.priority = filters.priority;
        }
        if (filters?.assignedTo) {
            query.assignedTo = filters.assignedTo;
        }
        if (filters?.reason) {
            query.reason = filters.reason;
        }
        const [disputes, total] = await Promise.all([
            DisputeProduct_1.default.find(query)
                .populate('order', 'orderNumber totalAmount')
                .populate('customer', 'firstName lastName email')
                .populate('seller', 'firstName lastName email vendorProfile')
                .populate('assignedTo', 'firstName lastName')
                .skip(skip)
                .limit(limit)
                .sort({ priority: -1, createdAt: 1 }),
            DisputeProduct_1.default.countDocuments(query),
        ]);
        return {
            disputes,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Add message to dispute
     */
    async addMessage(disputeId, senderId, message, attachments) {
        const dispute = await DisputeProduct_1.default.findById(disputeId);
        if (!dispute) {
            throw new errors_1.NotFoundError('Dispute not found');
        }
        // Determine sender role
        let senderRole = 'customer';
        if (dispute.seller.toString() === senderId) {
            senderRole = 'seller';
        }
        else if (dispute.customer.toString() !== senderId) {
            senderRole = 'admin';
        }
        await dispute.addMessage(senderId, senderRole, message, attachments);
        logger_1.default.info(`Message added to dispute: ${disputeId}`);
        return dispute;
    }
    /**
     * Assign dispute to admin
     */
    async assignDispute(disputeId, assignToId) {
        const dispute = await DisputeProduct_1.default.findById(disputeId);
        if (!dispute) {
            throw new errors_1.NotFoundError('Dispute not found');
        }
        dispute.assignedTo = mongoose_1.default.Types.ObjectId.createFromHexString(assignToId);
        dispute.assignedAt = new Date();
        dispute.status = DisputeProduct_1.DisputeStatus.UNDER_REVIEW;
        await dispute.save();
        logger_1.default.info(`Dispute assigned: ${disputeId} to admin ${assignToId}`);
        return dispute;
    }
    /**
     * Resolve dispute (admin only)
     */
    async resolveDispute(disputeId, adminId, resolution, resolutionNote, refundAmount) {
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const dispute = await DisputeProduct_1.default.findById(disputeId).session(session);
            if (!dispute) {
                throw new errors_1.NotFoundError('Dispute not found');
            }
            if (!dispute.canBeResolved()) {
                throw new errors_1.BadRequestError('Dispute cannot be resolved at this stage');
            }
            const order = await Order_1.default.findById(dispute.order).session(session);
            if (!order) {
                throw new errors_1.NotFoundError('Order not found');
            }
            // Update dispute
            dispute.status = DisputeProduct_1.DisputeStatus.RESOLVED;
            dispute.resolution = resolution;
            dispute.resolutionNote = resolutionNote;
            dispute.resolvedBy = mongoose_1.default.Types.ObjectId.createFromHexString(adminId);
            dispute.resolvedAt = new Date();
            // Handle resolution
            switch (resolution) {
                case DisputeProduct_1.DisputeResolution.FULL_REFUND:
                    dispute.refundAmount = order.totalAmount;
                    order.escrowStatus = 'refunded';
                    // TODO: Process refund through payment service
                    break;
                case DisputeProduct_1.DisputeResolution.PARTIAL_REFUND:
                    if (!refundAmount || refundAmount <= 0 || refundAmount > order.totalAmount) {
                        throw new errors_1.BadRequestError('Invalid refund amount');
                    }
                    dispute.refundAmount = refundAmount;
                    order.escrowStatus = 'refunded';
                    // TODO: Process partial refund through payment service
                    break;
                case DisputeProduct_1.DisputeResolution.SELLER_WINS:
                    order.escrowStatus = 'released';
                    // TODO: Release funds to seller through payment service
                    break;
                case DisputeProduct_1.DisputeResolution.CUSTOMER_WINS:
                    dispute.refundAmount = order.totalAmount;
                    order.escrowStatus = 'refunded';
                    // TODO: Process refund through payment service
                    break;
            }
            await dispute.save({ session });
            await order.save({ session });
            await session.commitTransaction();
            logger_1.default.info(`Dispute resolved: ${disputeId} - ${resolution}`);
            return dispute;
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    /**
     * Close dispute (admin only)
     */
    async closeDispute(disputeId, adminId, closureNote) {
        const dispute = await DisputeProduct_1.default.findById(disputeId);
        if (!dispute) {
            throw new errors_1.NotFoundError('Dispute not found');
        }
        if (!dispute.canBeClosed()) {
            throw new errors_1.BadRequestError('Dispute must be resolved before closing');
        }
        dispute.status = DisputeProduct_1.DisputeStatus.CLOSED;
        dispute.closedBy = mongoose_1.default.Types.ObjectId.createFromHexString(adminId);
        dispute.closedAt = new Date();
        dispute.closureNote = closureNote;
        await dispute.save();
        logger_1.default.info(`Dispute closed: ${disputeId}`);
        return dispute;
    }
    /**
     * Escalate dispute
     */
    async escalateDispute(disputeId, escalatedReason) {
        const dispute = await DisputeProduct_1.default.findById(disputeId);
        if (!dispute) {
            throw new errors_1.NotFoundError('Dispute not found');
        }
        dispute.isEscalated = true;
        dispute.escalatedAt = new Date();
        dispute.escalatedReason = escalatedReason;
        dispute.priority = 'high';
        await dispute.save();
        logger_1.default.info(`Dispute escalated: ${disputeId}`);
        return dispute;
    }
    /**
     * Get dispute statistics (admin)
     */
    async getDisputeStats() {
        const [totalDisputes, openDisputes, underReviewDisputes, resolvedDisputes, closedDisputes, highPriorityDisputes,] = await Promise.all([
            DisputeProduct_1.default.countDocuments(),
            DisputeProduct_1.default.countDocuments({ status: DisputeProduct_1.DisputeStatus.OPEN }),
            DisputeProduct_1.default.countDocuments({ status: DisputeProduct_1.DisputeStatus.UNDER_REVIEW }),
            DisputeProduct_1.default.countDocuments({ status: DisputeProduct_1.DisputeStatus.RESOLVED }),
            DisputeProduct_1.default.countDocuments({ status: DisputeProduct_1.DisputeStatus.CLOSED }),
            DisputeProduct_1.default.countDocuments({ priority: 'high', status: { $nin: [DisputeProduct_1.DisputeStatus.RESOLVED, DisputeProduct_1.DisputeStatus.CLOSED] } }),
        ]);
        return {
            totalDisputes,
            openDisputes,
            underReviewDisputes,
            resolvedDisputes,
            closedDisputes,
            highPriorityDisputes,
            activeDisputes: openDisputes + underReviewDisputes,
        };
    }
}
exports.default = new DisputeService();
//# sourceMappingURL=DisputeProduct.service.js.map