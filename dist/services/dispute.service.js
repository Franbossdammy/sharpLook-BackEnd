"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Dispute_1 = __importDefault(require("../models/Dispute"));
const Booking_1 = __importDefault(require("../models/Booking"));
const Payment_1 = __importDefault(require("../models/Payment"));
const User_1 = __importDefault(require("../models/User"));
const payment_service_1 = __importDefault(require("./payment.service"));
const errors_1 = require("../utils/errors");
const types_1 = require("../types");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
const notificationHelper_1 = __importDefault(require("../utils/notificationHelper"));
class DisputeService {
    /**
     * Create dispute
     */
    async createDispute(userId, data) {
        // ✅ FIX: Populate booking with client and vendor details
        const booking = await Booking_1.default.findById(data.bookingId)
            .populate('client', 'firstName lastName')
            .populate('vendor', 'firstName lastName');
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // ✅ FIX: Type guard to check if populated
        const client = booking.client;
        const vendor = booking.vendor;
        // Verify user is part of booking
        const isClient = client._id.toString() === userId;
        const isVendor = vendor._id.toString() === userId;
        if (!isClient && !isVendor) {
            throw new errors_1.ForbiddenError('You can only create disputes for your own bookings');
        }
        // Check if booking can have dispute
        if (![types_1.BookingStatus.ACCEPTED, types_1.BookingStatus.IN_PROGRESS, types_1.BookingStatus.COMPLETED].includes(booking.status)) {
            throw new errors_1.BadRequestError('Disputes can only be created for accepted, in-progress, or completed bookings');
        }
        // Check if dispute already exists
        const existingDispute = await Dispute_1.default.findOne({
            booking: data.bookingId,
            status: { $in: [types_1.DisputeStatus.OPEN, types_1.DisputeStatus.IN_REVIEW] },
        });
        if (existingDispute) {
            throw new errors_1.BadRequestError('An active dispute already exists for this booking');
        }
        // Determine against whom
        const against = isClient ? vendor._id : client._id;
        // Format evidence
        const evidence = data.evidence?.map((e) => ({
            type: e.type,
            content: e.content,
            uploadedAt: new Date(),
            uploadedBy: userId,
        })) || [];
        // Create dispute
        const dispute = await Dispute_1.default.create({
            booking: data.bookingId,
            raisedBy: userId,
            against,
            reason: data.reason,
            description: data.description,
            category: data.category,
            evidence,
            status: types_1.DisputeStatus.OPEN,
            priority: 'medium',
            messages: [],
        });
        // Update booking
        booking.hasDispute = true;
        booking.disputeId = dispute._id;
        await booking.save();
        // Populate dispute for notification
        await dispute.populate([
            { path: 'raisedBy', select: 'firstName lastName' },
            { path: 'booking' }
        ]);
        // ✅ Notify the other party about the dispute
        try {
            // ✅ FIX: Safely extract names
            const initiatorName = isClient
                ? `${client.firstName} ${client.lastName}`
                : `${vendor.firstName} ${vendor.lastName}`;
            await notificationHelper_1.default.notifyDisputeCreated(dispute, against.toString(), initiatorName);
        }
        catch (notifyError) {
            logger_1.default.error('Failed to notify about dispute creation:', notifyError);
        }
        logger_1.default.info(`Dispute created: ${dispute._id} for booking ${data.bookingId}`);
        return dispute;
    }
    /**
     * Add evidence to dispute
     */
    async addEvidence(disputeId, userId, evidence) {
        const dispute = await Dispute_1.default.findById(disputeId);
        if (!dispute) {
            throw new errors_1.NotFoundError('Dispute not found');
        }
        // Check if user is part of dispute
        const isRaiser = dispute.raisedBy.toString() === userId;
        const isAgainst = dispute.against.toString() === userId;
        if (!isRaiser && !isAgainst) {
            throw new errors_1.ForbiddenError('You are not part of this dispute');
        }
        // Check status
        if (dispute.status === types_1.DisputeStatus.RESOLVED || dispute.status === types_1.DisputeStatus.CLOSED) {
            throw new errors_1.BadRequestError('Cannot add evidence to resolved/closed disputes');
        }
        // Add evidence
        const newEvidence = evidence.map((e) => ({
            type: e.type,
            content: e.content,
            uploadedAt: new Date(),
            uploadedBy: userId,
        }));
        dispute.evidence.push(...newEvidence);
        await dispute.save();
        // ✅ Notify the other party about new evidence
        try {
            const otherPartyId = isRaiser
                ? dispute.against.toString()
                : dispute.raisedBy.toString();
            await notificationHelper_1.default.notifyDisputeUpdated(dispute, otherPartyId);
        }
        catch (notifyError) {
            logger_1.default.error('Failed to notify about new evidence:', notifyError);
        }
        logger_1.default.info(`Evidence added to dispute: ${disputeId}`);
        return dispute;
    }
    /**
     * Add message to dispute
     */
    async addMessage(disputeId, userId, message, attachments) {
        const dispute = await Dispute_1.default.findById(disputeId);
        if (!dispute) {
            throw new errors_1.NotFoundError('Dispute not found');
        }
        // Check if user is part of dispute or admin
        const user = await User_1.default.findById(userId);
        const isRaiser = dispute.raisedBy.toString() === userId;
        const isAgainst = dispute.against.toString() === userId;
        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
        if (!isRaiser && !isAgainst && !isAdmin) {
            throw new errors_1.ForbiddenError('You are not authorized to send messages in this dispute');
        }
        // Add message
        dispute.messages.push({
            sender: userId,
            message,
            attachments,
            sentAt: new Date(),
        });
        await dispute.save();
        // ✅ Notify relevant parties about new message
        try {
            // Notify the other party (not the sender)
            if (isRaiser) {
                await notificationHelper_1.default.notifyDisputeUpdated(dispute, dispute.against.toString());
            }
            else if (isAgainst) {
                await notificationHelper_1.default.notifyDisputeUpdated(dispute, dispute.raisedBy.toString());
            }
            else if (isAdmin) {
                // Admin sent message - notify both parties
                await notificationHelper_1.default.notifyDisputeUpdated(dispute, dispute.raisedBy.toString());
                await notificationHelper_1.default.notifyDisputeUpdated(dispute, dispute.against.toString());
            }
        }
        catch (notifyError) {
            logger_1.default.error('Failed to notify about new dispute message:', notifyError);
        }
        return dispute;
    }
    /**
     * Assign dispute to admin (Admin)
     */
    async assignDispute(disputeId, _adminId, assignToId) {
        const dispute = await Dispute_1.default.findById(disputeId);
        if (!dispute) {
            throw new errors_1.NotFoundError('Dispute not found');
        }
        // Update dispute
        dispute.assignedTo = assignToId;
        if (dispute.status === types_1.DisputeStatus.OPEN) {
            dispute.status = types_1.DisputeStatus.IN_REVIEW;
            dispute.reviewedAt = new Date();
        }
        await dispute.save();
        // ✅ Notify both parties that dispute is under review
        try {
            await notificationHelper_1.default.notifyDisputeUpdated(dispute, dispute.raisedBy.toString());
            await notificationHelper_1.default.notifyDisputeUpdated(dispute, dispute.against.toString());
        }
        catch (notifyError) {
            logger_1.default.error('Failed to notify about dispute assignment:', notifyError);
        }
        logger_1.default.info(`Dispute ${disputeId} assigned to ${assignToId}`);
        return dispute;
    }
    /**
     * Update dispute priority (Admin)
     */
    async updatePriority(disputeId, priority) {
        const dispute = await Dispute_1.default.findById(disputeId);
        if (!dispute) {
            throw new errors_1.NotFoundError('Dispute not found');
        }
        dispute.priority = priority;
        await dispute.save();
        return dispute;
    }
    /**
     * Resolve dispute (Admin)
     */
    async resolveDispute(disputeId, adminId, data) {
        const dispute = await Dispute_1.default.findById(disputeId).populate('booking');
        if (!dispute) {
            throw new errors_1.NotFoundError('Dispute not found');
        }
        // Check status
        if (dispute.status === types_1.DisputeStatus.RESOLVED || dispute.status === types_1.DisputeStatus.CLOSED) {
            throw new errors_1.BadRequestError('Dispute already resolved/closed');
        }
        const booking = await Booking_1.default.findById(dispute.booking);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Handle resolution based on type
        if (data.resolution === types_1.DisputeResolution.REFUND_CLIENT) {
            // Full refund to client
            await payment_service_1.default.refundPayment(booking._id.toString(), adminId, 'Dispute resolved in favor of client');
        }
        else if (data.resolution === types_1.DisputeResolution.PAY_VENDOR) {
            // Release payment to vendor
            await payment_service_1.default.releasePayment(booking._id.toString());
        }
        else if (data.resolution === types_1.DisputeResolution.PARTIAL_REFUND) {
            // Partial refund - custom handling needed
            if (!data.refundAmount || !data.vendorPaymentAmount) {
                throw new errors_1.BadRequestError('Refund and vendor payment amounts required for partial refund');
            }
            // Get payment
            const payment = await Payment_1.default.findOne({ booking: booking._id });
            if (payment) {
                // Refund client
                const client = await User_1.default.findById(booking.client);
                if (client && data.refundAmount > 0) {
                    client.walletBalance = (client.walletBalance || 0) + data.refundAmount;
                    await client.save();
                }
                // Pay vendor
                const vendor = await User_1.default.findById(booking.vendor);
                if (vendor && data.vendorPaymentAmount > 0) {
                    vendor.walletBalance = (vendor.walletBalance || 0) + data.vendorPaymentAmount;
                    await vendor.save();
                }
                payment.status = 'released';
                await payment.save();
            }
        }
        // Update dispute
        dispute.status = types_1.DisputeStatus.RESOLVED;
        dispute.resolution = data.resolution;
        dispute.resolutionDetails = data.resolutionDetails;
        dispute.resolvedAt = new Date();
        dispute.resolvedBy = adminId;
        dispute.refundAmount = data.refundAmount;
        dispute.vendorPaymentAmount = data.vendorPaymentAmount;
        await dispute.save();
        // ✅ Notify both parties about resolution
        try {
            await notificationHelper_1.default.notifyDisputeResolved(dispute, dispute.raisedBy.toString());
            await notificationHelper_1.default.notifyDisputeResolved(dispute, dispute.against.toString());
        }
        catch (notifyError) {
            logger_1.default.error('Failed to notify about dispute resolution:', notifyError);
        }
        logger_1.default.info(`Dispute resolved: ${disputeId} - ${data.resolution}`);
        return dispute;
    }
    /**
     * Close dispute (Admin)
     */
    async closeDispute(disputeId, adminId) {
        const dispute = await Dispute_1.default.findById(disputeId);
        if (!dispute) {
            throw new errors_1.NotFoundError('Dispute not found');
        }
        if (dispute.status !== types_1.DisputeStatus.RESOLVED) {
            throw new errors_1.BadRequestError('Only resolved disputes can be closed');
        }
        dispute.status = types_1.DisputeStatus.CLOSED;
        dispute.closedAt = new Date();
        dispute.closedBy = adminId;
        await dispute.save();
        logger_1.default.info(`Dispute closed: ${disputeId}`);
        return dispute;
    }
    /**
     * Get dispute by ID
     */
    async getDisputeById(disputeId, userId) {
        const dispute = await Dispute_1.default.findById(disputeId)
            .populate('raisedBy', 'firstName lastName email avatar')
            .populate('against', 'firstName lastName email avatar')
            .populate('booking')
            .populate('assignedTo', 'firstName lastName email')
            .populate('messages.sender', 'firstName lastName avatar');
        if (!dispute) {
            throw new errors_1.NotFoundError('Dispute not found');
        }
        // Check authorization
        const user = await User_1.default.findById(userId);
        const isRaiser = dispute.raisedBy._id.toString() === userId;
        const isAgainst = dispute.against._id.toString() === userId;
        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
        if (!isRaiser && !isAgainst && !isAdmin) {
            throw new errors_1.ForbiddenError('Not authorized to view this dispute');
        }
        return dispute;
    }
    /**
     * Get user disputes
     */
    async getUserDisputes(userId, filters, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = {
            $or: [{ raisedBy: userId }, { against: userId }],
        };
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.category) {
            query.category = filters.category;
        }
        const [disputes, total] = await Promise.all([
            Dispute_1.default.find(query)
                .populate('raisedBy', 'firstName lastName avatar')
                .populate('against', 'firstName lastName avatar')
                .populate('booking', 'service scheduledDate status')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Dispute_1.default.countDocuments(query),
        ]);
        return {
            disputes,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get all disputes (Admin)
     */
    async getAllDisputes(filters, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = {};
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.category) {
            query.category = filters.category;
        }
        if (filters?.priority) {
            query.priority = filters.priority;
        }
        if (filters?.assignedTo) {
            query.assignedTo = filters.assignedTo;
        }
        const [disputes, total] = await Promise.all([
            Dispute_1.default.find(query)
                .populate('raisedBy', 'firstName lastName email avatar')
                .populate('against', 'firstName lastName email avatar')
                .populate('booking', 'service scheduledDate totalAmount')
                .populate('assignedTo', 'firstName lastName')
                .skip(skip)
                .limit(limit)
                .sort({ priority: -1, createdAt: -1 }),
            Dispute_1.default.countDocuments(query),
        ]);
        return {
            disputes,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get dispute statistics
     */
    async getDisputeStats() {
        const [total, open, inReview, resolved, closed, byCategory, byPriority,] = await Promise.all([
            Dispute_1.default.countDocuments(),
            Dispute_1.default.countDocuments({ status: types_1.DisputeStatus.OPEN }),
            Dispute_1.default.countDocuments({ status: types_1.DisputeStatus.IN_REVIEW }),
            Dispute_1.default.countDocuments({ status: types_1.DisputeStatus.RESOLVED }),
            Dispute_1.default.countDocuments({ status: types_1.DisputeStatus.CLOSED }),
            Dispute_1.default.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } },
            ]),
            Dispute_1.default.aggregate([
                { $group: { _id: '$priority', count: { $sum: 1 } } },
            ]),
        ]);
        return {
            total,
            open,
            inReview,
            resolved,
            closed,
            byCategory,
            byPriority,
        };
    }
}
exports.default = new DisputeService();
//# sourceMappingURL=dispute.service.js.map