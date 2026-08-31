import mongoose from 'mongoose';
import Booking, { IBooking } from '../models/Booking';
import Service from '../models/Service';
import User from '../models/User';
import Payment from '../models/Payment';
import Coupon from '../models/Coupon';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  AppError,
} from '../utils/errors';
import { BookingStatus, BookingType, TransactionType, PaymentStatus } from '../types';
import { calculateDistance, calculateServiceCharge, parsePaginationParams, generateRandomString } from '../utils/helpers';
import logger from '../utils/logger';
import transactionService from './transaction.service';
import notificationHelper from '../utils/notificationHelper';
import referralService from './referral.service';
import paystackHelper from '../utils/paystackHelper';
import socketService from '../socket/socket.service';
import redFlagService from './redFlag.service'; // ✅ NEW: Import RedFlag service
import promoService from './promo.service';

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
      couponCode?: string;
      couponId?: string;
      // When true, the frontend has shown a promo discount to the user and
      // expects it applied. If we can't grant the slot, throw instead of
      // silently charging full price.
      expectPromo?: boolean;
    }
  ): Promise<{ booking: IBooking | null; payment: any; authorizationUrl?: string; reference?: string }> {
    // Verify service exists and is active
    const service = await Service.findById(data.service);
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

    const baseTotal = service.basePrice + distanceCharge;

    // ==================== COUPON VALIDATION & DISCOUNT ====================
    let couponDiscount = 0;
    let appliedCoupon: any = null;

    if (data.couponCode || data.couponId) {
      // Find coupon either by code or by id
      if (data.couponCode) {
        appliedCoupon = await Coupon.findOne({ code: data.couponCode.trim().toUpperCase() });
      } else if (data.couponId) {
        appliedCoupon = await Coupon.findById(data.couponId);
      }

      if (!appliedCoupon) {
        throw new BadRequestError('Invalid coupon code');
      }

      if (!appliedCoupon.isActive) {
        throw new BadRequestError('This coupon is no longer active');
      }

      if (new Date() > appliedCoupon.expiresAt) {
        throw new BadRequestError('This coupon has expired');
      }

      if (appliedCoupon.maxUses !== null && appliedCoupon.maxUses !== undefined) {
        if (appliedCoupon.usedCount >= appliedCoupon.maxUses) {
          throw new BadRequestError('This coupon has reached its maximum usage limit');
        }
      }

      const userUsageCount = appliedCoupon.usedBy.filter(
        (entry: any) => entry.user.toString() === clientId
      ).length;

      if (userUsageCount >= appliedCoupon.maxUsesPerUser) {
        throw new BadRequestError('You have already used this coupon');
      }

      if (baseTotal < appliedCoupon.minOrderAmount) {
        throw new BadRequestError(
          `Minimum order amount for this coupon is ₦${appliedCoupon.minOrderAmount.toLocaleString()}`
        );
      }

      if (appliedCoupon.discountType === 'flat') {
        couponDiscount = Math.min(appliedCoupon.discountValue, baseTotal);
      } else {
        const rawDiscount = (appliedCoupon.discountValue / 100) * baseTotal;
        const cap = appliedCoupon.maxDiscountAmount ?? Infinity;
        couponDiscount = Math.min(rawDiscount, cap);
      }

      couponDiscount = Math.round(couponDiscount * 100) / 100;
    }

    const totalAmount = Math.max(0, Math.round((baseTotal - couponDiscount) * 100) / 100);

    // Get client
    const client = await User.findById(clientId);
    if (!client || !client.email) {
      throw new NotFoundError('User not found or email not available');
    }

    // Vendor always receives the full pre-discount price; platform absorbs coupon cost
    const commissionRate = 0;
    const platformFee = 0;
    const vendorAmount = baseTotal;

    // Generate payment reference
    const reference = `BOOKING-${Date.now()}-${generateRandomString(8)}`;

    // ==================== PROMO SLOT CLAIM ====================
    // Pre-generate booking ID so we can atomically claim a promo slot referencing it.
    // Promo only attempted when no coupon was used (promos and coupons don't stack).
    const bookingId = new mongoose.Types.ObjectId();
    const promoBookingType = clientWantsHomeService ? 'HOME_SERVICE' : 'IN_SHOP';
    let promoApplied = false;
    let promoDiscount = 0;
    let promoBonusAmount = 0;
    let promoCampaignId: mongoose.Types.ObjectId | undefined;
    let promoRedemptionId: mongoose.Types.ObjectId | undefined;
    let promoCampaignName: string | undefined;

    if (couponDiscount === 0) {
      const claim = await promoService.claimSlot(
        clientId,
        bookingId.toString(),
        service.basePrice,
        promoBookingType
      );
      if (claim.success && claim.campaign) {
        promoApplied = true;
        promoDiscount = claim.discountAmount || 0;
        promoBonusAmount = claim.vendorBonusAmount || 0;
        promoCampaignId = claim.campaign._id;
        promoRedemptionId = claim.redemptionId;
        promoCampaignName = claim.campaign.name;
      } else if (data.expectPromo) {
        // Frontend showed the user a discounted price. Rather than silently
        // charging full price, surface the failure so they can choose.
        const reason = claim.reason || 'SLOTS_EXHAUSTED';
        throw new AppError(
          reason === 'USER_ALREADY_REDEEMED'
            ? 'You have already used this promo. You can proceed at full price.'
            : 'Sorry, the promo just sold out. You can proceed at full price.',
          409,
          'PROMO_SLOT_UNAVAILABLE'
        );
      }
    } else if (data.expectPromo) {
      throw new AppError(
        'Promo cannot be combined with a coupon. Remove the coupon or skip the promo.',
        409,
        'PROMO_COUPON_CONFLICT'
      );
    }

    const clientPaysAmount = Math.max(
      0,
      Math.round((totalAmount - promoDiscount) * 100) / 100
    );

    // ==================== WALLET PAYMENT ====================
    if (data.paymentMethod === 'wallet') {
      // Check wallet balance BEFORE creating anything
      if ((client.walletBalance || 0) < clientPaysAmount) {
        // Release the promo slot we optimistically claimed
        if (promoApplied && promoCampaignId && promoRedemptionId) {
          await promoService.releaseSlot(promoCampaignId, promoRedemptionId);
        }
        throw new BadRequestError(
          `Insufficient wallet balance. Your balance: ₦${(client.walletBalance || 0).toLocaleString()}, Required: ₦${clientPaysAmount.toLocaleString()}`
        );
      }

      // Deduct from wallet FIRST
      const previousBalance = client.walletBalance || 0;
      client.walletBalance = previousBalance - clientPaysAmount;
      await client.save();

      try {
        // Create booking (already paid)
        const booking = await Booking.create({
          _id: bookingId,
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
          couponDiscount,
          coupon: appliedCoupon?._id,
          totalAmount: clientPaysAmount,
          promoApplied,
          promoCampaign: promoCampaignId,
          promoRedemptionId,
          promoDiscount,
          promoBonusAmount,
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
        // amount = what client actually paid (post-promo).
        // vendorAmount = full pre-discount base — vendor is paid as if client paid full.
        const payment = await Payment.create({
          user: clientId,
          booking: booking._id,
          amount: clientPaysAmount,
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
          amount: clientPaysAmount,
          description: `Payment for booking #${booking._id.toString().slice(-8)}`,
          booking: booking._id.toString(),
          payment: payment._id.toString(),
        });

        // Update service booking count
        if (service.metadata) {
          service.metadata.bookings = (service.metadata.bookings || 0) + 1;
          await service.save();
        }

        // Mark coupon as used
        if (appliedCoupon) {
          appliedCoupon.usedBy.push({ user: clientId as any, usedAt: new Date() });
          appliedCoupon.usedCount += 1;
          await appliedCoupon.save();
        }

        logger.info(`✅ Booking created with wallet payment: ${booking._id} by client ${clientId}`);

        // Notify BOTH client and vendor
        await notificationHelper.notifyBookingCreated(booking);
        await notificationHelper.notifyPaymentSuccessful(payment, clientId);
        if (promoApplied) {
          await notificationHelper.notifyPromoApplied(
            clientId,
            promoDiscount,
            booking._id.toString(),
            promoCampaignName
          );
        }

        // Emit real-time event
        socketService.emitPaymentEvent(clientId, 'booking:created:paid', {
          bookingId: booking._id.toString(),
          reference,
          amount: clientPaysAmount,
          paymentMethod: 'wallet',
          newBalance: client.walletBalance,
          promoApplied,
          promoDiscount,
        });

        return { booking, payment };

      } catch (error) {
        // ROLLBACK: Refund wallet if booking creation fails
        client.walletBalance = previousBalance;
        await client.save();
        // ROLLBACK: Release promo slot if we claimed one
        if (promoApplied && promoCampaignId && promoRedemptionId) {
          await promoService.releaseSlot(promoCampaignId, promoRedemptionId);
        }
        logger.error(`❌ Booking creation failed, refunded wallet: ${error}`);
        throw error;
      }
    }

    // ==================== PAYSTACK PAYMENT ====================
    if (data.paymentMethod === 'card') {
      // Initialize Paystack payment FIRST — no booking created until payment succeeds
      let paymentData;
      try {
        paymentData = await paystackHelper.initializePayment(
          client.email,
          clientPaysAmount,
          reference,
          {
            clientId,
            vendorId: service.vendor.toString(),
            serviceId: data.service,
            commissionRate,
            platformFee,
            vendorAmount,
            paymentType: 'booking',
          },
          `lookreal://booking-payment-callback?reference=${reference}`
        );
      } catch (err) {
        // Release promo slot if paystack init failed
        if (promoApplied && promoCampaignId && promoRedemptionId) {
          await promoService.releaseSlot(promoCampaignId, promoRedemptionId);
        }
        throw err;
      }

      // Store pending booking data so the webhook can create the booking on charge.success.
      // NOTE: promo slot is already claimed; if the client abandons Paystack checkout,
      // a cleanup job should release stale claims tied to PENDING payments older than the
      // Paystack session window (~30 min). See promoService.releaseSlot.
      await Payment.create({
        user: clientId,
        amount: clientPaysAmount,
        currency: 'NGN',
        status: PaymentStatus.PENDING,
        paymentMethod: 'card',
        paymentType: 'booking',
        reference,
        initiatedAt: new Date(),
        escrowStatus: 'pending',
        commissionRate,
        platformFee,
        vendorAmount,
        metadata: {
          paymentType: 'booking',
          pendingBookingData: {
            bookingId: bookingId.toString(),
            clientId,
            vendorId: service.vendor.toString(),
            serviceId: data.service,
            scheduledDate: data.scheduledDate,
            scheduledTime: data.scheduledTime,
            duration: service.duration,
            location,
            servicePrice: service.basePrice,
            distanceCharge,
            baseTotal,
            totalAmount: clientPaysAmount,
            couponCode: data.couponCode || null,
            couponDiscount,
            promoApplied,
            promoCampaignId: promoCampaignId?.toString() || null,
            promoRedemptionId: promoRedemptionId?.toString() || null,
            promoDiscount,
            promoBonusAmount,
            promoCampaignName: promoCampaignName || null,
            clientNotes: data.clientNotes,
          },
        },
      });

      logger.info(`💳 Paystack payment initialized for pending booking: ${reference}`);

      return {
        booking: null,
        payment: null,
        authorizationUrl: paymentData.authorization_url,
        reference,
      };
    }

    throw new BadRequestError('Invalid payment method. Use "wallet" or "card"');
  }

  /**
   * Verify Paystack payment and create/activate booking (called from webhook or client verify endpoint).
   * Handles two flows:
   *   - Payment-first (new): payment record has pendingBookingData → create booking now
   *   - Legacy: booking already exists with paymentStatus:'pending' → activate it
   */
  public async verifyPaystackPayment(
    reference: string
  ): Promise<{ booking: IBooking; payment: any }> {
    const paymentData = await paystackHelper.verifyPayment(reference);

    if (paymentData.status !== 'success') {
      throw new BadRequestError('Payment verification failed');
    }

    const commissionRate = 0;
    const platformFee = 0;
    const amount = paymentData.amount / 100; // kobo → naira

    // Look up any pre-created payment record
    const existingPayment = await Payment.findOne({ reference });

    // Idempotency guard: already fully processed
    if (existingPayment?.status === PaymentStatus.COMPLETED && existingPayment.booking) {
      const processedBooking = await Booking.findById(existingPayment.booking);
      if (processedBooking) {
        logger.info(`Payment ${reference} already processed for booking ${processedBooking._id}`);
        return { booking: processedBooking, payment: existingPayment };
      }
    }

    // ==================== PAYMENT-FIRST FLOW ====================
    if (existingPayment?.metadata?.pendingBookingData) {
      const pd = existingPayment.metadata.pendingBookingData;

      // Create the booking now that payment is confirmed. Reuse the pre-generated
      // booking ID so it matches the one already stamped on the promo redemption record.
      const booking = await Booking.create({
        _id: pd.bookingId ? new mongoose.Types.ObjectId(pd.bookingId) : undefined,
        bookingType: BookingType.STANDARD,
        client: pd.clientId,
        vendor: pd.vendorId,
        service: pd.serviceId,
        scheduledDate: pd.scheduledDate,
        scheduledTime: pd.scheduledTime,
        duration: pd.duration,
        location: pd.location,
        servicePrice: pd.servicePrice,
        distanceCharge: pd.distanceCharge,
        couponDiscount: pd.couponDiscount || 0,
        totalAmount: pd.totalAmount,
        promoApplied: !!pd.promoApplied,
        promoCampaign: pd.promoCampaignId
          ? new mongoose.Types.ObjectId(pd.promoCampaignId)
          : undefined,
        promoRedemptionId: pd.promoRedemptionId
          ? new mongoose.Types.ObjectId(pd.promoRedemptionId)
          : undefined,
        promoDiscount: pd.promoDiscount || 0,
        promoBonusAmount: pd.promoBonusAmount || 0,
        status: BookingStatus.PENDING,
        clientNotes: pd.clientNotes,
        paymentStatus: 'escrowed',
        paymentReference: reference,
        clientMarkedComplete: false,
        vendorMarkedComplete: false,
        hasDispute: false,
        hasReview: false,
        statusHistory: [{
          status: BookingStatus.PENDING,
          changedAt: new Date(),
          changedBy: pd.clientId as any,
        }],
      });

      // Update existing payment record to link booking and mark complete
      existingPayment.status = PaymentStatus.COMPLETED;
      existingPayment.booking = booking._id;
      existingPayment.paidAt = new Date(paymentData.paid_at || Date.now());
      existingPayment.escrowStatus = 'held';
      existingPayment.escrowedAt = new Date();
      existingPayment.commissionRate = commissionRate;
      existingPayment.platformFee = platformFee;
      // Vendor gets the full pre-discount price; platform absorbs the coupon cost
      existingPayment.vendorAmount = pd.baseTotal ?? (pd.servicePrice + pd.distanceCharge);
      await existingPayment.save();

      booking.paymentId = existingPayment._id;
      await booking.save();

      // Mark coupon as used (card path)
      if (pd.couponCode && pd.couponDiscount > 0) {
        const usedCoupon = await Coupon.findOne({ code: pd.couponCode });
        if (usedCoupon) {
          usedCoupon.usedBy.push({ user: pd.clientId as any, usedAt: new Date() });
          usedCoupon.usedCount += 1;
          await usedCoupon.save();
        }
      }

      await transactionService.createTransaction({
        userId: pd.clientId,
        type: TransactionType.BOOKING_PAYMENT,
        amount,
        description: `Payment for booking #${booking._id.toString().slice(-8)}`,
        booking: booking._id.toString(),
        payment: existingPayment._id.toString(),
      });

      const service = await Service.findById(pd.serviceId);
      if (service?.metadata) {
        service.metadata.bookings = (service.metadata.bookings || 0) + 1;
        await service.save();
      }

      logger.info(`✅ Booking created after card payment confirmed: ${booking._id}`);

      await notificationHelper.notifyBookingCreated(booking);
      await notificationHelper.notifyPaymentSuccessful(existingPayment, pd.clientId);
      if (pd.promoApplied && pd.promoDiscount > 0) {
        await notificationHelper.notifyPromoApplied(
          pd.clientId,
          pd.promoDiscount,
          booking._id.toString(),
          pd.promoCampaignName || undefined
        );
      }
      // notifyPaymentReceived is NOT sent here — payment is in escrow, not yet released to vendor

      socketService.emitPaymentEvent(pd.clientId, 'booking:created:paid', {
        bookingId: booking._id.toString(),
        reference,
        amount,
        paymentMethod: 'card',
        promoApplied: !!pd.promoApplied,
        promoDiscount: pd.promoDiscount || 0,
      });

      return { booking, payment: existingPayment };
    }

    // ==================== LEGACY FLOW ====================
    // Booking was created before payment (old path)
    const booking = await Booking.findOne({ paymentReference: reference });
    if (!booking) {
      throw new NotFoundError('Booking not found for this payment');
    }

    if (booking.paymentStatus === 'escrowed') {
      logger.warn(`Payment ${reference} already processed for booking ${booking._id}`);
      return { booking, payment: existingPayment || await Payment.findOne({ reference }) };
    }

    // Create or update the payment record
    let payment;
    if (existingPayment) {
      existingPayment.status = PaymentStatus.COMPLETED;
      existingPayment.booking = booking._id;
      existingPayment.paidAt = new Date(paymentData.paid_at || Date.now());
      existingPayment.escrowStatus = 'held';
      existingPayment.escrowedAt = new Date();
      await existingPayment.save();
      payment = existingPayment;
    } else {
      payment = await Payment.create({
        user: booking.client,
        booking: booking._id,
        amount,
        currency: paymentData.currency,
        status: PaymentStatus.COMPLETED,
        paymentMethod: 'card',
        reference,
        paidAt: new Date(paymentData.paid_at || Date.now()),
        initiatedAt: new Date(paymentData.created_at || Date.now()),
        escrowStatus: 'held',
        escrowedAt: new Date(),
        commissionRate,
        platformFee,
        vendorAmount: booking.totalAmount,
      });
    }

    await transactionService.createTransaction({
      userId: booking.client.toString(),
      type: TransactionType.BOOKING_PAYMENT,
      amount,
      description: `Payment for booking #${booking._id.toString().slice(-8)}`,
      booking: booking._id.toString(),
      payment: payment._id.toString(),
    });

    const service = await Service.findById(booking.service);
    if (service?.metadata) {
      service.metadata.bookings = (service.metadata.bookings || 0) + 1;
      await service.save();
    }

    booking.paymentId = payment._id;
    booking.paymentStatus = 'escrowed';
    await booking.save();

    logger.info(`✅ Paystack payment verified, booking activated: ${booking._id}`);

    await notificationHelper.notifyBookingCreated(booking);
    await notificationHelper.notifyPaymentSuccessful(payment, booking.client.toString());
    // notifyPaymentReceived is NOT sent here — payment is in escrow, not yet released to vendor

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

  // ==================== RESCHEDULE ====================

  /**
   * Reschedule booking (Client only — no penalty, must be >24h before appointment)
   */
  public async rescheduleBooking(
    bookingId: string,
    clientId: string,
    newDate: string,
    newTime?: string
  ): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.client.toString() !== clientId) {
      throw new ForbiddenError('You can only reschedule your own bookings');
    }

    if (![BookingStatus.PENDING, BookingStatus.ACCEPTED].includes(booking.status)) {
      throw new BadRequestError('Only pending or accepted bookings can be rescheduled');
    }

    if (booking.hasDispute) {
      throw new BadRequestError('Cannot reschedule a disputed booking');
    }

    const now = new Date();

    // For accepted bookings: must be >6h before the current appointment
    if (booking.status === BookingStatus.ACCEPTED) {
      const currentAppointment = this.getAppointmentDateTime(booking);
      const hoursUntilCurrent = (currentAppointment.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilCurrent < 6) {
        throw new BadRequestError('Accepted bookings can only be rescheduled more than 6 hours before the appointment');
      }
    }

    // New appointment must be at least 6 hours from now
    const newDateObj = new Date(newDate);
    const resolvedTime = newTime ?? booking.scheduledTime;
    const newDateTime = new Date(newDateObj);
    if (resolvedTime) {
      const [h, m] = resolvedTime.split(':').map(Number);
      newDateTime.setHours(h, m, 0, 0);
    }
    const hoursUntilNew = (newDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilNew < 6) {
      throw new BadRequestError('New appointment must be at least 6 hours from now');
    }

    booking.scheduledDate = newDateObj;
    if (newTime !== undefined) {
      booking.scheduledTime = newTime;
    }

    await booking.save();

    logger.info(`✅ Booking rescheduled: ${bookingId} by client ${clientId} to ${newDate} ${newTime || ''}`);

    await notificationHelper.notifyBookingRescheduled(booking, newDate, newTime);

    socketService.emitPaymentEvent(booking.vendor.toString(), 'booking:rescheduled', {
      bookingId: booking._id.toString(),
      newDate,
      newTime,
    });

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

      // Release any promo slot — cancelled booking never completes, so bonus
      // was never paid and the slot should return to the pool.
      await this.releasePromoSlotIfApplied(booking);

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
   * Release a promo slot back to the pool if this booking used a promo.
   * Safe to call unconditionally on any cancellation path.
   */
  private async releasePromoSlotIfApplied(booking: IBooking): Promise<void> {
    if (
      booking.promoApplied &&
      booking.promoCampaign &&
      booking.promoRedemptionId
    ) {
      try {
        await promoService.releaseSlot(
          booking.promoCampaign,
          booking.promoRedemptionId
        );
      } catch (err) {
        logger.error(
          `Failed to release promo slot for cancelled booking ${booking._id}:`,
          err
        );
      }
    }
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

    // Release any promo slot this booking held
    await this.releasePromoSlotIfApplied(booking);

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
  public async startBooking(
    bookingId: string,
    userId: string,
    role: 'vendor' | 'client'
  ): Promise<{ booking: IBooking; waiting: boolean; waitingFor: 'client' | 'vendor' | null }> {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking not found');

    if (booking.status !== BookingStatus.ACCEPTED) {
      throw new BadRequestError('Only accepted bookings can be started');
    }

    // Verify caller belongs to this booking
    if (role === 'vendor' && booking.vendor.toString() !== userId) {
      throw new ForbiddenError('Only the vendor can confirm session start');
    }
    if (role === 'client' && booking.client.toString() !== userId) {
      throw new ForbiddenError('Only the client can confirm session start');
    }

    // Set the caller's confirmation flag
    if (role === 'vendor') booking.vendorStartConfirmed = true;
    else booking.clientStartConfirmed = true;

    // Both confirmed → officially start the session
    if (booking.vendorStartConfirmed && booking.clientStartConfirmed) {
      booking.status = BookingStatus.IN_PROGRESS;
      booking.sessionStartedAt = new Date();
      booking.statusHistory.push({
        status: BookingStatus.IN_PROGRESS,
        changedAt: new Date(),
        changedBy: new (require('mongoose').Types.ObjectId)(userId),
      });
      await booking.save();
      logger.info(`Session started (both confirmed): ${bookingId}`);
      await notificationHelper.notifyBookingStarted(booking);
      return { booking, waiting: false, waitingFor: null };
    }

    await booking.save();
    const waitingFor = role === 'vendor' ? 'client' : 'vendor';
    logger.info(`Start confirmation by ${role}, waiting for ${waitingFor}: ${bookingId}`);

    // Notify the OTHER party so they know to tap Start Session
    if (role === 'vendor') {
      const clientId = booking.client.toString();
      socketService.sendToUser(clientId, 'booking:start:waiting', {
        bookingId,
        waitingFor: 'client',
        message: 'Your vendor is ready! Please confirm to start the session.',
      });
    } else {
      const vendorId = booking.vendor.toString();
      socketService.sendToUser(vendorId, 'booking:start:waiting', {
        bookingId,
        waitingFor: 'vendor',
        message: 'Your client has confirmed. Please tap Start Session to begin.',
      });
    }

    return { booking, waiting: true, waitingFor };
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
    const clientId = booking.client.toString();
    const vendorId = booking.vendor.toString();

    if (role === 'client') {
      booking.clientMarkedComplete = true;
      await notificationHelper.notifyPartialCompletion(booking, 'vendor', 'client');
      // Real-time: tell vendor to also mark done
      socketService.sendToUser(vendorId, 'booking:completion:waiting', {
        bookingId,
        completedBy: 'client',
        message: 'Your client has confirmed the service is complete. Tap "Mark as Done" to release your payment!',
      });
    } else {
      booking.vendorMarkedComplete = true;
      await notificationHelper.notifyPartialCompletion(booking, 'client', 'vendor');
      // Real-time: tell client to also confirm
      socketService.sendToUser(clientId, 'booking:completion:waiting', {
        bookingId,
        completedBy: 'vendor',
        message: 'Your vendor marked the service complete. Please confirm to release their payment.',
      });
    }

    // Check if both marked complete
    if (booking.clientMarkedComplete && booking.vendorMarkedComplete) {
      booking.status = BookingStatus.COMPLETED;
      booking.completedAt = new Date();
      booking.completedBy = 'both';

      // Fetch vendor for payment and profile updates
      const vendor = await User.findById(booking.vendor);

      let amountToVendor = 0;

      // Release payment to vendor
      if (booking.paymentStatus === 'escrowed') {
        booking.paymentStatus = 'released';

        // Try by paymentId first, then by reference as fallback
        let payment = booking.paymentId
          ? await Payment.findById(booking.paymentId)
          : await Payment.findOne({ reference: booking.paymentReference });

        if (!payment && booking.paymentReference) {
          payment = await Payment.findOne({ reference: booking.paymentReference });
        }

        if (vendor && payment) {
          amountToVendor = payment.vendorAmount ?? (booking.totalAmount - (payment.platformFee ?? 0));

          const previousBalance = vendor.walletBalance || 0;
          const promoBonus = booking.promoApplied ? (booking.promoBonusAmount || 0) : 0;
          vendor.walletBalance = previousBalance + amountToVendor + promoBonus;
          await vendor.save();

          payment.escrowStatus = 'released';
          await payment.save();

          // Notify vendor that payment has actually landed in their wallet
          await notificationHelper.notifyPaymentReceived(payment, vendor._id.toString());

          // Create transaction for vendor earning
          await transactionService.createTransaction({
            userId: vendor._id.toString(),
            type: TransactionType.BOOKING_EARNING,
            amount: amountToVendor,
            description: `Earnings from completed booking #${booking._id.toString().slice(-8)}`,
            booking: booking._id.toString(),
            payment: payment._id.toString(),
          });

          // Credit promo bonus as its own distinct transaction so vendors see it as a
          // separate line item in their wallet history.
          if (promoBonus > 0) {
            await transactionService.createTransaction({
              userId: vendor._id.toString(),
              type: TransactionType.PROMO_BONUS,
              amount: promoBonus,
              description: `Promo bonus for booking #${booking._id.toString().slice(-8)}`,
              booking: booking._id.toString(),
              payment: payment._id.toString(),
            });
            await notificationHelper.notifyPromoBonusEarned(
              vendor._id.toString(),
              booking._id.toString(),
              promoBonus
            );
            logger.info(`🎁 Promo bonus ₦${promoBonus.toLocaleString()} credited to vendor ${vendor._id}`);
          }

          logger.info(`✅ Released ₦${amountToVendor.toLocaleString()} to vendor ${vendor._id}`);
        } else {
          logger.error(`❌ Payment release failed — vendor: ${!!vendor}, payment: ${!!payment}, paymentId: ${booking.paymentId}, ref: ${booking.paymentReference}`);
        }
      }

      // Update service completed bookings count
      const service = await Service.findById(booking.service);
      if (service?.metadata) {
        service.metadata.completedBookings = (service.metadata.completedBookings || 0) + 1;
        await service.save();
      }

      // Update vendor completed bookings count
      if (vendor?.vendorProfile) {
        vendor.vendorProfile.completedBookings = (vendor.vendorProfile.completedBookings || 0) + 1;
        await vendor.save();
      }

      // Process referral if this is client's first booking
      try {
        await referralService.processReferralBooking(booking._id.toString());
      } catch (error: any) {
        logger.error(`Error processing referral for booking ${booking._id}:`, error.message);
      }

      // Push/in-app notifications for both
      await notificationHelper.notifyBookingCompleted(booking, clientId, 'client');
      await notificationHelper.notifyBookingCompleted(booking, vendorId, 'vendor');

      // Real-time socket events for both parties
      socketService.sendToUser(clientId, 'booking:completed', {
        bookingId,
        message: 'Your booking is complete! Thank you for using LookReal.',
      });
      socketService.sendToUser(vendorId, 'booking:completed', {
        bookingId,
        amount: amountToVendor,
        message: `₦${amountToVendor.toLocaleString()} has been credited to your wallet!`,
      });

      logger.info(`✅ Booking fully completed and payment released: ${bookingId}`);
    }

    await booking.save();

    logger.info(`Booking marked complete by ${role}: ${bookingId}`);

    return booking;
  }

  /**
   * Get booking by ID
   */
  public async getBookingById(bookingId: string, userId: string): Promise<any> {
    const booking = await Booking.findById(bookingId)
      .populate('client', 'firstName lastName email phone avatar')
      .populate('vendor', 'firstName lastName email phone vendorProfile avatar')
      .populate({
        path: 'service',
        select: 'name description basePrice images category priceType duration',
        populate: { path: 'category', select: 'name' },
      });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify access
    const isClient = booking.client._id.toString() === userId;
    const isVendor = booking.vendor._id.toString() === userId;

    if (!isClient && !isVendor) {
      throw new ForbiddenError('Not authorized to view this booking');
    }

    const bookingObj = booking.toObject() as any;

    // Compute distance in km for home service bookings
    if (bookingObj.location?.coordinates) {
      const vendorCoords = (bookingObj.vendor as any)?.vendorProfile?.location?.coordinates;
      const clientCoords = bookingObj.location.coordinates; // [lng, lat] GeoJSON
      if (vendorCoords && Array.isArray(vendorCoords) && Array.isArray(clientCoords)) {
        bookingObj.distanceKm = calculateDistance(
          vendorCoords[1], vendorCoords[0], // vendor lat, lng
          clientCoords[1], clientCoords[0]  // client lat, lng
        );
      }
    }

    return bookingObj;
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
        .populate('vendor', 'firstName lastName vendorProfile avatar')
        .populate('service', 'name images basePrice duration')
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
   * Get single booking by ID (Admin)
   */
  public async getAdminBookingById(bookingId: string): Promise<IBooking> {
    const booking = await Booking.findById(bookingId)
      .populate('client', 'firstName lastName email phone avatar')
      .populate('vendor', 'firstName lastName email phone vendorProfile avatar')
      .populate({
        path: 'service',
        select: 'name description basePrice images category priceType duration',
        populate: { path: 'category', select: 'name' },
      })
      .populate('offer', 'title description proposedPrice status expiresAt createdAt');

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    return booking;
  }

  /**
   * Get all bookings (Admin)
   */
  public async getAllBookings(
    filters?: {
      status?: BookingStatus;
      paymentStatus?: string;
      bookingType?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{ bookings: IBooking[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);
    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }
    if (filters?.bookingType) {
      query.bookingType = filters.bookingType;
    }
    if (filters?.startDate || filters?.endDate) {
      query.scheduledDate = {};
      if (filters.startDate) query.scheduledDate.$gte = filters.startDate;
      if (filters.endDate) query.scheduledDate.$lte = filters.endDate;
    }

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('client', 'firstName lastName email phone avatar')
        .populate('vendor', 'firstName lastName email phone vendorProfile avatar')
        .populate({
          path: 'service',
          select: 'name images basePrice category priceType duration',
          populate: { path: 'category', select: 'name' },
        })
        .populate('offer', 'title description proposedPrice status expiresAt createdAt')
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
   * Get all booking statistics (Admin)
   */
  public async getAdminBookingStats(): Promise<any> {
    const [
      total,
      pending,
      accepted,
      inProgress,
      completed,
      cancelled,
    ] = await Promise.all([
      Booking.countDocuments({}),
      Booking.countDocuments({ status: BookingStatus.PENDING }),
      Booking.countDocuments({ status: BookingStatus.ACCEPTED }),
      Booking.countDocuments({ status: BookingStatus.IN_PROGRESS }),
      Booking.countDocuments({ status: BookingStatus.COMPLETED }),
      Booking.countDocuments({ status: BookingStatus.CANCELLED }),
    ]);

    // Calculate total revenue from completed bookings
    const revenueResult = await Booking.aggregate([
      { $match: { status: BookingStatus.COMPLETED } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    return {
      total,
      pending,
      accepted,
      inProgress,
      completed,
      cancelled,
      totalRevenue: revenueResult[0]?.total || 0,
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
   * Admin cancel booking — always issues full refund to client, no penalties
   */
  public async adminCancelBooking(
    bookingId: string,
    adminId: string,
    reason: string
  ): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if ([BookingStatus.COMPLETED, BookingStatus.CANCELLED].includes(booking.status)) {
      throw new BadRequestError('Cannot cancel a completed or already cancelled booking');
    }

    // Process full refund if payment is escrowed
    if (booking.paymentStatus === 'escrowed') {
      const payment = await Payment.findById(booking.paymentId);
      const client = await User.findById(booking.client);

      if (payment && client) {
        await this.processFullRefund(booking, payment, client);
      }
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = adminId as any;
    booking.cancellationReason = `[Admin] ${reason}`;
    await booking.save();

    logger.info(`🛡️ Admin ${adminId} cancelled booking ${bookingId}. Reason: ${reason}`);

    await notificationHelper.notifyBookingCancelled(booking, 'client', reason);

    return booking;
  }

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