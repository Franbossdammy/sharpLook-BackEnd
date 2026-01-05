import Booking, { IBooking } from '../models/Booking';
import Service from '../models/Service';
import User from '../models/User';
import Payment from '../models/Payment';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../utils/errors';
import { BookingStatus, BookingType, TransactionType, PaymentStatus } from '../types';
import { calculateDistance, calculateServiceCharge, parsePaginationParams, generateRandomString } from '../utils/helpers';
import logger from '../utils/logger';
import transactionService from './transaction.service';
import subscriptionService from './subscription.service';
import notificationHelper from '../utils/notificationHelper';
import referralService from './referral.service';
import paystackHelper from '../utils/paystackHelper';
import socketService from '../socket/socket.service';
import redFlagService from './redFlag.service'; // ✅ NEW: Import RedFlag service

// ==================== CANCELLATION POLICY CONSTANTS ====================
const CLIENT_CANCELLATION_PENALTY_WINDOW_MINUTES = 59; // 59 minutes before appointment
const CLIENT_PENALTY_PERCENTAGE = 20; // 20% goes to vendor
const VENDOR_RED_FLAG_WINDOW_MINUTES = 239; // 3 hours 59 minutes = 239 minutes

// ✅ TIMEZONE: Nigeria WAT = UTC+1
const NIGERIA_TIMEZONE_OFFSET_HOURS = 1;

class BookingService {
  /**
   * Create booking with immediate payment (ATOMIC)
   * Booking cannot exist without successful payment
   */
  public async createBookingWithPayment(
    clientId: string,
    data: {
      service: string;
      scheduledDate: Date;
      scheduledTime?: string;
      serviceType?: 'home' | 'shop';
      location?: {
        address: string;
        city: string;
        state: string;
        coordinates: [number, number];
      };
      clientNotes?: string;
      paymentMethod: 'wallet' | 'card';
    }
  ): Promise<{ booking: IBooking; payment: any; authorizationUrl?: string }> {
    // Verify service exists and is active
    const service = await Service.findById(data.service).populate('vendor');
    if (!service || !service.isActive) {
      throw new NotFoundError('Service not found or not available');
    }

    // Verify vendor
    const vendor = await User.findById(service.vendor);
    if (!vendor || !vendor.isVendor || !vendor.vendorProfile?.isVerified) {
      throw new BadRequestError('Vendor is not available');
    }

    // ✅ NEW: Check if vendor is suspended
    if (vendor.vendorProfile?.isSuspended) {
      throw new BadRequestError('This vendor is currently unavailable');
    }

    // Check what the CLIENT wants vs what vendor offers
    const clientWantsHomeService = data.serviceType === 'home';
    const vendorOffersHomeService = vendor.vendorProfile.vendorType === 'home_service' || 
        vendor.vendorProfile.vendorType === 'both';

    // Validate service type availability
    if (clientWantsHomeService && !vendorOffersHomeService) {
      throw new BadRequestError('This vendor does not offer home service');
    }

    // Calculate pricing
    let distanceCharge = 0;
    let location;

    // Only require location if CLIENT chose home service
    if (clientWantsHomeService) {
      if (!data.location) {
        throw new BadRequestError('Location is required for home service');
      }

      location = {
        type: 'Point',
        coordinates: data.location.coordinates,
        address: data.location.address,
        city: data.location.city,
        state: data.location.state,
      };

      // Calculate distance charge
      if (vendor.vendorProfile.location) {
        const distance = calculateDistance(
          vendor.vendorProfile.location.coordinates[1],
          vendor.vendorProfile.location.coordinates[0],
          data.location.coordinates[1],
          data.location.coordinates[0]
        );

        distanceCharge = calculateServiceCharge(distance);
      }
    }

    const totalAmount = service.basePrice + distanceCharge;

    // Get client
    const client = await User.findById(clientId);
    if (!client || !client.email) {
      throw new NotFoundError('User not found or email not available');
    }

    // Get vendor's commission rate
    const commissionRate = await subscriptionService.getCommissionRate(
      (service.vendor as any)._id?.toString() || service.vendor.toString()
    );

    // Calculate fees
    const platformFee = Math.round((totalAmount * commissionRate) / 100);
    const vendorAmount = totalAmount - platformFee;

    // Generate payment reference
    const reference = `BOOKING-${Date.now()}-${generateRandomString(8)}`;

    // ==================== WALLET PAYMENT ====================
    if (data.paymentMethod === 'wallet') {
      // Check wallet balance BEFORE creating anything
      if ((client.walletBalance || 0) < totalAmount) {
        throw new BadRequestError(
          `Insufficient wallet balance. Your balance: ₦${(client.walletBalance || 0).toLocaleString()}, Required: ₦${totalAmount.toLocaleString()}`
        );
      }

      // Deduct from wallet FIRST
      const previousBalance = client.walletBalance || 0;
      client.walletBalance = previousBalance - totalAmount;
      await client.save();

      try {
        // Create booking (already paid)
        const booking = await Booking.create({
          bookingType: BookingType.STANDARD,
          client: clientId,
          vendor: service.vendor,
          service: service._id,
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          duration: service.duration,
          location,
          servicePrice: service.basePrice,
          distanceCharge,
          totalAmount,
          status: BookingStatus.PENDING,
          clientNotes: data.clientNotes,
          paymentStatus: 'escrowed', // Already paid!
          paymentReference: reference,
          clientMarkedComplete: false,
          vendorMarkedComplete: false,
          hasDispute: false,
          hasReview: false,
          statusHistory: [
            {
              status: BookingStatus.PENDING,
              changedAt: new Date(),
              changedBy: clientId as any,
            },
          ],
        });

        // Create payment record
        const payment = await Payment.create({
          user: clientId,
          booking: booking._id,
          amount: totalAmount,
          currency: 'NGN',
          status: PaymentStatus.COMPLETED,
          paymentMethod: 'wallet',
          reference,
          paidAt: new Date(),
          initiatedAt: new Date(),
          escrowStatus: 'held',
          escrowedAt: new Date(),
          commissionRate,
          platformFee,
          vendorAmount,
        });

        // Update booking with payment ID
        booking.paymentId = payment._id;
        await booking.save();

        // Create transaction for client payment
        await transactionService.createTransaction({
          userId: clientId,
          type: TransactionType.BOOKING_PAYMENT,
          amount: totalAmount,
          description: `Payment for booking #${booking._id.toString().slice(-8)}`,
          booking: booking._id.toString(),
          payment: payment._id.toString(),
        });

        // Update service booking count
        if (service.metadata) {
          service.metadata.bookings = (service.metadata.bookings || 0) + 1;
          await service.save();
        }

        logger.info(`✅ Booking created with wallet payment: ${booking._id} by client ${clientId}`);

        // Notify BOTH client and vendor
        await notificationHelper.notifyBookingCreated(booking);
        await notificationHelper.notifyPaymentSuccessful(payment, clientId);

        // Emit real-time event
        socketService.emitPaymentEvent(clientId, 'booking:created:paid', {
          bookingId: booking._id.toString(),
          reference,
          amount: totalAmount,
          paymentMethod: 'wallet',
          newBalance: client.walletBalance,
        });

        return { booking, payment };

      } catch (error) {
        // ROLLBACK: Refund wallet if booking creation fails
        client.walletBalance = previousBalance;
        await client.save();
        logger.error(`❌ Booking creation failed, refunded wallet: ${error}`);
        throw error;
      }
    }

    // ==================== PAYSTACK PAYMENT ====================
    if (data.paymentMethod === 'card') {
      // Create booking in PENDING_PAYMENT state
      const booking = await Booking.create({
        bookingType: BookingType.STANDARD,
        client: clientId,
        vendor: service.vendor,
        service: service._id,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        duration: service.duration,
        location,
        servicePrice: service.basePrice,
        distanceCharge,
        totalAmount,
        status: BookingStatus.PENDING,
        clientNotes: data.clientNotes,
        paymentStatus: 'pending', // Awaiting payment
        paymentReference: reference,
        clientMarkedComplete: false,
        vendorMarkedComplete: false,
        hasDispute: false,
        hasReview: false,
        // Auto-expire if payment not completed within 30 minutes
        paymentExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        statusHistory: [
          {
            status: BookingStatus.PENDING,
            changedAt: new Date(),
            changedBy: clientId as any,
          },
        ],
      });

      // Initialize Paystack payment
      const paymentData = await paystackHelper.initializePayment(
        client.email,
        totalAmount,
        reference,
        {
          bookingId: booking._id.toString(),
          clientId: clientId,
          vendorId: booking.vendor.toString(),
          serviceId: booking.service,
          commissionRate,
          platformFee,
          vendorAmount,
          paymentType: 'booking',
        }
      );

      logger.info(`💳 Paystack payment initialized for new booking: ${reference}`);

      // Don't notify yet - wait for payment confirmation
      // The webhook will handle notifications after successful payment

      return {
        booking,
        payment: null, // Payment record created after webhook confirms
        authorizationUrl: paymentData.authorization_url,
      };
    }

    throw new BadRequestError('Invalid payment method. Use "wallet" or "card"');
  }

