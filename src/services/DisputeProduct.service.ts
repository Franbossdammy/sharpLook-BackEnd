import Dispute, { IDispute, DisputeStatus, DisputeReason, DisputeResolution } from '../models/DisputeProduct';
import Order, { OrderStatus } from '../models/Order';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';
import mongoose from 'mongoose';

class DisputeService {
  /**
   * Create a new dispute
   */
  public async createDispute(
    userId: string,
    disputeData: {
      order: string;
      product?: string;
      reason: DisputeReason;
      description: string;
      evidence?: string[];
    }
  ): Promise<IDispute> {
    const order = await Order.findById(disputeData.order);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if user is customer or seller
    const isCustomer = order.customer.toString() === userId;
    const isSeller = order.seller.toString() === userId;

    if (!isCustomer && !isSeller) {
      throw new ForbiddenError('You can only create disputes for your own orders');
    }

    // Check if order can be disputed
    if (!order.canBeDisputed()) {
      throw new BadRequestError('This order cannot be disputed');
    }

    // Check if dispute already exists
    if (order.hasDispute) {
      throw new BadRequestError('A dispute already exists for this order');
    }

    // Determine priority based on reason
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if ([DisputeReason.PRODUCT_NOT_RECEIVED, DisputeReason.PAYMENT_ISSUE].includes(disputeData.reason)) {
      priority = 'high';
    }

    // Create dispute
    const dispute = await Dispute.create({
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
    order.status = OrderStatus.DISPUTED;
    await order.addStatusUpdate(OrderStatus.DISPUTED, userId, 'Dispute opened');

    logger.info(`Dispute created: ${dispute._id} for order ${order._id}`);

    return dispute;
  }

  /**
   * Get dispute by ID
   */
  public async getDisputeById(disputeId: string, userId: string): Promise<IDispute> {
    const dispute = await Dispute.findById(disputeId)
      .populate('order')
      .populate('product', 'name images')
      .populate('customer', 'firstName lastName email phone avatar')
      .populate('seller', 'firstName lastName email phone avatar vendorProfile')
      .populate('assignedTo', 'firstName lastName email')
      .populate('messages.sender', 'firstName lastName avatar');

    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    // Verify user has access to this dispute
    const isCustomer = dispute.customer._id.toString() === userId;
    const isSeller = dispute.seller._id.toString() === userId;
    if (!isCustomer && !isSeller) {
      throw new ForbiddenError('You do not have access to this dispute');
    }

    return dispute;
  }

  /**
   * Get user disputes (customer or seller)
   */
  public async getUserDisputes(
    userId: string,
    role: 'customer' | 'seller',
    status?: DisputeStatus,
    page: number = 1,
    limit: number = 10
  ): Promise<{ disputes: IDispute[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = role === 'customer' ? { customer: userId } : { seller: userId };
    if (status) {
      query.status = status;
    }

    const [disputes, total] = await Promise.all([
      Dispute.find(query)
        .populate('order', 'orderNumber totalAmount')
        .populate('product', 'name images')
        .populate(role === 'customer' ? 'seller' : 'customer', 'firstName lastName avatar')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Dispute.countDocuments(query),
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
  public async getAllDisputes(
    filters?: {
      status?: DisputeStatus;
      priority?: 'low' | 'medium' | 'high';
      assignedTo?: string;
      reason?: DisputeReason;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{ disputes: IDispute[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = {};

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
      Dispute.find(query)
        .populate('order', 'orderNumber totalAmount')
        .populate('customer', 'firstName lastName email')
        .populate('seller', 'firstName lastName email vendorProfile')
        .populate('assignedTo', 'firstName lastName')
        .skip(skip)
        .limit(limit)
        .sort({ priority: -1, createdAt: 1 }),
      Dispute.countDocuments(query),
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
  public async addMessage(
    disputeId: string,
    senderId: string,
    message: string,
    attachments?: string[]
  ): Promise<IDispute> {
    const dispute = await Dispute.findById(disputeId);

    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    // Determine sender role
    let senderRole: 'customer' | 'seller' | 'admin' = 'customer';
    if (dispute.seller.toString() === senderId) {
      senderRole = 'seller';
    } else if (dispute.customer.toString() !== senderId) {
      senderRole = 'admin';
    }

    await dispute.addMessage(senderId, senderRole, message, attachments);

    logger.info(`Message added to dispute: ${disputeId}`);

    return dispute;
  }

  /**
   * Assign dispute to admin
   */
  public async assignDispute(
    disputeId: string,
    assignToId: string
  ): Promise<IDispute> {
    const dispute = await Dispute.findById(disputeId);

    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    dispute.assignedTo = mongoose.Types.ObjectId.createFromHexString(assignToId);
    dispute.assignedAt = new Date();
    dispute.status = DisputeStatus.UNDER_REVIEW;

    await dispute.save();

    logger.info(`Dispute assigned: ${disputeId} to admin ${assignToId}`);

    return dispute;
  }

  /**
   * Resolve dispute (admin only)
   */
  public async resolveDispute(
    disputeId: string,
    adminId: string,
    resolution: DisputeResolution,
    resolutionNote: string,
    refundAmount?: number
  ): Promise<IDispute> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const dispute = await Dispute.findById(disputeId).session(session);

      if (!dispute) {
        throw new NotFoundError('Dispute not found');
      }

      if (!dispute.canBeResolved()) {
        throw new BadRequestError('Dispute cannot be resolved at this stage');
      }

      const order = await Order.findById(dispute.order).session(session);
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Update dispute
      dispute.status = DisputeStatus.RESOLVED;
      dispute.resolution = resolution;
      dispute.resolutionNote = resolutionNote;
      dispute.resolvedBy = mongoose.Types.ObjectId.createFromHexString(adminId);
      dispute.resolvedAt = new Date();

      // Handle resolution
      switch (resolution) {
        case DisputeResolution.FULL_REFUND:
          dispute.refundAmount = order.totalAmount;
          order.escrowStatus = 'refunded';
          // TODO: Process refund through payment service
          break;

        case DisputeResolution.PARTIAL_REFUND:
          if (!refundAmount || refundAmount <= 0 || refundAmount > order.totalAmount) {
            throw new BadRequestError('Invalid refund amount');
          }
          dispute.refundAmount = refundAmount;
          order.escrowStatus = 'refunded';
          // TODO: Process partial refund through payment service
          break;

        case DisputeResolution.SELLER_WINS:
          order.escrowStatus = 'released';
          // TODO: Release funds to seller through payment service
          break;

        case DisputeResolution.CUSTOMER_WINS:
          dispute.refundAmount = order.totalAmount;
          order.escrowStatus = 'refunded';
          // TODO: Process refund through payment service
          break;
      }

      await dispute.save({ session });
      await order.save({ session });

      await session.commitTransaction();
      logger.info(`Dispute resolved: ${disputeId} - ${resolution}`);

      return dispute;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Close dispute (admin only)
   */
  public async closeDispute(
    disputeId: string,
    adminId: string,
    closureNote: string
  ): Promise<IDispute> {
    const dispute = await Dispute.findById(disputeId);

    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    if (!dispute.canBeClosed()) {
      throw new BadRequestError('Dispute must be resolved before closing');
    }

    dispute.status = DisputeStatus.CLOSED;
    dispute.closedBy = mongoose.Types.ObjectId.createFromHexString(adminId);
    dispute.closedAt = new Date();
    dispute.closureNote = closureNote;

    await dispute.save();

    logger.info(`Dispute closed: ${disputeId}`);

    return dispute;
  }

  /**
   * Escalate dispute
   */
  public async escalateDispute(
    disputeId: string,
    escalatedReason: string
  ): Promise<IDispute> {
    const dispute = await Dispute.findById(disputeId);

    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    dispute.isEscalated = true;
    dispute.escalatedAt = new Date();
    dispute.escalatedReason = escalatedReason;
    dispute.priority = 'high';

    await dispute.save();

    logger.info(`Dispute escalated: ${disputeId}`);

    return dispute;
  }

  /**
   * Get dispute statistics (admin)
   */
  public async getDisputeStats(): Promise<any> {
    const [
      totalDisputes,
      openDisputes,
      underReviewDisputes,
      resolvedDisputes,
      closedDisputes,
      highPriorityDisputes,
    ] = await Promise.all([
      Dispute.countDocuments(),
      Dispute.countDocuments({ status: DisputeStatus.OPEN }),
      Dispute.countDocuments({ status: DisputeStatus.UNDER_REVIEW }),
      Dispute.countDocuments({ status: DisputeStatus.RESOLVED }),
      Dispute.countDocuments({ status: DisputeStatus.CLOSED }),
      Dispute.countDocuments({ priority: 'high', status: { $nin: [DisputeStatus.RESOLVED, DisputeStatus.CLOSED] } }),
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

export default new DisputeService();