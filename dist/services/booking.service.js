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
const Booking_1 = __importDefault(require("../models/Booking"));
const Service_1 = __importDefault(require("../models/Service"));
const User_1 = __importDefault(require("../models/User"));
const Payment_1 = __importDefault(require("../models/Payment"));
const errors_1 = require("../utils/errors");
const types_1 = require("../types");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
const transaction_service_1 = __importDefault(require("./transaction.service"));
const subscription_service_1 = __importDefault(require("./subscription.service"));
const notificationHelper_1 = __importDefault(require("../utils/notificationHelper"));
const referral_service_1 = __importDefault(require("./referral.service"));
const paystackHelper_1 = __importDefault(require("../utils/paystackHelper"));
const socket_service_1 = __importDefault(require("../socket/socket.service"));
const redFlag_service_1 = __importDefault(require("./redFlag.service")); // ✅ NEW: Import RedFlag service
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
    async createBookingWithPayment(clientId, data) {
        // Verify service exists and is active
        const service = await Service_1.default.findById(data.service).populate('vendor');
        if (!service || !service.isActive) {
            throw new errors_1.NotFoundError('Service not found or not available');
        }
        // Verify vendor
        const vendor = await User_1.default.findById(service.vendor);
        if (!vendor || !vendor.isVendor || !vendor.vendorProfile?.isVerified) {
            throw new errors_1.BadRequestError('Vendor is not available');
        }
        // ✅ NEW: Check if vendor is suspended
        if (vendor.vendorProfile?.isSuspended) {
            throw new errors_1.BadRequestError('This vendor is currently unavailable');
        }
        // Check what the CLIENT wants vs what vendor offers
        const clientWantsHomeService = data.serviceType === 'home';
        const vendorOffersHomeService = vendor.vendorProfile.vendorType === 'home_service' ||
            vendor.vendorProfile.vendorType === 'both';
        // Validate service type availability
        if (clientWantsHomeService && !vendorOffersHomeService) {
            throw new errors_1.BadRequestError('This vendor does not offer home service');
        }
        // Calculate pricing
        let distanceCharge = 0;
        let location;
        // Only require location if CLIENT chose home service
        if (clientWantsHomeService) {
            if (!data.location) {
                throw new errors_1.BadRequestError('Location is required for home service');
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
                const distance = (0, helpers_1.calculateDistance)(vendor.vendorProfile.location.coordinates[1], vendor.vendorProfile.location.coordinates[0], data.location.coordinates[1], data.location.coordinates[0]);
                distanceCharge = (0, helpers_1.calculateServiceCharge)(distance);
            }
        }
        const totalAmount = service.basePrice + distanceCharge;
        // Get client
        const client = await User_1.default.findById(clientId);
        if (!client || !client.email) {
            throw new errors_1.NotFoundError('User not found or email not available');
        }
        // Get vendor's commission rate
        const commissionRate = await subscription_service_1.default.getCommissionRate(service.vendor._id?.toString() || service.vendor.toString());
        // Calculate fees
        const platformFee = Math.round((totalAmount * commissionRate) / 100);
        const vendorAmount = totalAmount - platformFee;
        // Generate payment reference
        const reference = `BOOKING-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`;
        // ==================== WALLET PAYMENT ====================
        if (data.paymentMethod === 'wallet') {
            // Check wallet balance BEFORE creating anything
            if ((client.walletBalance || 0) < totalAmount) {
                throw new errors_1.BadRequestError(`Insufficient wallet balance. Your balance: ₦${(client.walletBalance || 0).toLocaleString()}, Required: ₦${totalAmount.toLocaleString()}`);
            }
            // Deduct from wallet FIRST
            const previousBalance = client.walletBalance || 0;
            client.walletBalance = previousBalance - totalAmount;
            await client.save();
            try {
                // Create booking (already paid)
                const booking = await Booking_1.default.create({
                    bookingType: types_1.BookingType.STANDARD,
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
                    status: types_1.BookingStatus.PENDING,
                    clientNotes: data.clientNotes,
                    paymentStatus: 'escrowed', // Already paid!
                    paymentReference: reference,
                    clientMarkedComplete: false,
                    vendorMarkedComplete: false,
                    hasDispute: false,
                    hasReview: false,
                    statusHistory: [
                        {
                            status: types_1.BookingStatus.PENDING,
                            changedAt: new Date(),
                            changedBy: clientId,
                        },
                    ],
                });
                // Create payment record
                const payment = await Payment_1.default.create({
                    user: clientId,
                    booking: booking._id,
                    amount: totalAmount,
                    currency: 'NGN',
                    status: types_1.PaymentStatus.COMPLETED,
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
                await transaction_service_1.default.createTransaction({
                    userId: clientId,
                    type: types_1.TransactionType.BOOKING_PAYMENT,
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
                logger_1.default.info(`✅ Booking created with wallet payment: ${booking._id} by client ${clientId}`);
                // Notify BOTH client and vendor
                await notificationHelper_1.default.notifyBookingCreated(booking);
                await notificationHelper_1.default.notifyPaymentSuccessful(payment, clientId);
                // Emit real-time event
                socket_service_1.default.emitPaymentEvent(clientId, 'booking:created:paid', {
                    bookingId: booking._id.toString(),
                    reference,
                    amount: totalAmount,
                    paymentMethod: 'wallet',
                    newBalance: client.walletBalance,
                });
                return { booking, payment };
            }
            catch (error) {
                // ROLLBACK: Refund wallet if booking creation fails
                client.walletBalance = previousBalance;
                await client.save();
                logger_1.default.error(`❌ Booking creation failed, refunded wallet: ${error}`);
                throw error;
            }
        }
        // ==================== PAYSTACK PAYMENT ====================
        if (data.paymentMethod === 'card') {
            // Create booking in PENDING_PAYMENT state
            const booking = await Booking_1.default.create({
                bookingType: types_1.BookingType.STANDARD,
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
                status: types_1.BookingStatus.PENDING,
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
                        status: types_1.BookingStatus.PENDING,
                        changedAt: new Date(),
                        changedBy: clientId,
                    },
                ],
            });
            // Initialize Paystack payment
            const paymentData = await paystackHelper_1.default.initializePayment(client.email, totalAmount, reference, {
                bookingId: booking._id.toString(),
                clientId: clientId,
                vendorId: booking.vendor.toString(),
                serviceId: booking.service,
                commissionRate,
                platformFee,
                vendorAmount,
                paymentType: 'booking',
            });
            logger_1.default.info(`💳 Paystack payment initialized for new booking: ${reference}`);
            // Don't notify yet - wait for payment confirmation
            // The webhook will handle notifications after successful payment
            return {
                booking,
                payment: null, // Payment record created after webhook confirms
                authorizationUrl: paymentData.authorization_url,
            };
        }
        throw new errors_1.BadRequestError('Invalid payment method. Use "wallet" or "card"');
    }
    /**
     * Verify Paystack payment and activate booking (called from webhook)
     */
    async verifyPaystackPayment(reference) {
        // Verify payment with Paystack
        const paymentData = await paystackHelper_1.default.verifyPayment(reference);
        if (paymentData.status !== 'success') {
            throw new errors_1.BadRequestError('Payment verification failed');
        }
        // Get booking
        const booking = await Booking_1.default.findOne({ paymentReference: reference });
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found for this payment');
        }
        // Check if already processed
        if (booking.paymentStatus === 'escrowed') {
            logger_1.default.warn(`Payment ${reference} already processed for booking ${booking._id}`);
            return { booking, payment: await Payment_1.default.findOne({ reference }) };
        }
        // Get metadata from Paystack
        const metadata = paymentData.metadata || {};
        const commissionRate = metadata.commissionRate ||
            await subscription_service_1.default.getCommissionRate(booking.vendor.toString());
        const platformFee = metadata.platformFee || Math.round((booking.totalAmount * commissionRate) / 100);
        const vendorAmount = metadata.vendorAmount || (booking.totalAmount - platformFee);
        // Convert from kobo to naira
        const amount = paymentData.amount / 100;
        // Create payment record
        const payment = await Payment_1.default.create({
            user: booking.client,
            booking: booking._id,
            amount: amount,
            currency: paymentData.currency,
            status: types_1.PaymentStatus.COMPLETED,
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
        await transaction_service_1.default.createTransaction({
            userId: booking.client.toString(),
            type: types_1.TransactionType.BOOKING_PAYMENT,
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
        const service = await Service_1.default.findById(booking.service);
        if (service && service.metadata) {
            service.metadata.bookings = (service.metadata.bookings || 0) + 1;
            await service.save();
        }
        logger_1.default.info(`✅ Paystack payment verified, booking activated: ${booking._id}`);
        // NOW notify both parties
        await notificationHelper_1.default.notifyBookingCreated(booking);
        await notificationHelper_1.default.notifyPaymentSuccessful(payment, booking.client.toString());
        await notificationHelper_1.default.notifyPaymentReceived(payment, booking.vendor.toString());
        // Emit real-time event to client
        socket_service_1.default.emitPaymentEvent(booking.client.toString(), 'booking:created:paid', {
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
    async handleFailedPaystackPayment(reference, reason) {
        const booking = await Booking_1.default.findOne({ paymentReference: reference });
        if (booking && booking.paymentStatus === 'pending') {
            // Delete the unpaid booking
            await Booking_1.default.findByIdAndDelete(booking._id);
            logger_1.default.error(`❌ Payment failed, booking deleted: ${booking._id} - ${reason || 'Unknown reason'}`);
            // Notify client about failed payment
            socket_service_1.default.emitPaymentEvent(booking.client.toString(), 'booking:payment:failed', {
                bookingId: booking._id.toString(),
                reference,
                reason: reason || 'Payment failed or expired',
            });
        }
    }
    /**
     * Cleanup expired unpaid bookings (run via cron job)
     */
    async cleanupExpiredBookings() {
        const expiredBookings = await Booking_1.default.find({
            paymentStatus: 'pending',
            paymentExpiresAt: { $lt: new Date() },
        });
        for (const booking of expiredBookings) {
            await Booking_1.default.findByIdAndDelete(booking._id);
            logger_1.default.info(`🗑️ Deleted expired unpaid booking: ${booking._id}`);
        }
        return expiredBookings.length;
    }
    /**
     * Preview booking price (calculate total including distance charge)
     * Call this BEFORE creating booking to show user the exact amount
     */
    async previewBookingPrice(data) {
        // Get service with vendor
        const service = await Service_1.default.findById(data.serviceId).populate('vendor');
        if (!service || !service.isActive) {
            throw new errors_1.NotFoundError('Service not found or not available');
        }
        const vendor = await User_1.default.findById(service.vendor);
        if (!vendor || !vendor.isVendor) {
            throw new errors_1.BadRequestError('Vendor not available');
        }
        const servicePrice = service.basePrice;
        let distanceCharge = 0;
        let distance;
        // Calculate distance charge only for home service
        if (data.serviceType === 'home' && data.location?.coordinates && vendor.vendorProfile?.location?.coordinates) {
            distance = (0, helpers_1.calculateDistance)(vendor.vendorProfile.location.coordinates[1], // vendor lat
            vendor.vendorProfile.location.coordinates[0], // vendor lng
            data.location.coordinates[1], // client lat
            data.location.coordinates[0] // client lng
            );
            distanceCharge = (0, helpers_1.calculateServiceCharge)(distance);
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
    async cancelBooking(bookingId, userId, reason) {
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify ownership
        const isClient = booking.client.toString() === userId;
        const isVendor = booking.vendor.toString() === userId;
        if (!isClient && !isVendor) {
            throw new errors_1.ForbiddenError('Not authorized to cancel this booking');
        }
        if ([types_1.BookingStatus.COMPLETED, types_1.BookingStatus.CANCELLED, types_1.BookingStatus.IN_PROGRESS].includes(booking.status)) {
            throw new errors_1.BadRequestError('Cannot cancel in-progress, completed or already cancelled bookings');
        }
        // Calculate time until appointment
        const now = new Date();
        const appointmentDateTime = this.getAppointmentDateTime(booking);
        const minutesUntilAppointment = Math.floor((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60));
        // ✅ DETAILED DEBUG LOGGING
        logger_1.default.info(`📅 ========================================`);
        logger_1.default.info(`📅 CANCELLATION REQUEST DEBUG`);
        logger_1.default.info(`📅 ========================================`);
        logger_1.default.info(`📅 Booking ID: ${bookingId}`);
        logger_1.default.info(`📅 Current time (UTC): ${now.toISOString()}`);
        logger_1.default.info(`📅 Scheduled Date (raw): ${booking.scheduledDate}`);
        logger_1.default.info(`📅 Scheduled Time (local WAT): ${booking.scheduledTime}`);
        logger_1.default.info(`📅 Appointment DateTime (UTC): ${appointmentDateTime.toISOString()}`);
        logger_1.default.info(`📅 Minutes until appointment: ${minutesUntilAppointment}`);
        logger_1.default.info(`📅 Penalty window threshold: ${CLIENT_CANCELLATION_PENALTY_WINDOW_MINUTES} minutes`);
        logger_1.default.info(`📅 Is within penalty window? ${minutesUntilAppointment < CLIENT_CANCELLATION_PENALTY_WINDOW_MINUTES}`);
        logger_1.default.info(`📅 Cancelled by: ${isClient ? 'CLIENT' : 'VENDOR'}`);
        logger_1.default.info(`📅 ========================================`);
        // ==================== CLIENT CANCELLATION POLICY ====================
        if (isClient) {
            await this.handleClientCancellation(booking, minutesUntilAppointment, reason);
        }
        // ==================== VENDOR CANCELLATION POLICY ====================
        if (isVendor) {
            await this.handleVendorCancellation(booking, minutesUntilAppointment, reason);
        }
        // Update booking status
        booking.status = types_1.BookingStatus.CANCELLED;
        booking.cancelledAt = new Date();
        booking.cancelledBy = userId;
        booking.cancellationReason = reason;
        await booking.save();
        logger_1.default.info(`✅ Booking cancelled: ${bookingId} by ${isClient ? 'client' : 'vendor'} ${userId}`);
        // Notify BOTH parties
        const cancelledByRole = isClient ? 'client' : 'vendor';
        await notificationHelper_1.default.notifyBookingCancelled(booking, cancelledByRole, reason);
        return booking;
    }
    /**
     * Handle client cancellation with penalty logic
     */
    async handleClientCancellation(booking, minutesUntilAppointment, _reason) {
        const payment = await Payment_1.default.findById(booking.paymentId);
        logger_1.default.info(`💳 Payment check: ${payment ? 'Found' : 'Not found'}`);
        logger_1.default.info(`💳 Payment status: ${booking.paymentStatus}`);
        if (!payment || booking.paymentStatus !== 'escrowed') {
            logger_1.default.info('⚠️ No escrowed payment to process for cancellation');
            return;
        }
        const client = await User_1.default.findById(booking.client);
        const vendor = await User_1.default.findById(booking.vendor);
        if (!client) {
            logger_1.default.error(`❌ Client not found for booking ${booking._id}`);
            return;
        }
        logger_1.default.info(`💰 Payment amount: ₦${payment.amount}`);
        logger_1.default.info(`💰 Checking penalty condition: ${minutesUntilAppointment} < ${CLIENT_CANCELLATION_PENALTY_WINDOW_MINUTES}`);
        // ✅ Check if within penalty window (less than 59 minutes before appointment)
        // Also apply penalty if appointment time has passed (negative minutes)
        const shouldApplyPenalty = minutesUntilAppointment < CLIENT_CANCELLATION_PENALTY_WINDOW_MINUTES;
        logger_1.default.info(`💰 Should apply penalty? ${shouldApplyPenalty}`);
        if (shouldApplyPenalty) {
            // ==================== APPLY PENALTY ====================
            logger_1.default.info(`⚠️ ========================================`);
            logger_1.default.info(`⚠️ APPLYING ${CLIENT_PENALTY_PERCENTAGE}% CANCELLATION PENALTY`);
            logger_1.default.info(`⚠️ ========================================`);
            const totalAmount = payment.amount;
            // Calculate penalty (20% of total amount)
            const penaltyAmount = Math.round((totalAmount * CLIENT_PENALTY_PERCENTAGE) / 100);
            // Platform keeps its commission from the penalty
            const platformFeeFromPenalty = Math.round((penaltyAmount * (payment.commissionRate || 0)) / 100);
            const vendorPenaltyShare = penaltyAmount - platformFeeFromPenalty;
            // Client refund = total - penalty
            const clientRefund = totalAmount - penaltyAmount;
            logger_1.default.info(`💰 Total amount: ₦${totalAmount}`);
            logger_1.default.info(`💰 Penalty (${CLIENT_PENALTY_PERCENTAGE}%): ₦${penaltyAmount}`);
            logger_1.default.info(`💰 Platform fee from penalty: ₦${platformFeeFromPenalty}`);
            logger_1.default.info(`💰 Vendor penalty share: ₦${vendorPenaltyShare}`);
            logger_1.default.info(`💰 Client refund: ₦${clientRefund}`);
            // Credit vendor their penalty share
            if (vendor) {
                const vendorPrevBalance = vendor.walletBalance || 0;
                vendor.walletBalance = vendorPrevBalance + vendorPenaltyShare;
                await vendor.save();
                // Create transaction for vendor penalty payment
                await transaction_service_1.default.createTransaction({
                    userId: vendor._id.toString(),
                    type: types_1.TransactionType.CANCELLATION_PENALTY,
                    amount: vendorPenaltyShare,
                    description: `Cancellation penalty from booking #${booking._id.toString().slice(-8)} (${CLIENT_PENALTY_PERCENTAGE}% penalty, after platform fee)`,
                    booking: booking._id.toString(),
                    payment: payment._id.toString(),
                });
                logger_1.default.info(`✅ Vendor received ₦${vendorPenaltyShare.toLocaleString()} cancellation penalty`);
                logger_1.default.info(`✅ Vendor new balance: ₦${vendor.walletBalance}`);
                // Notify vendor about penalty received
                await notificationHelper_1.default.sendNotification(vendor._id.toString(), 'Cancellation Penalty Received', `You received ₦${vendorPenaltyShare.toLocaleString()} from a late cancellation`, 'payment', { bookingId: booking._id.toString(), amount: vendorPenaltyShare });
            }
            // Refund client the remaining amount (PARTIAL REFUND)
            const clientPrevBalance = client.walletBalance || 0;
            client.walletBalance = clientPrevBalance + clientRefund;
            await client.save();
            logger_1.default.info(`✅ Client refunded ₦${clientRefund.toLocaleString()} (after ${CLIENT_PENALTY_PERCENTAGE}% penalty)`);
            logger_1.default.info(`✅ Client new balance: ₦${client.walletBalance}`);
            // Create refund transaction for client
            await transaction_service_1.default.createTransaction({
                userId: booking.client.toString(),
                type: types_1.TransactionType.REFUND,
                amount: clientRefund,
                description: `Partial refund for cancelled booking #${booking._id.toString().slice(-8)} (${CLIENT_PENALTY_PERCENTAGE}% penalty applied)`,
                booking: booking._id.toString(),
                payment: payment._id.toString(),
            });
            // Update payment status
            payment.status = types_1.PaymentStatus.PARTIALLY_REFUND;
            payment.refundAmount = clientRefund;
            payment.penaltyAmount = penaltyAmount;
            payment.refundedAt = new Date();
            payment.refundReason = `Late cancellation - ${CLIENT_PENALTY_PERCENTAGE}% penalty applied`;
            await payment.save();
            // ✅ Update booking with penalty info
            booking.paymentStatus = 'partially_refunded';
            booking.cancellationPenalty = penaltyAmount;
            // Notify client about partial refund
            await notificationHelper_1.default.notifyRefundProcessed(payment, booking.client.toString(), `Partial refund of ₦${clientRefund.toLocaleString()} (${CLIENT_PENALTY_PERCENTAGE}% cancellation penalty applied)`);
            socket_service_1.default.emitPaymentEvent(booking.client.toString(), 'booking:cancelled:penalty', {
                bookingId: booking._id.toString(),
                refundAmount: clientRefund,
                penaltyAmount: penaltyAmount,
                newBalance: client.walletBalance,
                reason: `Cancellation within ${CLIENT_CANCELLATION_PENALTY_WINDOW_MINUTES} minutes of appointment`,
            });
            logger_1.default.info(`⚠️ ========================================`);
            logger_1.default.info(`⚠️ PENALTY APPLIED SUCCESSFULLY`);
            logger_1.default.info(`⚠️ ========================================`);
        }
        else {
            // ==================== FULL REFUND ====================
            logger_1.default.info(`✅ ========================================`);
            logger_1.default.info(`✅ PROCESSING FULL REFUND (outside penalty window)`);
            logger_1.default.info(`✅ ========================================`);
            await this.processFullRefund(booking, payment, client);
        }
        // ✅ NEW: Check for frequent cancellation pattern
        try {
            await redFlag_service_1.default.detectClientFrequentCancellations(booking.client.toString());
        }
        catch (error) {
            logger_1.default.error(`Error checking client cancellation pattern: ${error}`);
        }
    }
    /**
     * Handle vendor cancellation with red flag logic
     * ✅ UPDATED: Now uses RedFlag service
     */
    async handleVendorCancellation(booking, minutesUntilAppointment, reason) {
        // Check if within red flag window (less than 3 hours 59 minutes before appointment)
        if (minutesUntilAppointment < VENDOR_RED_FLAG_WINDOW_MINUTES) {
            logger_1.default.warn(`🚩 VENDOR RED FLAG: Cancellation within ${VENDOR_RED_FLAG_WINDOW_MINUTES} min window`);
            // ✅ NEW: Use RedFlag service instead of inline creation
            try {
                await redFlag_service_1.default.detectVendorLateCancellation(booking._id.toString(), booking.vendor.toString(), minutesUntilAppointment, reason);
            }
            catch (error) {
                logger_1.default.error(`Error creating vendor red flag: ${error}`);
                // Fall back to old method if RedFlag service fails
                const vendor = await User_1.default.findById(booking.vendor);
                await this.createVendorRedFlagLegacy(booking, vendor, minutesUntilAppointment, reason);
            }
        }
        // Process full refund to client
        if (booking.paymentStatus === 'escrowed') {
            const payment = await Payment_1.default.findById(booking.paymentId);
            const client = await User_1.default.findById(booking.client);
            if (payment && client) {
                await this.processFullRefund(booking, payment, client);
            }
        }
    }
    /**
     * Legacy red flag creation (fallback if RedFlag service fails)
     * @deprecated Use redFlagService.detectVendorLateCancellation instead
     */
    async createVendorRedFlagLegacy(booking, vendor, minutesUntilAppointment, reason) {
        const service = await Service_1.default.findById(booking.service);
        const client = await User_1.default.findById(booking.client);
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
        await notificationHelper_1.default.notifyAdmins('🚩 Vendor Red Flag - Late Cancellation', `Vendor "${vendor?.vendorProfile?.businessName || vendor?.firstName}" cancelled booking #${booking._id.toString().slice(-8)} only ${minutesUntilAppointment} minutes before the appointment. Reason: ${reason || 'Not provided'}`, 'red_flag', redFlagData);
        logger_1.default.warn(`🚩 Red flag created for vendor ${booking.vendor}: cancelled ${minutesUntilAppointment} min before appointment`);
    }
    /**
     * Process full refund to client
     */
    async processFullRefund(booking, payment, client) {
        const previousBalance = client.walletBalance || 0;
        client.walletBalance = previousBalance + payment.amount;
        await client.save();
        // Create refund transaction
        await transaction_service_1.default.createTransaction({
            userId: booking.client.toString(),
            type: types_1.TransactionType.REFUND,
            amount: payment.amount,
            description: `Full refund for cancelled booking #${booking._id.toString().slice(-8)}`,
            booking: booking._id.toString(),
            payment: payment._id.toString(),
        });
        // Update payment status
        payment.status = types_1.PaymentStatus.REFUNDED;
        payment.refundAmount = payment.amount;
        payment.refundedAt = new Date();
        await payment.save();
        booking.paymentStatus = 'refunded';
        // Notify client about refund
        await notificationHelper_1.default.notifyRefundProcessed(payment, booking.client.toString(), 'Full refund processed to your wallet');
        socket_service_1.default.emitPaymentEvent(booking.client.toString(), 'booking:refund:success', {
            bookingId: booking._id.toString(),
            amount: payment.amount,
            newBalance: client.walletBalance,
            previousBalance: previousBalance,
            paymentMethod: payment.paymentMethod,
            message: 'Full refund processed to your wallet',
        });
        logger_1.default.info(`💰 Full refund of ₦${payment.amount.toLocaleString()} to client ${booking.client}`);
    }
    /**
     * Get appointment date/time as a single Date object (in UTC)
     * ✅ FIXED: Properly handles Nigeria timezone (WAT = UTC+1)
     *
     * scheduledTime is stored in LOCAL time (Nigeria WAT)
     * We convert it to UTC for comparison with server time
     */
    getAppointmentDateTime(booking) {
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
                    }
                    else if (meridiem.toUpperCase() === 'AM' && hours === 12) {
                        hours = 0;
                    }
                }
                // Set the time in UTC
                appointmentDate.setUTCHours(hours, minutes, 0, 0);
                // ✅ TIMEZONE FIX: Convert from Nigeria local time (WAT) to UTC
                // WAT is UTC+1, so subtract 1 hour to get UTC
                appointmentDate.setTime(appointmentDate.getTime() - (NIGERIA_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000));
                logger_1.default.info(`🕐 Time ${booking.scheduledTime} WAT = ${appointmentDate.toISOString()} UTC`);
            }
            else {
                logger_1.default.warn(`⚠️ Could not parse scheduledTime: "${booking.scheduledTime}"`);
                // Default to end of day if time can't be parsed
                appointmentDate.setUTCHours(22, 59, 0, 0); // 23:59 WAT = 22:59 UTC
            }
        }
        else {
            logger_1.default.warn(`⚠️ No scheduledTime provided, using end of day`);
            // If no time specified, assume end of day in local time
            appointmentDate.setUTCHours(22, 59, 0, 0); // 23:59 WAT = 22:59 UTC
        }
        return appointmentDate;
    }
    // ==================== EXISTING METHODS (Updated) ====================
    /**
     * Accept booking (Vendor)
     */
    async acceptBooking(bookingId, vendorId) {
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify ownership
        if (booking.vendor.toString() !== vendorId) {
            throw new errors_1.ForbiddenError('You can only accept your own bookings');
        }
        // Check status
        if (booking.status !== types_1.BookingStatus.PENDING) {
            throw new errors_1.BadRequestError('Only pending bookings can be accepted');
        }
        // Check payment - MUST be escrowed now
        if (booking.paymentStatus !== 'escrowed') {
            throw new errors_1.BadRequestError('Payment must be completed before accepting');
        }
        booking.status = types_1.BookingStatus.ACCEPTED;
        booking.acceptedAt = new Date();
        await booking.save();
        logger_1.default.info(`Booking accepted: ${bookingId} by vendor ${vendorId}`);
        // Notify BOTH client and vendor
        await notificationHelper_1.default.notifyBookingAccepted(booking);
        return booking;
    }
    /**
     * Reject booking (Vendor)
     * ✅ UPDATED: Now uses RedFlag service
     */
    async rejectBooking(bookingId, vendorId, reason) {
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify ownership
        if (booking.vendor.toString() !== vendorId) {
            throw new errors_1.ForbiddenError('You can only reject your own bookings');
        }
        // Check status
        if (booking.status !== types_1.BookingStatus.PENDING) {
            throw new errors_1.BadRequestError('Only pending bookings can be rejected');
        }
        booking.status = types_1.BookingStatus.CANCELLED;
        booking.rejectedAt = new Date();
        booking.cancelledBy = vendorId;
        booking.cancellationReason = reason || 'Rejected by vendor';
        // Calculate time until appointment for potential red flag
        const appointmentDateTime = this.getAppointmentDateTime(booking);
        const minutesUntilAppointment = Math.floor((appointmentDateTime.getTime() - Date.now()) / (1000 * 60));
        // Check if rejection is within red flag window
        if (minutesUntilAppointment < VENDOR_RED_FLAG_WINDOW_MINUTES && minutesUntilAppointment > 0) {
            // ✅ NEW: Use RedFlag service
            try {
                await redFlag_service_1.default.detectVendorLateCancellation(booking._id.toString(), vendorId, minutesUntilAppointment, reason);
            }
            catch (error) {
                logger_1.default.error(`Error creating vendor red flag for rejection: ${error}`);
                // Fallback to legacy method
                const vendor = await User_1.default.findById(vendorId);
                await this.createVendorRedFlagLegacy(booking, vendor, minutesUntilAppointment, reason);
            }
        }
        // Full refund to client if payment was escrowed
        if (booking.paymentStatus === 'escrowed') {
            const payment = await Payment_1.default.findById(booking.paymentId);
            const client = await User_1.default.findById(booking.client);
            if (payment && client) {
                await this.processFullRefund(booking, payment, client);
            }
        }
        await booking.save();
        logger_1.default.info(`Booking rejected: ${bookingId} by vendor ${vendorId}`);
        // Notify BOTH client and vendor
        await notificationHelper_1.default.notifyBookingRejected(booking, reason);
        return booking;
    }
    /**
     * Start booking (move to in progress)
     */
    async startBooking(bookingId, vendorId) {
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify ownership
        if (booking.vendor.toString() !== vendorId) {
            throw new errors_1.ForbiddenError('Only the vendor can start this booking');
        }
        // Check status
        if (booking.status !== types_1.BookingStatus.ACCEPTED) {
            throw new errors_1.BadRequestError('Only accepted bookings can be started');
        }
        booking.status = types_1.BookingStatus.IN_PROGRESS;
        await booking.save();
        logger_1.default.info(`Booking started: ${bookingId}`);
        // Notify BOTH client and vendor
        await notificationHelper_1.default.notifyBookingStarted(booking);
        return booking;
    }
    /**
     * Mark booking as complete (by client or vendor)
     */
    async markComplete(bookingId, userId, role) {
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify ownership
        if (role === 'client' && booking.client.toString() !== userId) {
            throw new errors_1.ForbiddenError('Not authorized');
        }
        if (role === 'vendor' && booking.vendor.toString() !== userId) {
            throw new errors_1.ForbiddenError('Not authorized');
        }
        // Check status
        if (![types_1.BookingStatus.ACCEPTED, types_1.BookingStatus.IN_PROGRESS].includes(booking.status)) {
            throw new errors_1.BadRequestError('Only accepted or in-progress bookings can be completed');
        }
        // Mark as complete
        if (role === 'client') {
            booking.clientMarkedComplete = true;
            await notificationHelper_1.default.notifyPartialCompletion(booking, 'vendor', 'client');
        }
        else {
            booking.vendorMarkedComplete = true;
            await notificationHelper_1.default.notifyPartialCompletion(booking, 'client', 'vendor');
        }
        // Check if both marked complete
        if (booking.clientMarkedComplete && booking.vendorMarkedComplete) {
            booking.status = types_1.BookingStatus.COMPLETED;
            booking.completedAt = new Date();
            booking.completedBy = 'both';
            // Fetch vendor for payment and profile updates
            const vendor = await User_1.default.findById(booking.vendor);
            // Release payment to vendor
            if (booking.paymentStatus === 'escrowed') {
                booking.paymentStatus = 'released';
                const payment = await Payment_1.default.findById(booking.paymentId);
                if (vendor && payment) {
                    const amountToVendor = payment.vendorAmount;
                    const previousBalance = vendor.walletBalance || 0;
                    vendor.walletBalance = previousBalance + amountToVendor;
                    await vendor.save();
                    // Create transaction for vendor earning
                    await transaction_service_1.default.createTransaction({
                        userId: vendor._id.toString(),
                        type: types_1.TransactionType.BOOKING_EARNING,
                        amount: amountToVendor,
                        description: `Earnings from completed booking #${booking._id.toString().slice(-8)} (after ${payment.commissionRate}% platform fee)`,
                        booking: booking._id.toString(),
                        payment: payment._id.toString(),
                    });
                    logger_1.default.info(`Released payment of ₦${amountToVendor.toLocaleString()} to vendor ${vendor._id}`);
                }
            }
            // Update service completed bookings count
            const service = await Service_1.default.findById(booking.service);
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
                await referral_service_1.default.processReferralBooking(booking._id.toString());
            }
            catch (error) {
                logger_1.default.error(`Error processing referral for booking ${booking._id}:`, error.message);
            }
            // Notify BOTH that booking is fully completed
            await notificationHelper_1.default.notifyBookingCompleted(booking, booking.client.toString(), 'client');
            await notificationHelper_1.default.notifyBookingCompleted(booking, booking.vendor.toString(), 'vendor');
        }
        await booking.save();
        logger_1.default.info(`Booking marked complete by ${role}: ${bookingId}`);
        return booking;
    }
    /**
     * Get booking by ID
     */
    async getBookingById(bookingId, userId) {
        const booking = await Booking_1.default.findById(bookingId)
            .populate('client', 'firstName lastName email phone avatar')
            .populate('vendor', 'firstName lastName email phone vendorProfile')
            .populate('service', 'name description basePrice images');
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify access
        const isClient = booking.client._id.toString() === userId;
        const isVendor = booking.vendor._id.toString() === userId;
        if (!isClient && !isVendor) {
            throw new errors_1.ForbiddenError('Not authorized to view this booking');
        }
        return booking;
    }
    /**
     * Get user bookings
     */
    async getUserBookings(userId, role, filters, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = role === 'client' ? { client: userId } : { vendor: userId };
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
            Booking_1.default.find(query)
                .populate('client', 'firstName lastName avatar')
                .populate('vendor', 'firstName lastName vendorProfile.businessName avatar')
                .populate('service', 'name images basePrice')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Booking_1.default.countDocuments(query),
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
    async getBookingStats(userId, role) {
        const query = role === 'client' ? { client: userId } : { vendor: userId };
        // Exclude unpaid bookings
        query.paymentStatus = { $ne: 'pending' };
        const [total, pending, accepted, inProgress, completed, cancelled,] = await Promise.all([
            Booking_1.default.countDocuments(query),
            Booking_1.default.countDocuments({ ...query, status: types_1.BookingStatus.PENDING }),
            Booking_1.default.countDocuments({ ...query, status: types_1.BookingStatus.ACCEPTED }),
            Booking_1.default.countDocuments({ ...query, status: types_1.BookingStatus.IN_PROGRESS }),
            Booking_1.default.countDocuments({ ...query, status: types_1.BookingStatus.COMPLETED }),
            Booking_1.default.countDocuments({ ...query, status: types_1.BookingStatus.CANCELLED }),
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
    async updateBooking(bookingId, userId, updates) {
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify ownership
        const isClient = booking.client.toString() === userId;
        const isVendor = booking.vendor.toString() === userId;
        if (!isClient && !isVendor) {
            throw new errors_1.ForbiddenError('Not authorized');
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
    async getVendorRedFlags(filters, page = 1, limit = 20) {
        // Use the new RedFlag service for comprehensive red flag data
        try {
            const { RedFlagType } = await Promise.resolve().then(() => __importStar(require('../models/RedFlag')));
            return await redFlag_service_1.default.getRedFlags({
                type: RedFlagType.VENDOR_LATE_CANCELLATION,
                severity: filters?.severity?.toLowerCase(),
                flaggedUserId: filters?.vendorId,
                startDate: filters?.startDate,
                endDate: filters?.endDate,
            }, page, limit);
        }
        catch (error) {
            // Fallback to legacy method if RedFlag service fails
            logger_1.default.warn('RedFlag service unavailable, using legacy method');
            return this.getVendorRedFlagsLegacy({
                vendorId: filters?.vendorId,
                severity: filters?.severity === 'HIGH' || filters?.severity === 'MEDIUM'
                    ? filters.severity
                    : undefined,
                startDate: filters?.startDate,
                endDate: filters?.endDate,
            }, page, limit);
        }
    }
    /**
     * Legacy vendor red flags query
     * @deprecated Use redFlagService.getRedFlags instead
     */
    async getVendorRedFlagsLegacy(filters, page = 1, limit = 20) {
        const query = {
            'vendorProfile.redFlagCount': { $gt: 0 },
        };
        if (filters?.vendorId) {
            query._id = filters.vendorId;
        }
        const vendors = await User_1.default.find(query)
            .select('firstName lastName email vendorProfile.businessName vendorProfile.redFlagCount vendorProfile.lastRedFlagAt')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ 'vendorProfile.lastRedFlagAt': -1 });
        const total = await User_1.default.countDocuments(query);
        return {
            vendors,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
}
exports.default = new BookingService();
//# sourceMappingURL=booking.service.js.map