  /**
   * Verify Paystack payment and activate booking (called from webhook)
   */
  public async verifyPaystackPayment(
    reference: string
  ): Promise<{ booking: IBooking; payment: any }> {
    // Verify payment with Paystack
    const paymentData = await paystackHelper.verifyPayment(reference);

    if (paymentData.status !== 'success') {
      throw new BadRequestError('Payment verification failed');
    }

    // Get booking
    const booking = await Booking.findOne({ paymentReference: reference });
    if (!booking) {
      throw new NotFoundError('Booking not found for this payment');
    }

    // Check if already processed
    if (booking.paymentStatus === 'escrowed') {
      logger.warn(`Payment ${reference} already processed for booking ${booking._id}`);
      return { booking, payment: await Payment.findOne({ reference }) };
    }

    // Get metadata from Paystack
    const metadata = paymentData.metadata || {};
    const commissionRate = metadata.commissionRate || 
      await subscriptionService.getCommissionRate(booking.vendor.toString());
    const platformFee = metadata.platformFee || Math.round((booking.totalAmount * commissionRate) / 100);
    const vendorAmount = metadata.vendorAmount || (booking.totalAmount - platformFee);

    // Convert from kobo to naira
    const amount = paymentData.amount / 100;

    // Create payment record
    const payment = await Payment.create({
      user: booking.client,
      booking: booking._id,
      amount: amount,
      currency: paymentData.currency,
      status: PaymentStatus.COMPLETED,
      paymentMethod: 'card',
      reference: reference,
      paidAt: new Date(paymentData.paid_at || Date.now()),
      initiatedAt: new Date(paymentData.created_at || Date.now()),
      escrowStatus: 'held',
      escrowedAt: new Date(),
      commissionRate,
      platformFee,
      vendorAmount,
      gatewayResponse: {
        gateway: 'paystack',
        transaction_id: paymentData.id,
        channel: paymentData.channel,
        card_type: paymentData.authorization?.card_type,
        bank: paymentData.authorization?.bank,
        last4: paymentData.authorization?.last4,
      },
    });

    // Create transaction for client payment
    await transactionService.createTransaction({
      userId: booking.client.toString(),
      type: TransactionType.BOOKING_PAYMENT,
      amount: amount,
      description: `Payment for booking #${booking._id.toString().slice(-8)}`,
      booking: booking._id.toString(),
      payment: payment._id.toString(),
    });

    // Update booking - NOW IT'S FULLY ACTIVE
    booking.paymentId = payment._id;
    booking.paymentStatus = 'escrowed';
    await booking.save();

    // Update service booking count
    const service = await Service.findById(booking.service);
    if (service && service.metadata) {
      service.metadata.bookings = (service.metadata.bookings || 0) + 1;
      await service.save();
    }

    logger.info(`✅ Paystack payment verified, booking activated: ${booking._id}`);

    // NOW notify both parties
    await notificationHelper.notifyBookingCreated(booking);
    await notificationHelper.notifyPaymentSuccessful(payment, booking.client.toString());
    await notificationHelper.notifyPaymentReceived(payment, booking.vendor.toString());

    // Emit real-time event to client
    socketService.emitPaymentEvent(booking.client.toString(), 'booking:created:paid', {
      bookingId: booking._id.toString(),
      reference,
      amount,
      paymentMethod: 'card',
    });

    return { booking, payment };
  }

