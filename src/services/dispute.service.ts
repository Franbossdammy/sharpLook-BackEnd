import Dispute, { IDispute } from '../models/Dispute';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import User from '../models/User';
import paymentService from './payment.service';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { DisputeStatus, DisputeResolution, BookingStatus } from '../types';
import { parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';
import notificationHelper from '../utils/notificationHelper';

class DisputeService {
  /**
   * Create dispute
   */
  public async createDispute(
    userId: string,
    data: {
      bookingId: string;
      reason: string;
      description: string;
      category: string;
      evidence?: { type: string; content: string }[];
    }
  ): Promise<IDispute> {
    // ✅ FIX: Populate booking with client and vendor details
    const booking = await Booking.findById(data.bookingId)
      .populate('client', 'firstName lastName')
      .populate('vendor', 'firstName lastName');
      
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // ✅ FIX: Type guard to check if populated
    const client = booking.client as any;
    const vendor = booking.vendor as any;

    // Verify user is part of booking
    const isClient = client._id.toString() === userId;
    const isVendor = vendor._id.toString() === userId;

    if (!isClient && !isVendor) {
      throw new ForbiddenError('You can only create disputes for your own bookings');
    }

    // Check if booking can have dispute
    if (![BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED].includes(booking.status)) {
      throw new BadRequestError('Disputes can only be created for accepted, in-progress, or completed bookings');
    }

    // Check if dispute already exists
    const existingDispute = await Dispute.findOne({
      booking: data.bookingId,
      status: { $in: [DisputeStatus.OPEN, DisputeStatus.IN_REVIEW] },
    });

    if (existingDispute) {
      throw new BadRequestError('An active dispute already exists for this booking');
    }

    // Determine against whom
    const against = isClient ? vendor._id : client._id;

    // Format evidence
    const evidence = data.evidence?.map((e) => ({
      type: e.type as any,
      content: e.content,
      uploadedAt: new Date(),
      uploadedBy: userId as any,
    })) || [];

    // Create dispute
    const dispute = await Dispute.create({
      booking: data.bookingId,
      raisedBy: userId,
      against,
      reason: data.reason,
      description: data.description,
      category: data.category,
      evidence,
      status: DisputeStatus.OPEN,
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

      await notificationHelper.notifyDisputeCreated(
        dispute,
        against.toString(),
        initiatorName
      );
    } catch (notifyError) {
      logger.error('Failed to notify about dispute creation:', notifyError);
    }

    logger.info(`Dispute created: ${dispute._id} for booking ${data.bookingId}`);

    return dispute;
  }

  /**
   * Add evidence to dispute
   */
  public async addEvidence(
    disputeId: string,
    userId: string,
    evidence: { type: string; content: string }[]
  ): Promise<IDispute> {
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    // Check if user is part of dispute
    const isRaiser = dispute.raisedBy.toString() === userId;
    const isAgainst = dispute.against.toString() === userId;

    if (!isRaiser && !isAgainst) {
      throw new ForbiddenError('You are not part of this dispute');
    }

    // Check status
    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
      throw new BadRequestError('Cannot add evidence to resolved/closed disputes');
    }

    // Add evidence
    const newEvidence = evidence.map((e) => ({
      type: e.type as any,
      content: e.content,
      uploadedAt: new Date(),
      uploadedBy: userId as any,
    }));

    dispute.evidence.push(...newEvidence);
    await dispute.save();

    // ✅ Notify the other party about new evidence
    try {
      const otherPartyId = isRaiser 
        ? dispute.against.toString()
        : dispute.raisedBy.toString();

      await notificationHelper.notifyDisputeUpdated(
        dispute,
        otherPartyId
      );
    } catch (notifyError) {
      logger.error('Failed to notify about new evidence:', notifyError);
    }

    logger.info(`Evidence added to dispute: ${disputeId}`);

    return dispute;
  }

  /**
   * Add message to dispute
   */
  public async addMessage(
    disputeId: string,
    userId: string,
    message: string,
    attachments?: string[]
  ): Promise<IDispute> {
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    // Check if user is part of dispute or admin
    const user = await User.findById(userId);
    const isRaiser = dispute.raisedBy.toString() === userId;
    const isAgainst = dispute.against.toString() === userId;
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    if (!isRaiser && !isAgainst && !isAdmin) {
      throw new ForbiddenError('You are not authorized to send messages in this dispute');
    }

    // Add message
    dispute.messages.push({
      sender: userId as any,
      message,
      attachments,
      sentAt: new Date(),
    });

    await dispute.save();

    // ✅ Notify relevant parties about new message
    try {
      // Notify the other party (not the sender)
      if (isRaiser) {
        await notificationHelper.notifyDisputeUpdated(
          dispute,
          dispute.against.toString()
        );
      } else if (isAgainst) {
        await notificationHelper.notifyDisputeUpdated(
          dispute,
          dispute.raisedBy.toString()
        );
      } else if (isAdmin) {
        // Admin sent message - notify both parties
        await notificationHelper.notifyDisputeUpdated(
          dispute,
          dispute.raisedBy.toString()
        );
        await notificationHelper.notifyDisputeUpdated(
          dispute,
          dispute.against.toString()
        );
      }
    } catch (notifyError) {
      logger.error('Failed to notify about new dispute message:', notifyError);
    }

    return dispute;
  }

  /**
   * Assign dispute to admin (Admin)
   */
  public async assignDispute(
    disputeId: string,
    _adminId: string,
    assignToId: string
  ): Promise<IDispute> {
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    // Update dispute
    dispute.assignedTo = assignToId as any;
    
    if (dispute.status === DisputeStatus.OPEN) {
      dispute.status = DisputeStatus.IN_REVIEW;
      dispute.reviewedAt = new Date();
    }

    await dispute.save();

    // ✅ Notify both parties that dispute is under review
    try {
      await notificationHelper.notifyDisputeUpdated(
        dispute,
        dispute.raisedBy.toString()
      );
      await notificationHelper.notifyDisputeUpdated(
        dispute,
        dispute.against.toString()
      );
    } catch (notifyError) {
      logger.error('Failed to notify about dispute assignment:', notifyError);
    }

    logger.info(`Dispute ${disputeId} assigned to ${assignToId}`);

    return dispute;
  }

  /**
   * Update dispute priority (Admin)
   */
  public async updatePriority(
    disputeId: string,
    priority: 'low' | 'medium' | 'high' | 'urgent'
  ): Promise<IDispute> {
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    dispute.priority = priority;
    await dispute.save();

    return dispute;
  }

  /**
   * Resolve dispute (Admin)
   */
  public async resolveDispute(
    disputeId: string,
    adminId: string,
    data: {
      resolution: DisputeResolution;
      resolutionDetails: string;
      refundAmount?: number;
      vendorPaymentAmount?: number;
    }
  ): Promise<IDispute> {
    const dispute = await Dispute.findById(disputeId).populate('booking');
    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    // Check status
    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
      throw new BadRequestError('Dispute already resolved/closed');
    }

    const booking = await Booking.findById(dispute.booking);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Handle resolution based on type
    if (data.resolution === DisputeResolution.REFUND_CLIENT) {
      // Full refund to client
      await paymentService.refundPayment(
        booking._id.toString(),
        adminId,
        'Dispute resolved in favor of client'
      );
    } else if (data.resolution === DisputeResolution.PAY_VENDOR) {
      // Release payment to vendor
      await paymentService.releasePayment(booking._id.toString());
    } else if (data.resolution === DisputeResolution.PARTIAL_REFUND) {
      // Partial refund - custom handling needed
      if (!data.refundAmount || !data.vendorPaymentAmount) {
        throw new BadRequestError('Refund and vendor payment amounts required for partial refund');
      }

      // Get payment
      const payment = await Payment.findOne({ booking: booking._id });
      if (payment) {
        // Refund client
        const client = await User.findById(booking.client);
        if (client && data.refundAmount > 0) {
          client.walletBalance = (client.walletBalance || 0) + data.refundAmount;
          await client.save();
        }

        // Pay vendor
        const vendor = await User.findById(booking.vendor);
        if (vendor && data.vendorPaymentAmount > 0) {
          vendor.walletBalance = (vendor.walletBalance || 0) + data.vendorPaymentAmount;
          await vendor.save();
        }

        payment.status = 'released' as any;
        await payment.save();
      }
    }

    // Update dispute
    dispute.status = DisputeStatus.RESOLVED;
    dispute.resolution = data.resolution;
    dispute.resolutionDetails = data.resolutionDetails;
    dispute.resolvedAt = new Date();
    dispute.resolvedBy = adminId as any;
    dispute.refundAmount = data.refundAmount;
    dispute.vendorPaymentAmount = data.vendorPaymentAmount;
    await dispute.save();

    // ✅ Notify both parties about resolution
    try {
      await notificationHelper.notifyDisputeResolved(
        dispute,
        dispute.raisedBy.toString()
      );
      await notificationHelper.notifyDisputeResolved(
        dispute,
        dispute.against.toString()
      );
    } catch (notifyError) {
      logger.error('Failed to notify about dispute resolution:', notifyError);
    }

    logger.info(`Dispute resolved: ${disputeId} - ${data.resolution}`);

    return dispute;
  }

  /**
   * Close dispute (Admin)
   */
  public async closeDispute(disputeId: string, adminId: string): Promise<IDispute> {
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    if (dispute.status !== DisputeStatus.RESOLVED) {
      throw new BadRequestError('Only resolved disputes can be closed');
    }

    dispute.status = DisputeStatus.CLOSED;
    dispute.closedAt = new Date();
    dispute.closedBy = adminId as any;
    await dispute.save();

    logger.info(`Dispute closed: ${disputeId}`);

    return dispute;
  }

  /**
   * Get dispute by ID
   */
  public async getDisputeById(disputeId: string, userId: string): Promise<IDispute> {
    const dispute = await Dispute.findById(disputeId)
      .populate('raisedBy', 'firstName lastName email avatar')
      .populate('against', 'firstName lastName email avatar')
      .populate('booking')
      .populate('assignedTo', 'firstName lastName email')
      .populate('messages.sender', 'firstName lastName avatar');

    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    // Check authorization
    const user = await User.findById(userId);
    const isRaiser = dispute.raisedBy._id.toString() === userId;
    const isAgainst = dispute.against._id.toString() === userId;
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    if (!isRaiser && !isAgainst && !isAdmin) {
      throw new ForbiddenError('Not authorized to view this dispute');
    }

    return dispute;
  }

  /**
   * Get user disputes
   */
  public async getUserDisputes(
    userId: string,
    filters?: {
      status?: DisputeStatus;
      category?: string;
    },
    page: number = 1,
    limit: number = 10
  ): Promise<{ disputes: IDispute[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = {
      $or: [{ raisedBy: userId }, { against: userId }],
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.category) {
      query.category = filters.category;
    }

    const [disputes, total] = await Promise.all([
      Dispute.find(query)
        .populate('raisedBy', 'firstName lastName avatar')
        .populate('against', 'firstName lastName avatar')
        .populate('booking', 'service scheduledDate status')
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
   * Get all disputes (Admin)
   */
  public async getAllDisputes(
    filters?: {
      status?: DisputeStatus;
      category?: string;
      priority?: string;
      assignedTo?: string;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{ disputes: IDispute[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = {};

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
      Dispute.find(query)
        .populate('raisedBy', 'firstName lastName email avatar')
        .populate('against', 'firstName lastName email avatar')
        .populate('booking', 'service scheduledDate totalAmount')
        .populate('assignedTo', 'firstName lastName')
        .skip(skip)
        .limit(limit)
        .sort({ priority: -1, createdAt: -1 }),
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
   * Get dispute statistics
   */
  public async getDisputeStats(): Promise<any> {
    const [
      total,
      open,
      inReview,
      resolved,
      closed,
      byCategory,
      byPriority,
    ] = await Promise.all([
      Dispute.countDocuments(),
      Dispute.countDocuments({ status: DisputeStatus.OPEN }),
      Dispute.countDocuments({ status: DisputeStatus.IN_REVIEW }),
      Dispute.countDocuments({ status: DisputeStatus.RESOLVED }),
      Dispute.countDocuments({ status: DisputeStatus.CLOSED }),
      Dispute.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Dispute.aggregate([
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

export default new DisputeService();