  /**
   * Handle failed/expired Paystack payment - cleanup unpaid booking
   */
  public async handleFailedPaystackPayment(
    reference: string,
    reason?: string
  ): Promise<void> {
    const booking = await Booking.findOne({ paymentReference: reference });
    
    if (booking && booking.paymentStatus === 'pending') {
      // Delete the unpaid booking
      await Booking.findByIdAndDelete(booking._id);
      
      logger.error(`❌ Payment failed, booking deleted: ${booking._id} - ${reason || 'Unknown reason'}`);
      
      // Notify client about failed payment
      socketService.emitPaymentEvent(booking.client.toString(), 'booking:payment:failed', {
        bookingId: booking._id.toString(),
        reference,
        reason: reason || 'Payment failed or expired',
      });
    }
  }

  /**
   * Cleanup expired unpaid bookings (run via cron job)
   */
  public async cleanupExpiredBookings(): Promise<number> {
    const expiredBookings = await Booking.find({
      paymentStatus: 'pending',
      paymentExpiresAt: { $lt: new Date() },
    });

    for (const booking of expiredBookings) {
      await Booking.findByIdAndDelete(booking._id);
      logger.info(`🗑️ Deleted expired unpaid booking: ${booking._id}`);
    }

    return expiredBookings.length;
  }

  /**
   * Preview booking price (calculate total including distance charge)
   * Call this BEFORE creating booking to show user the exact amount
   */
  public async previewBookingPrice(data: {
    serviceId: string;
    serviceType: 'home' | 'shop';
    location?: {
      coordinates: [number, number]; // [longitude, latitude]
    };
  }): Promise<{
    servicePrice: number;
    distanceCharge: number;
    totalAmount: number;
    distance?: number;
  }> {
    // Get service with vendor
    const service = await Service.findById(data.serviceId).populate('vendor');
    if (!service || !service.isActive) {
      throw new NotFoundError('Service not found or not available');
    }

    const vendor = await User.findById(service.vendor);
    if (!vendor || !vendor.isVendor) {
      throw new BadRequestError('Vendor not available');
    }

    const servicePrice = service.basePrice;
    let distanceCharge = 0;
    let distance: number | undefined;

    // Calculate distance charge only for home service
    if (data.serviceType === 'home' && data.location?.coordinates && vendor.vendorProfile?.location?.coordinates) {
      distance = calculateDistance(
        vendor.vendorProfile.location.coordinates[1], // vendor lat
        vendor.vendorProfile.location.coordinates[0], // vendor lng
        data.location.coordinates[1], // client lat
        data.location.coordinates[0]  // client lng
      );

      distanceCharge = calculateServiceCharge(distance);
    }

    const totalAmount = servicePrice + distanceCharge;

    return {
      servicePrice,
      distanceCharge,
      totalAmount,
      distance,
    };
  }

  // ==================== CANCELLATION WITH PENALTIES ====================

  /**
   * Cancel booking with cancellation policy enforcement
   */
  public async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string
  ): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify ownership
    const isClient = booking.client.toString() === userId;
    const isVendor = booking.vendor.toString() === userId;

    if (!isClient && !isVendor) {
      throw new ForbiddenError('Not authorized to cancel this booking');
    }

    if ([BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.IN_PROGRESS].includes(booking.status)) {
      throw new BadRequestError('Cannot cancel in-progress, completed or already cancelled bookings');
    }

    // Calculate time until appointment
    const now = new Date();
    const appointmentDateTime = this.getAppointmentDateTime(booking);
    const minutesUntilAppointment = Math.floor((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60));

    // ✅ DETAILED DEBUG LOGGING
    logger.info(`📅 ========================================`);
    logger.info(`📅 CANCELLATION REQUEST DEBUG`);
    logger.info(`📅 ========================================`);
    logger.info(`📅 Booking ID: ${bookingId}`);
    logger.info(`📅 Current time (UTC): ${now.toISOString()}`);
    logger.info(`📅 Scheduled Date (raw): ${booking.scheduledDate}`);
    logger.info(`📅 Scheduled Time (local WAT): ${booking.scheduledTime}`);
    logger.info(`📅 Appointment DateTime (UTC): ${appointmentDateTime.toISOString()}`);
    logger.info(`📅 Minutes until appointment: ${minutesUntilAppointment}`);
    logger.info(`📅 Penalty window threshold: ${CLIENT_CANCELLATION_PENALTY_WINDOW_MINUTES} minutes`);
    logger.info(`📅 Is within penalty window? ${minutesUntilAppointment < CLIENT_CANCELLATION_PENALTY_WINDOW_MINUTES}`);
    logger.info(`📅 Cancelled by: ${isClient ? 'CLIENT' : 'VENDOR'}`);
    logger.info(`📅 ========================================`);

    // ==================== CLIENT CANCELLATION POLICY ====================
    if (isClient) {
      await this.handleClientCancellation(booking, minutesUntilAppointment, reason);
    }

    // ==================== VENDOR CANCELLATION POLICY ====================
    if (isVendor) {
      await this.handleVendorCancellation(booking, minutesUntilAppointment, reason);
    }

    // Update booking status
    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = userId as any;
    booking.cancellationReason = reason;
    await booking.save();

    logger.info(`✅ Booking cancelled: ${bookingId} by ${isClient ? 'client' : 'vendor'} ${userId}`);

    // Notify BOTH parties
    const cancelledByRole = isClient ? 'client' : 'vendor';
    await notificationHelper.notifyBookingCancelled(booking, cancelledByRole, reason);

    return booking;
  }

  /**
   * Handle client cancellation with penalty logic
   */
  private async handleClientCancellation(
    booking: IBooking,
    minutesUntilAppointment: number,
    _reason?: string
  ): Promise<void> {
    const payment = await Payment.findById(booking.paymentId);
    
    logger.info(`💳 Payment check: ${payment ? 'Found' : 'Not found'}`);
    logger.info(`💳 Payment status: ${booking.paymentStatus}`);
    
    if (!payment || booking.paymentStatus !== 'escrowed') {
      logger.info('⚠️ No escrowed payment to process for cancellation');
      return;
    }

    const client = await User.findById(booking.client);
    const vendor = await User.findById(booking.vendor);

    if (!client) {
      logger.error(`❌ Client not found for booking ${booking._id}`);
      return;
    }

    logger.info(`💰 Payment amount: ₦${payment.amount}`);
    logger.info(`💰 Checking penalty condition: ${minutesUntilAppointment} < ${CLIENT_CANCELLATION_PENALTY_WINDOW_MINUTES}`);

    // ✅ Check if within penalty window (less than 59 minutes before appointment)
    // Also apply penalty if appointment time has passed (negative minutes)
    const shouldApplyPenalty = minutesUntilAppointment < CLIENT_CANCELLATION_PENALTY_WINDOW_MINUTES;
    
    logger.info(`💰 Should apply penalty? ${shouldApplyPenalty}`);

    if (shouldApplyPenalty) {
      // ==================== APPLY PENALTY ====================
      logger.info(`⚠️ ========================================`);
      logger.info(`⚠️ APPLYING ${CLIENT_PENALTY_PERCENTAGE}% CANCELLATION PENALTY`);
      logger.info(`⚠️ ========================================`);

      const totalAmount = payment.amount;
      
      // Calculate penalty (20% of total amount)
      const penaltyAmount = Math.round((totalAmount * CLIENT_PENALTY_PERCENTAGE) / 100);
      
      // Platform keeps its commission from the penalty
      const platformFeeFromPenalty = Math.round((penaltyAmount * (payment.commissionRate || 0)) / 100);
      const vendorPenaltyShare = penaltyAmount - platformFeeFromPenalty;
      
      // Client refund = total - penalty
      const clientRefund = totalAmount - penaltyAmount;

      logger.info(`💰 Total amount: ₦${totalAmount}`);
      logger.info(`💰 Penalty (${CLIENT_PENALTY_PERCENTAGE}%): ₦${penaltyAmount}`);
      logger.info(`💰 Platform fee from penalty: ₦${platformFeeFromPenalty}`);
      logger.info(`💰 Vendor penalty share: ₦${vendorPenaltyShare}`);
      logger.info(`💰 Client refund: ₦${clientRefund}`);

      // Credit vendor their penalty share
      if (vendor) {
        const vendorPrevBalance = vendor.walletBalance || 0;
        vendor.walletBalance = vendorPrevBalance + vendorPenaltyShare;
        await vendor.save();

        // Create transaction for vendor penalty payment
        await transactionService.createTransaction({
          userId: vendor._id.toString(),
          type: TransactionType.CANCELLATION_PENALTY,
          amount: vendorPenaltyShare,
          description: `Cancellation penalty from booking #${booking._id.toString().slice(-8)} (${CLIENT_PENALTY_PERCENTAGE}% penalty, after platform fee)`,
          booking: booking._id.toString(),
          payment: payment._id.toString(),
        });

        logger.info(`✅ Vendor received ₦${vendorPenaltyShare.toLocaleString()} cancellation penalty`);
        logger.info(`✅ Vendor new balance: ₦${vendor.walletBalance}`);

        // Notify vendor about penalty received
        await notificationHelper.sendNotification(
          vendor._id.toString(),
          'Cancellation Penalty Received',
          `You received ₦${vendorPenaltyShare.toLocaleString()} from a late cancellation`,
          'payment',
          { bookingId: booking._id.toString(), amount: vendorPenaltyShare }
        );
      }

      // Refund client the remaining amount (PARTIAL REFUND)
      const clientPrevBalance = client.walletBalance || 0;
      client.walletBalance = clientPrevBalance + clientRefund;
      await client.save();

      logger.info(`✅ Client refunded ₦${clientRefund.toLocaleString()} (after ${CLIENT_PENALTY_PERCENTAGE}% penalty)`);
      logger.info(`✅ Client new balance: ₦${client.walletBalance}`);

      // Create refund transaction for client
      await transactionService.createTransaction({
        userId: booking.client.toString(),
        type: TransactionType.REFUND,
        amount: clientRefund,
        description: `Partial refund for cancelled booking #${booking._id.toString().slice(-8)} (${CLIENT_PENALTY_PERCENTAGE}% penalty applied)`,
        booking: booking._id.toString(),
        payment: payment._id.toString(),
      });

      // Update payment status
      payment.status = PaymentStatus.PARTIALLY_REFUND;
      payment.refundAmount = clientRefund;
      payment.penaltyAmount = penaltyAmount;
      payment.refundedAt = new Date();
      payment.refundReason = `Late cancellation - ${CLIENT_PENALTY_PERCENTAGE}% penalty applied`;
      await payment.save();

      // ✅ Update booking with penalty info
      booking.paymentStatus = 'partially_refunded';
      booking.cancellationPenalty = penaltyAmount;

      // Notify client about partial refund
      await notificationHelper.notifyRefundProcessed(
        payment,
        booking.client.toString(),
        `Partial refund of ₦${clientRefund.toLocaleString()} (${CLIENT_PENALTY_PERCENTAGE}% cancellation penalty applied)`
      );

      socketService.emitPaymentEvent(booking.client.toString(), 'booking:cancelled:penalty', {
        bookingId: booking._id.toString(),
        refundAmount: clientRefund,
        penaltyAmount: penaltyAmount,
        newBalance: client.walletBalance,
        reason: `Cancellation within ${CLIENT_CANCELLATION_PENALTY_WINDOW_MINUTES} minutes of appointment`,
      });

      logger.info(`⚠️ ========================================`);
      logger.info(`⚠️ PENALTY APPLIED SUCCESSFULLY`);
      logger.info(`⚠️ ========================================`);

    } else {
      // ==================== FULL REFUND ====================
      logger.info(`✅ ========================================`);
      logger.info(`✅ PROCESSING FULL REFUND (outside penalty window)`);
      logger.info(`✅ ========================================`);
      
      await this.processFullRefund(booking, payment, client);
    }

    // ✅ NEW: Check for frequent cancellation pattern
    try {
      await redFlagService.detectClientFrequentCancellations(booking.client.toString());
    } catch (error) {
      logger.error(`Error checking client cancellation pattern: ${error}`);
    }
  }

  /**
   * Handle vendor cancellation with red flag logic
   * ✅ UPDATED: Now uses RedFlag service
   */
  private async handleVendorCancellation(
    booking: IBooking,
    minutesUntilAppointment: number,
    reason?: string
  ): Promise<void> {
    // Check if within red flag window (less than 3 hours 59 minutes before appointment)
    if (minutesUntilAppointment < VENDOR_RED_FLAG_WINDOW_MINUTES) {
      logger.warn(`🚩 VENDOR RED FLAG: Cancellation within ${VENDOR_RED_FLAG_WINDOW_MINUTES} min window`);

      // ✅ NEW: Use RedFlag service instead of inline creation
      try {
        await redFlagService.detectVendorLateCancellation(
          booking._id.toString(),
          booking.vendor.toString(),
          minutesUntilAppointment,
          reason
        );
      } catch (error) {
        logger.error(`Error creating vendor red flag: ${error}`);
        // Fall back to old method if RedFlag service fails
        const vendor = await User.findById(booking.vendor);
        await this.createVendorRedFlagLegacy(booking, vendor, minutesUntilAppointment, reason);
      }
    }

    // Process full refund to client
    if (booking.paymentStatus === 'escrowed') {
      const payment = await Payment.findById(booking.paymentId);
      const client = await User.findById(booking.client);
      
      if (payment && client) {
        await this.processFullRefund(booking, payment, client);
      }
    }
  }

  /**
   * Legacy red flag creation (fallback if RedFlag service fails)
   * @deprecated Use redFlagService.detectVendorLateCancellation instead
   */
  private async createVendorRedFlagLegacy(
    booking: IBooking,
    vendor: any,
    minutesUntilAppointment: number,
    reason?: string
  ): Promise<void> {
    const service = await Service.findById(booking.service);
    const client = await User.findById(booking.client);

    const redFlagData = {
      type: 'VENDOR_LATE_CANCELLATION',
      vendorId: booking.vendor.toString(),
      vendorName: vendor ? `${vendor.firstName} ${vendor.lastName}` : 'Unknown',
      vendorBusinessName: vendor?.vendorProfile?.businessName || 'N/A',
      bookingId: booking._id.toString(),
      serviceName: service?.name || 'Unknown Service',
      clientName: client ? `${client.firstName} ${client.lastName}` : 'Unknown',
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime,
      minutesBeforeAppointment: minutesUntilAppointment,
      cancellationReason: reason || 'No reason provided',
      createdAt: new Date(),
      severity: minutesUntilAppointment < 60 ? 'HIGH' : 'MEDIUM',
    };

    // Increment vendor's red flag count
    if (vendor && vendor.vendorProfile) {
      vendor.vendorProfile.redFlagCount = (vendor.vendorProfile.redFlagCount || 0) + 1;
      vendor.vendorProfile.lastRedFlagAt = new Date();
      await vendor.save();
    }

    // Notify all admins
    await notificationHelper.notifyAdmins(
      '🚩 Vendor Red Flag - Late Cancellation',
      `Vendor "${vendor?.vendorProfile?.businessName || vendor?.firstName}" cancelled booking #${booking._id.toString().slice(-8)} only ${minutesUntilAppointment} minutes before the appointment. Reason: ${reason || 'Not provided'}`,
      'red_flag',
      redFlagData
    );

    logger.warn(`🚩 Red flag created for vendor ${booking.vendor}: cancelled ${minutesUntilAppointment} min before appointment`);
  }

  /**
   * Process full refund to client
   */
  private async processFullRefund(
    booking: IBooking,
    payment: any,
    client: any
  ): Promise<void> {
    const previousBalance = client.walletBalance || 0;
    client.walletBalance = previousBalance + payment.amount;
    await client.save();

    // Create refund transaction
    await transactionService.createTransaction({
      userId: booking.client.toString(),
      type: TransactionType.REFUND,
      amount: payment.amount,
      description: `Full refund for cancelled booking #${booking._id.toString().slice(-8)}`,
      booking: booking._id.toString(),
      payment: payment._id.toString(),
    });

    // Update payment status
    payment.status = PaymentStatus.REFUNDED;
    payment.refundAmount = payment.amount;
    payment.refundedAt = new Date();
    await payment.save();

    booking.paymentStatus = 'refunded';

    // Notify client about refund
    await notificationHelper.notifyRefundProcessed(
      payment,
      booking.client.toString(),
      'Full refund processed to your wallet'
    );

    socketService.emitPaymentEvent(booking.client.toString(), 'booking:refund:success', {
      bookingId: booking._id.toString(),
      amount: payment.amount,
      newBalance: client.walletBalance,
      previousBalance: previousBalance,
      paymentMethod: payment.paymentMethod,
      message: 'Full refund processed to your wallet',
    });

    logger.info(`💰 Full refund of ₦${payment.amount.toLocaleString()} to client ${booking.client}`);
  }

  /**
   * Get appointment date/time as a single Date object (in UTC)
   * ✅ FIXED: Properly handles Nigeria timezone (WAT = UTC+1)
   * 
   * scheduledTime is stored in LOCAL time (Nigeria WAT)
   * We convert it to UTC for comparison with server time
   */
  private getAppointmentDateTime(booking: IBooking): Date {
    const appointmentDate = new Date(booking.scheduledDate);
    
    if (booking.scheduledTime) {
      // Parse time string - supports multiple formats:
      // "14:30", "2:30 PM", "14:30:00"
      const timeParts = booking.scheduledTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
      
      if (timeParts) {
        let hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2]);
        const meridiem = timeParts[4]; // AM/PM if present

        // Convert 12-hour format to 24-hour if AM/PM is present
        if (meridiem) {
          if (meridiem.toUpperCase() === 'PM' && hours !== 12) {
            hours += 12;
          } else if (meridiem.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
          }
        }

        // Set the time in UTC
        appointmentDate.setUTCHours(hours, minutes, 0, 0);
        
        // ✅ TIMEZONE FIX: Convert from Nigeria local time (WAT) to UTC
        // WAT is UTC+1, so subtract 1 hour to get UTC
        appointmentDate.setTime(appointmentDate.getTime() - (NIGERIA_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000));
        
        logger.info(`🕐 Time ${booking.scheduledTime} WAT = ${appointmentDate.toISOString()} UTC`);
      } else {
        logger.warn(`⚠️ Could not parse scheduledTime: "${booking.scheduledTime}"`);
        // Default to end of day if time can't be parsed
        appointmentDate.setUTCHours(22, 59, 0, 0); // 23:59 WAT = 22:59 UTC
      }
    } else {
      logger.warn(`⚠️ No scheduledTime provided, using end of day`);
      // If no time specified, assume end of day in local time
      appointmentDate.setUTCHours(22, 59, 0, 0); // 23:59 WAT = 22:59 UTC
    }

    return appointmentDate;
  }

  // ==================== EXISTING METHODS (Updated) ====================

  /**
   * Accept booking (Vendor)
   */
  public async acceptBooking(bookingId: string, vendorId: string): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify ownership
    if (booking.vendor.toString() !== vendorId) {
      throw new ForbiddenError('You can only accept your own bookings');
    }

    // Check status
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestError('Only pending bookings can be accepted');
    }

    // Check payment - MUST be escrowed now
    if (booking.paymentStatus !== 'escrowed') {
      throw new BadRequestError('Payment must be completed before accepting');
    }

    booking.status = BookingStatus.ACCEPTED;
    booking.acceptedAt = new Date();
    await booking.save();

    logger.info(`Booking accepted: ${bookingId} by vendor ${vendorId}`);

    // Notify BOTH client and vendor
    await notificationHelper.notifyBookingAccepted(booking);

    return booking;
  }

  /**
   * Reject booking (Vendor)
   * ✅ UPDATED: Now uses RedFlag service
   */
  public async rejectBooking(
    bookingId: string,
    vendorId: string,
    reason?: string
  ): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify ownership
    if (booking.vendor.toString() !== vendorId) {
      throw new ForbiddenError('You can only reject your own bookings');
    }

    // Check status
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestError('Only pending bookings can be rejected');
    }

    booking.status = BookingStatus.CANCELLED;
    booking.rejectedAt = new Date();
    booking.cancelledBy = vendorId as any;
    booking.cancellationReason = reason || 'Rejected by vendor';
    
    // Calculate time until appointment for potential red flag
    const appointmentDateTime = this.getAppointmentDateTime(booking);
    const minutesUntilAppointment = Math.floor((appointmentDateTime.getTime() - Date.now()) / (1000 * 60));

    // Check if rejection is within red flag window
    if (minutesUntilAppointment < VENDOR_RED_FLAG_WINDOW_MINUTES && minutesUntilAppointment > 0) {
      // ✅ NEW: Use RedFlag service
      try {
        await redFlagService.detectVendorLateCancellation(
          booking._id.toString(),
          vendorId,
          minutesUntilAppointment,
          reason
        );
      } catch (error) {
        logger.error(`Error creating vendor red flag for rejection: ${error}`);
        // Fallback to legacy method
        const vendor = await User.findById(vendorId);
        await this.createVendorRedFlagLegacy(booking, vendor, minutesUntilAppointment, reason);
      }
    }

    // Full refund to client if payment was escrowed
    if (booking.paymentStatus === 'escrowed') {
      const payment = await Payment.findById(booking.paymentId);
      const client = await User.findById(booking.client);
      if (payment && client) {
        await this.processFullRefund(booking, payment, client);
      }
    }

    await booking.save();

    logger.info(`Booking rejected: ${bookingId} by vendor ${vendorId}`);

    // Notify BOTH client and vendor
    await notificationHelper.notifyBookingRejected(booking, reason);

    return booking;
  }

  /**
   * Start booking (move to in progress)
   */
  public async startBooking(bookingId: string, vendorId: string): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify ownership
    if (booking.vendor.toString() !== vendorId) {
      throw new ForbiddenError('Only the vendor can start this booking');
    }

    // Check status
    if (booking.status !== BookingStatus.ACCEPTED) {
      throw new BadRequestError('Only accepted bookings can be started');
    }

    booking.status = BookingStatus.IN_PROGRESS;
    await booking.save();

    logger.info(`Booking started: ${bookingId}`);

    // Notify BOTH client and vendor
    await notificationHelper.notifyBookingStarted(booking);

    return booking;
  }

  /**
   * Mark booking as complete (by client or vendor)
   */
  public async markComplete(
    bookingId: string,
    userId: string,
    role: 'client' | 'vendor'
  ): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify ownership
    if (role === 'client' && booking.client.toString() !== userId) {
      throw new ForbiddenError('Not authorized');
    }
    if (role === 'vendor' && booking.vendor.toString() !== userId) {
      throw new ForbiddenError('Not authorized');
    }

    // Check status
    if (![BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS].includes(booking.status)) {
      throw new BadRequestError('Only accepted or in-progress bookings can be completed');
    }

    // Mark as complete
    if (role === 'client') {
      booking.clientMarkedComplete = true;
      await notificationHelper.notifyPartialCompletion(booking, 'vendor', 'client');
    } else {
      booking.vendorMarkedComplete = true;
      await notificationHelper.notifyPartialCompletion(booking, 'client', 'vendor');
    }

    // Check if both marked complete
    if (booking.clientMarkedComplete && booking.vendorMarkedComplete) {
      booking.status = BookingStatus.COMPLETED;
      booking.completedAt = new Date();
      booking.completedBy = 'both';

      // Fetch vendor for payment and profile updates
      const vendor = await User.findById(booking.vendor);

      // Release payment to vendor
      if (booking.paymentStatus === 'escrowed') {
        booking.paymentStatus = 'released';
        
        const payment = await Payment.findById(booking.paymentId);
        
        if (vendor && payment) {
          const amountToVendor = payment.vendorAmount!;
          const previousBalance = vendor.walletBalance || 0;
          
          vendor.walletBalance = previousBalance + amountToVendor;
          await vendor.save();

          // Create transaction for vendor earning
          await transactionService.createTransaction({
            userId: vendor._id.toString(),
            type: TransactionType.BOOKING_EARNING,
            amount: amountToVendor,
            description: `Earnings from completed booking #${booking._id.toString().slice(-8)} (after ${payment.commissionRate}% platform fee)`,
            booking: booking._id.toString(),
            payment: payment._id.toString(),
          });
          
          logger.info(`Released payment of ₦${amountToVendor.toLocaleString()} to vendor ${vendor._id}`);
        }
      }

      // Update service completed bookings count
      const service = await Service.findById(booking.service);
      if (service && service.metadata) {
        service.metadata.completedBookings = (service.metadata.completedBookings || 0) + 1;
        await service.save();
      }

      // Update vendor completed bookings
      if (vendor && vendor.vendorProfile) {
        vendor.vendorProfile.completedBookings = (vendor.vendorProfile.completedBookings || 0) + 1;
        await vendor.save();
      }

      // Process referral if this is client's first booking
      try {
        await referralService.processReferralBooking(booking._id.toString());
      } catch (error: any) {
        logger.error(`Error processing referral for booking ${booking._id}:`, error.message);
      }

      // Notify BOTH that booking is fully completed
      await notificationHelper.notifyBookingCompleted(booking, booking.client.toString(), 'client');
      await notificationHelper.notifyBookingCompleted(booking, booking.vendor.toString(), 'vendor');
    }

    await booking.save();

    logger.info(`Booking marked complete by ${role}: ${bookingId}`);

    return booking;
  }

  /**
   * Get booking by ID
   */
  public async getBookingById(bookingId: string, userId: string): Promise<IBooking> {
    const booking = await Booking.findById(bookingId)
      .populate('client', 'firstName lastName email phone avatar')
      .populate('vendor', 'firstName lastName email phone vendorProfile')
      .populate('service', 'name description basePrice images');

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify access
    const isClient = booking.client._id.toString() === userId;
    const isVendor = booking.vendor._id.toString() === userId;

    if (!isClient && !isVendor) {
      throw new ForbiddenError('Not authorized to view this booking');
    }

    return booking;
  }

  /**
   * Get user bookings
   */
  public async getUserBookings(
    userId: string,
    role: 'client' | 'vendor',
    filters?: {
      status?: BookingStatus;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 10
  ): Promise<{ bookings: IBooking[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = role === 'client' ? { client: userId } : { vendor: userId };

    // Exclude unpaid bookings from listing
    query.paymentStatus = { $ne: 'pending' };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      query.scheduledDate = {};
      if (filters.startDate) {
        query.scheduledDate.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.scheduledDate.$lte = filters.endDate;
      }
    }

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('client', 'firstName lastName avatar')
        .populate('vendor', 'firstName lastName vendorProfile.businessName avatar')
        .populate('service', 'name images basePrice')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Booking.countDocuments(query),
    ]);

    return {
      bookings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get booking statistics
   */
  public async getBookingStats(userId: string, role: 'client' | 'vendor'): Promise<any> {
    const query: any = role === 'client' ? { client: userId } : { vendor: userId };
    // Exclude unpaid bookings
    query.paymentStatus = { $ne: 'pending' };

    const [
      total,
      pending,
      accepted,
      inProgress,
      completed,
      cancelled,
    ] = await Promise.all([
      Booking.countDocuments(query),
      Booking.countDocuments({ ...query, status: BookingStatus.PENDING }),
      Booking.countDocuments({ ...query, status: BookingStatus.ACCEPTED }),
      Booking.countDocuments({ ...query, status: BookingStatus.IN_PROGRESS }),
      Booking.countDocuments({ ...query, status: BookingStatus.COMPLETED }),
      Booking.countDocuments({ ...query, status: BookingStatus.CANCELLED }),
    ]);

    return {
      total,
      pending,
      accepted,
      inProgress,
      completed,
      cancelled,
    };
  }

  /**
   * Update booking (add notes, etc.)
   */
  public async updateBooking(
    bookingId: string,
    userId: string,
    updates: {
      clientNotes?: string;
      vendorNotes?: string;
    }
  ): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify ownership
    const isClient = booking.client.toString() === userId;
    const isVendor = booking.vendor.toString() === userId;

    if (!isClient && !isVendor) {
      throw new ForbiddenError('Not authorized');
    }

    // Update appropriate notes
    if (isClient && updates.clientNotes !== undefined) {
      booking.clientNotes = updates.clientNotes;
    }
    if (isVendor && updates.vendorNotes !== undefined) {
      booking.vendorNotes = updates.vendorNotes;
    }

    await booking.save();

    return booking;
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Get all vendor red flags (Admin)
   * ✅ UPDATED: Now uses RedFlag service for comprehensive data
   */
  public async getVendorRedFlags(
    filters?: {
      vendorId?: string;
      severity?: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    // Use the new RedFlag service for comprehensive red flag data
    try {
      const { RedFlagType } = await import('../models/RedFlag');
      
      return await redFlagService.getRedFlags(
        {
          type: RedFlagType.VENDOR_LATE_CANCELLATION,
          severity: filters?.severity?.toLowerCase() as any,
          flaggedUserId: filters?.vendorId,
          startDate: filters?.startDate,
          endDate: filters?.endDate,
        },
        page,
        limit
      );
    } catch (error) {
      // Fallback to legacy method if RedFlag service fails
      logger.warn('RedFlag service unavailable, using legacy method');
      return this.getVendorRedFlagsLegacy(
        {
          vendorId: filters?.vendorId,
          severity: filters?.severity === 'HIGH' || filters?.severity === 'MEDIUM' 
            ? filters.severity 
            : undefined,
          startDate: filters?.startDate,
          endDate: filters?.endDate,
        },
        page,
        limit
      );
    }
  }

  /**
   * Legacy vendor red flags query
   * @deprecated Use redFlagService.getRedFlags instead
   */
  private async getVendorRedFlagsLegacy(
    filters?: {
      vendorId?: string;
      severity?: 'HIGH' | 'MEDIUM';
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const query: any = {
      'vendorProfile.redFlagCount': { $gt: 0 },
    };

    if (filters?.vendorId) {
      query._id = filters.vendorId;
    }

    const vendors = await User.find(query)
      .select('firstName lastName email vendorProfile.businessName vendorProfile.redFlagCount vendorProfile.lastRedFlagAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ 'vendorProfile.lastRedFlagAt': -1 });

    const total = await User.countDocuments(query);

    return {
      vendors,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export default new BookingService();