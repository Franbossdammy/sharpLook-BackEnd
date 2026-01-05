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
const Payment_1 = __importDefault(require("../models/Payment"));
const Booking_1 = __importDefault(require("../models/Booking"));
const Order_1 = __importStar(require("../models/Order"));
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const subscription_service_1 = __importDefault(require("./subscription.service"));
const transaction_service_1 = __importDefault(require("./transaction.service"));
const errors_1 = require("../utils/errors");
const types_1 = require("../types");
const config_1 = __importDefault(require("../config"));
const helpers_1 = require("../utils/helpers");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../utils/logger"));
const notificationHelper_1 = __importDefault(require("../utils/notificationHelper"));
class PaymentService {
    constructor() {
        this.paystackSecretKey = config_1.default.paystack.secretKey;
        this.paystackBaseUrl = 'https://api.paystack.co';
    }
    // ==================== BOOKING PAYMENT METHODS ====================
    /**
     * Initialize payment for booking
     */
    async initializePayment(userId, bookingId, metadata) {
        // Get booking
        const booking = await Booking_1.default.findById(bookingId).populate('service');
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify ownership
        if (booking.client.toString() !== userId) {
            throw new errors_1.BadRequestError('You can only pay for your own bookings');
        }
        // Check if already paid
        if (booking.paymentStatus === 'escrowed') {
            throw new errors_1.BadRequestError('This booking has already been paid');
        }
        // Get user
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Get vendor's commission rate from subscription
        const commissionRate = await subscription_service_1.default.getCommissionRate(booking.vendor.toString());
        // Calculate fees
        const platformFee = Math.round((booking.totalAmount * commissionRate) / 100);
        const vendorAmount = booking.totalAmount - platformFee;
        // Generate payment reference
        const reference = `PAY-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`;
        // Initialize Paystack payment
        const paystackResponse = await axios_1.default.post(`${this.paystackBaseUrl}/transaction/initialize`, {
            email: user.email,
            amount: booking.totalAmount * 100, // Convert to kobo
            reference,
            currency: 'NGN',
            callback_url: `sharpLook://bookings/${bookingId}/payment/verify`,
            metadata: {
                bookingId: booking._id.toString(),
                userId: user._id.toString(),
                type: 'booking',
                ...metadata,
            },
        }, {
            headers: {
                Authorization: `Bearer ${this.paystackSecretKey}`,
                'Content-Type': 'application/json',
            },
        });
        const { authorization_url, access_code } = paystackResponse.data.data;
        // Create payment record
        const payment = await Payment_1.default.create({
            user: userId,
            booking: bookingId,
            amount: booking.totalAmount,
            currency: 'NGN',
            status: types_1.PaymentStatus.PENDING,
            paymentMethod: 'card',
            reference,
            initiatedAt: new Date(),
            escrowStatus: 'pending',
            commissionRate,
            platformFee,
            vendorAmount,
        });
        // Update booking
        booking.paymentId = payment._id;
        booking.paymentReference = reference;
        await booking.save();
        logger_1.default.info(`Payment initialized: ${reference} for booking ${bookingId}`);
        return {
            payment,
            authorizationUrl: authorization_url,
            accessCode: access_code,
        };
    }
    /**
     * Verify Paystack payment webhook
     */
    verifyWebhookSignature(payload, signature) {
        const hash = crypto_1.default
            .createHmac('sha512', this.paystackSecretKey)
            .update(payload)
            .digest('hex');
        return hash === signature;
    }
    /**
     * Handle Paystack webhook
     */
    // ==================== FIX FOR YOUR payment.service.ts ====================
    // REPLACE your handlePaystackWebhook method with this:
    /**
     * Handle Paystack webhook
     */
    async handlePaystackWebhook(event) {
        const { event: eventType, data } = event;
        console.log('📩 Paystack webhook received:', eventType);
        console.log('📦 Webhook data:', JSON.stringify(data, null, 2));
        if (eventType === 'charge.success') {
            console.log('✅ Routing to handleSuccessfulPayment');
            await this.handleSuccessfulPayment(data);
            console.log('✅ handleSuccessfulPayment completed');
        }
        else if (eventType === 'transfer.success') {
            await this.handleSuccessfulTransfer(data);
        }
        else if (eventType === 'transfer.failed') {
            await this.handleFailedTransfer(data);
        }
        else {
            logger_1.default.info(`ℹ️ Unhandled webhook event: ${eventType}`);
        }
    }
    // ==================== YOUR handleSuccessfulPayment IS ALREADY GOOD! ====================
    // BUT ADD THESE LOGS TO DEBUG:
    async handleSuccessfulPayment(data) {
        const { reference, authorization } = data;
        console.log('🔍 Processing payment for reference:', reference);
        // Find payment
        const payment = await Payment_1.default.findOne({ reference });
        if (!payment) {
            logger_1.default.error(`❌ Payment not found for reference: ${reference}`);
            console.log('❌ No payment record found in database');
            return;
        }
        console.log('✅ Payment found:', payment._id);
        console.log('📋 Payment type:', payment.metadata?.type);
        console.log('📋 Has booking:', !!payment.booking);
        console.log('📋 Has order:', !!payment.order);
        // Check if it's a wallet funding payment
        if (payment.metadata?.type === 'wallet_funding') {
            console.log('💰 Processing wallet funding...');
            const walletFundingService = require('./wallet-funding.service').default;
            await walletFundingService.processWalletFundingWebhook(data);
            return;
        }
        // Update payment
        payment.status = types_1.PaymentStatus.COMPLETED;
        payment.escrowStatus = 'held';
        payment.paidAt = new Date();
        payment.escrowedAt = new Date();
        payment.paystackReference = reference;
        payment.authorizationCode = authorization?.authorization_code;
        await payment.save();
        console.log('✅ Payment record updated to COMPLETED');
        // ✅ CREATE TRANSACTION FOR CLIENT PAYMENT
        const user = await User_1.default.findById(payment.user);
        if (user) {
            const balanceBefore = user.walletBalance || 0;
            const balanceAfter = balanceBefore;
            await Transaction_1.default.create({
                user: payment.user,
                type: payment.booking ? types_1.TransactionType.BOOKING_PAYMENT : types_1.TransactionType.ORDER_PAYMENT,
                amount: payment.amount,
                balanceBefore,
                balanceAfter,
                status: types_1.PaymentStatus.COMPLETED,
                reference: `TXN-PAY-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
                description: payment.booking
                    ? `Payment for booking #${payment.booking.toString().slice(-8)}`
                    : `Payment for order #${payment.order?.toString().slice(-8)}`,
                booking: payment.booking,
                order: payment.order,
                payment: payment._id,
                metadata: {
                    paymentMethod: 'card',
                    paystackReference: reference,
                    escrowStatus: 'held',
                },
            });
            console.log('✅ Transaction created for client payment');
        }
        // ⚠️ CRITICAL: Update booking if exists
        if (payment.booking) {
            console.log('📋 Processing booking payment...');
            console.log('📋 Booking ID:', payment.booking);
            const booking = await Booking_1.default.findById(payment.booking);
            if (booking) {
                console.log('📋 Current booking payment status:', booking.paymentStatus);
                booking.paymentStatus = 'escrowed';
                await booking.save();
                console.log('✅✅✅ BOOKING PAYMENT STATUS UPDATED TO ESCROWED ✅✅✅');
                console.log('📋 Booking ID:', booking._id);
                console.log('💳 New Payment Status:', booking.paymentStatus);
                // ✅ Notify client about successful payment
                try {
                    await notificationHelper_1.default.notifyPaymentSuccessful(payment, booking.client.toString());
                    console.log('✅ Client notification sent');
                }
                catch (notifyError) {
                    logger_1.default.error('Failed to notify client about payment success:', notifyError);
                }
                // ✅ Notify vendor that payment is in escrow
                try {
                    await notificationHelper_1.default.notifyPaymentReceived(payment, booking.vendor.toString());
                    console.log('✅ Vendor notification sent');
                }
                catch (notifyError) {
                    logger_1.default.error('Failed to notify vendor about payment:', notifyError);
                }
            }
            else {
                console.error('❌ Booking not found with ID:', payment.booking);
            }
        }
        else {
            console.log('ℹ️ No booking associated with this payment');
        }
        // Update order if exists
        if (payment.order) {
            console.log('📦 Processing order payment...');
            const order = await Order_1.default.findById(payment.order);
            if (order) {
                order.isPaid = true;
                order.paidAt = new Date();
                order.escrowStatus = 'locked';
                order.escrowedAt = new Date();
                order.status = Order_1.OrderStatus.PROCESSING;
                order.statusHistory.push({
                    status: Order_1.OrderStatus.PROCESSING,
                    updatedBy: order.customer,
                    updatedAt: new Date(),
                    note: 'Payment confirmed via webhook',
                });
                await order.save();
                console.log('✅ Order payment status updated');
                // ✅ Notify customer about successful order payment
                try {
                    await notificationHelper_1.default.notifyPaymentSuccessful(payment, order.customer.toString());
                }
                catch (notifyError) {
                    logger_1.default.error('Failed to notify customer about payment success:', notifyError);
                }
            }
        }
        logger_1.default.info(`Payment successful: ${reference}`);
        console.log('========================================');
    }
    // The issue is that your handlePaystackWebhook already calls handleSuccessfulPayment
    // which DOES update the booking status. So the code is correct!
    // 
    // The problem might be:
    // 1. Payment record not found (check reference matches)
    // 2. Booking ID not set in payment record
    // 3. Error being silently caught somewhere
    //
    // The logs above will help you see exactly what's happening
    /**
     * Verify payment manually
     */
    async verifyPayment(reference) {
        // Verify with Paystack
        const paystackResponse = await axios_1.default.get(`${this.paystackBaseUrl}/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${this.paystackSecretKey}`,
            },
        });
        const { status, authorization } = paystackResponse.data.data;
        // Find payment
        const payment = await Payment_1.default.findOne({ reference });
        if (!payment) {
            throw new errors_1.NotFoundError('Payment not found');
        }
        // Update payment based on status
        if (status === 'success') {
            payment.status = types_1.PaymentStatus.COMPLETED;
            payment.escrowStatus = 'held';
            payment.paidAt = new Date();
            payment.escrowedAt = new Date();
            payment.paystackReference = reference;
            payment.authorizationCode = authorization?.authorization_code;
            await payment.save();
            // Update booking
            const booking = await Booking_1.default.findById(payment.booking);
            if (booking) {
                booking.paymentStatus = 'escrowed';
                await booking.save();
                // ✅ Notify about successful payment
                try {
                    await notificationHelper_1.default.notifyPaymentSuccessful(payment, booking.client.toString());
                }
                catch (notifyError) {
                    logger_1.default.error('Failed to notify about payment success:', notifyError);
                }
            }
        }
        else {
            payment.status = types_1.PaymentStatus.FAILED;
            await payment.save();
            // ✅ Notify about failed payment
            if (payment.user) {
                try {
                    await notificationHelper_1.default.notifyPaymentFailed(payment, payment.user.toString(), 'Payment verification failed');
                }
                catch (notifyError) {
                    logger_1.default.error('Failed to notify about payment failure:', notifyError);
                }
            }
        }
        logger_1.default.info(`Payment verified: ${reference} - ${status}`);
        return payment;
    }
    /**
     * Release payment to vendor - CREATE TRANSACTION FOR VENDOR EARNING
     */
    async releasePayment(bookingId) {
        const booking = await Booking_1.default.findById(bookingId).populate('vendor');
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Get payment
        const payment = await Payment_1.default.findOne({ booking: bookingId });
        if (!payment) {
            throw new errors_1.NotFoundError('Payment not found');
        }
        // Check if already released
        if (payment.escrowStatus === 'released') {
            throw new errors_1.BadRequestError('Payment already released');
        }
        // Check booking status
        if (booking.status !== types_1.BookingStatus.COMPLETED) {
            throw new errors_1.BadRequestError('Booking must be completed before releasing payment');
        }
        // Update payment
        payment.status = types_1.PaymentStatus.RELEASED;
        payment.escrowStatus = 'released';
        payment.releasedAt = new Date();
        payment.vendorPaidAt = new Date();
        await payment.save();
        // Credit vendor wallet
        const vendor = await User_1.default.findById(booking.vendor);
        if (vendor) {
            const previousBalance = vendor.walletBalance || 0;
            const amountToCredit = payment.vendorAmount || 0;
            vendor.walletBalance = previousBalance + amountToCredit;
            await vendor.save();
            // ✅ CREATE TRANSACTION FOR VENDOR EARNING
            await Transaction_1.default.create({
                user: vendor._id,
                type: types_1.TransactionType.BOOKING_EARNING,
                amount: amountToCredit,
                balanceBefore: previousBalance,
                balanceAfter: vendor.walletBalance,
                status: types_1.PaymentStatus.COMPLETED,
                reference: `TXN-EARN-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
                description: `Earnings from booking #${booking._id.toString().slice(-8)}`,
                booking: booking._id,
                payment: payment._id,
                metadata: {
                    platformFee: payment.platformFee,
                    commissionRate: payment.commissionRate,
                    originalAmount: payment.amount,
                },
            });
            logger_1.default.info(`✅ Transaction created for vendor earning: ${amountToCredit}`);
            // ✅ Notify vendor about payment received in wallet
            try {
                await notificationHelper_1.default.notifyPaymentReceived(payment, vendor._id.toString());
            }
            catch (notifyError) {
                logger_1.default.error('Failed to notify vendor about payment release:', notifyError);
            }
        }
        // Update booking
        booking.paymentStatus = 'released';
        await booking.save();
        logger_1.default.info(`Payment released to vendor: ${payment.reference}`);
        return payment;
    }
    /**
     * Refund payment - CREATE TRANSACTION FOR CLIENT REFUND
     */
    async refundPayment(bookingId, refundedBy, reason) {
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Get payment
        const payment = await Payment_1.default.findOne({ booking: bookingId });
        if (!payment) {
            throw new errors_1.NotFoundError('Payment not found');
        }
        // Check if already refunded
        if (payment.escrowStatus === 'refunded') {
            throw new errors_1.BadRequestError('Payment already refunded');
        }
        // Update payment
        payment.status = types_1.PaymentStatus.REFUNDED;
        payment.escrowStatus = 'refunded';
        payment.refundedAt = new Date();
        payment.refundAmount = payment.amount;
        payment.refundReason = reason;
        payment.refundedBy = refundedBy;
        await payment.save();
        // Credit client wallet
        const client = await User_1.default.findById(booking.client);
        if (client) {
            const previousBalance = client.walletBalance || 0;
            client.walletBalance = previousBalance + payment.amount;
            await client.save();
            // ✅ CREATE TRANSACTION FOR CLIENT REFUND
            await Transaction_1.default.create({
                user: client._id,
                type: types_1.TransactionType.BOOKING_REFUND,
                amount: payment.amount,
                balanceBefore: previousBalance,
                balanceAfter: client.walletBalance,
                status: types_1.PaymentStatus.COMPLETED,
                reference: `TXN-REFUND-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
                description: `Refund for cancelled booking #${booking._id.toString().slice(-8)}`,
                booking: booking._id,
                payment: payment._id,
                metadata: {
                    refundReason: reason,
                    refundedBy,
                },
            });
            logger_1.default.info(`✅ Transaction created for refund: ${payment.amount}`);
            // ✅ Notify client about refund
            try {
                await notificationHelper_1.default.notifyPaymentRefunded(payment, client._id.toString());
            }
            catch (notifyError) {
                logger_1.default.error('Failed to notify client about refund:', notifyError);
            }
        }
        // Update booking
        booking.paymentStatus = 'refunded';
        await booking.save();
        logger_1.default.info(`Payment refunded: ${payment.reference}`);
        return payment;
    }
    /**
     * Get payment by ID
     */
    async getPaymentById(paymentId) {
        const payment = await Payment_1.default.findById(paymentId)
            .populate('user', 'firstName lastName email')
            .populate('booking')
            .populate('order');
        if (!payment) {
            throw new errors_1.NotFoundError('Payment not found');
        }
        return payment;
    }
    /**
     * Get user payments
     */
    async getUserPayments(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [payments, total] = await Promise.all([
            Payment_1.default.find({ user: userId })
                .populate('booking', 'service scheduledDate status')
                .populate('order', 'orderNumber status totalAmount')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Payment_1.default.countDocuments({ user: userId }),
        ]);
        return {
            payments,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    // ==================== ORDER PAYMENT METHODS ====================
    /**
     * Pay for order using wallet balance
     */
    async payOrderFromWallet(orderId, customerId) {
        // Get order
        const order = await Order_1.default.findById(orderId).populate('seller');
        if (!order) {
            throw new errors_1.NotFoundError('Order not found');
        }
        // Verify ownership
        if (order.customer.toString() !== customerId) {
            throw new errors_1.BadRequestError('You can only pay for your own orders');
        }
        // Check if already paid
        if (order.isPaid) {
            throw new errors_1.BadRequestError('This order has already been paid');
        }
        // Get customer
        const customer = await User_1.default.findById(customerId);
        if (!customer) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Check wallet balance
        if ((customer.walletBalance || 0) < order.totalAmount) {
            throw new errors_1.BadRequestError(`Insufficient wallet balance. Your balance: ₦${(customer.walletBalance || 0).toLocaleString()}, Required: ₦${order.totalAmount.toLocaleString()}`);
        }
        // Calculate platform fee
        const platformFeeRate = 5; // 5% platform fee
        const platformFee = Math.round((order.totalAmount * platformFeeRate) / 100);
        const sellerAmount = order.totalAmount - platformFee;
        // Generate payment reference
        const reference = `WALLET-ORD-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`;
        // Deduct from wallet
        const previousBalance = customer.walletBalance || 0;
        customer.walletBalance = previousBalance - order.totalAmount;
        await customer.save();
        // Create payment record
        const payment = await Payment_1.default.create({
            user: customerId,
            order: orderId,
            amount: order.totalAmount,
            currency: 'NGN',
            status: types_1.PaymentStatus.COMPLETED,
            paymentMethod: 'wallet',
            reference,
            paidAt: new Date(),
            initiatedAt: new Date(),
            escrowStatus: 'held',
            escrowedAt: new Date(),
            commissionRate: platformFeeRate,
            platformFee,
            vendorAmount: sellerAmount,
        });
        // Create transaction for customer payment
        await transaction_service_1.default.createTransaction({
            userId: customerId,
            type: types_1.TransactionType.ORDER_PAYMENT,
            amount: order.totalAmount,
            description: `Payment for order #${order.orderNumber}`,
            order: order._id.toString(),
            payment: payment._id.toString(),
        });
        // Update order
        order.isPaid = true;
        order.paidAt = new Date();
        order.payment = payment._id;
        order.escrowStatus = 'locked';
        order.escrowedAt = new Date();
        order.status = Order_1.OrderStatus.PROCESSING;
        order.paymentReference = reference;
        order.statusHistory.push({
            status: Order_1.OrderStatus.PROCESSING,
            updatedBy: order.customer,
            updatedAt: new Date(),
            note: 'Payment confirmed via wallet',
        });
        await order.save();
        logger_1.default.info(`💰 Wallet payment successful: ${reference} for order ${orderId}`);
        // Notify customer
        await notificationHelper_1.default.notifyPaymentSuccessful(payment, customerId);
        // Notify seller (payment in escrow)
        if (order.seller) {
            logger_1.default.info(`Seller ${order.seller._id} notified about new paid order`);
        }
        return { order, payment };
    }
    /**
     * Check if customer can pay order from wallet
     */
    async canPayOrderFromWallet(orderId, customerId) {
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            throw new errors_1.NotFoundError('Order not found');
        }
        if (order.customer.toString() !== customerId) {
            throw new errors_1.BadRequestError('Not authorized');
        }
        const customer = await User_1.default.findById(customerId);
        if (!customer) {
            throw new errors_1.NotFoundError('User not found');
        }
        const balance = customer.walletBalance || 0;
        const required = order.totalAmount;
        const shortfall = Math.max(0, required - balance);
        return {
            canPay: balance >= required,
            balance,
            required,
            shortfall,
        };
    }
    /**
     * Initialize order payment (for card payment via Paystack)
     */
    async initializeOrderPayment(userId, orderId, metadata) {
        // Get order
        const order = await Order_1.default.findById(orderId)
            .populate('customer', 'email firstName lastName')
            .populate('seller', 'email firstName lastName');
        if (!order) {
            throw new errors_1.NotFoundError('Order not found');
        }
        // Verify ownership
        if (order.customer._id.toString() !== userId) {
            throw new errors_1.BadRequestError('You can only pay for your own orders');
        }
        // Check if already paid
        if (order.isPaid) {
            throw new errors_1.BadRequestError('This order has already been paid');
        }
        // Get user
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Calculate platform fee (5% default or from config)
        const platformFeeRate = config_1.default.platformFeeRate || 5;
        const platformFee = Math.round((order.totalAmount * platformFeeRate) / 100);
        const sellerAmount = order.totalAmount - platformFee;
        // Use existing payment reference or generate new one
        const reference = order.paymentReference || `ORD-PAY-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`;
        // Initialize Paystack payment
        const paystackResponse = await axios_1.default.post(`${this.paystackBaseUrl}/transaction/initialize`, {
            email: user.email,
            amount: order.totalAmount * 100, // Convert to kobo
            reference,
            currency: 'NGN',
            callback_url: `sharpLook://orders/${orderId}/payment/verify`,
            metadata: {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                userId: user._id.toString(),
                type: 'order',
                ...metadata,
            },
        }, {
            headers: {
                Authorization: `Bearer ${this.paystackSecretKey}`,
                'Content-Type': 'application/json',
            },
        });
        const { authorization_url, access_code } = paystackResponse.data.data;
        // Create payment record
        const payment = await Payment_1.default.create({
            user: userId,
            order: orderId,
            amount: order.totalAmount,
            currency: 'NGN',
            status: types_1.PaymentStatus.PENDING,
            paymentMethod: 'card',
            reference,
            initiatedAt: new Date(),
            escrowStatus: 'pending',
            commissionRate: platformFeeRate,
            platformFee,
            vendorAmount: sellerAmount,
        });
        // Update order with payment reference
        order.paymentReference = reference;
        order.payment = payment._id;
        await order.save();
        logger_1.default.info(`Order payment initialized: ${reference} for order ${orderId}`);
        return {
            payment,
            authorizationUrl: authorization_url,
            reference,
            accessCode: access_code,
        };
    }
    /**
     * Verify order payment
     */
    async verifyOrderPayment(orderId, reference) {
        // Verify with Paystack
        const paystackResponse = await axios_1.default.get(`${this.paystackBaseUrl}/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${this.paystackSecretKey}`,
            },
        });
        const { status, authorization } = paystackResponse.data.data;
        // Find payment
        const payment = await Payment_1.default.findOne({ reference });
        if (!payment) {
            throw new errors_1.NotFoundError('Payment not found');
        }
        // Get order
        const order = await Order_1.default.findById(orderId)
            .populate('customer', 'firstName lastName email')
            .populate('seller', 'firstName lastName email')
            .populate('items.product', 'name images');
        if (!order) {
            throw new errors_1.NotFoundError('Order not found');
        }
        // Update payment and order based on status
        if (status === 'success') {
            payment.status = types_1.PaymentStatus.COMPLETED;
            payment.escrowStatus = 'held';
            payment.paidAt = new Date();
            payment.escrowedAt = new Date();
            payment.paystackReference = reference;
            payment.authorizationCode = authorization?.authorization_code;
            await payment.save();
            // Update order
            order.isPaid = true;
            order.paidAt = new Date();
            order.payment = payment._id;
            order.escrowStatus = 'locked';
            order.escrowedAt = new Date();
            order.status = Order_1.OrderStatus.PROCESSING;
            // Add status update to history
            order.statusHistory.push({
                status: Order_1.OrderStatus.PROCESSING,
                updatedBy: order.customer._id,
                updatedAt: new Date(),
                note: 'Payment confirmed - order confirmed',
            });
            await order.save();
            // ✅ Notify customer about successful payment
            try {
                await notificationHelper_1.default.notifyPaymentSuccessful(payment, order.customer._id.toString());
            }
            catch (notifyError) {
                logger_1.default.error('Failed to notify customer about payment success:', notifyError);
            }
            logger_1.default.info(`Order payment successful: ${reference} for order ${orderId}`);
        }
        else if (status === 'failed') {
            payment.status = types_1.PaymentStatus.FAILED;
            await payment.save();
            // ✅ Notify about failed payment
            try {
                await notificationHelper_1.default.notifyPaymentFailed(payment, order.customer._id.toString(), 'Payment verification failed');
            }
            catch (notifyError) {
                logger_1.default.error('Failed to notify about payment failure:', notifyError);
            }
            logger_1.default.warn(`Order payment failed: ${reference} for order ${orderId}`);
        }
        return { payment, order };
    }
    /**
     * Release payment to seller after order completion
     */
    async releaseOrderPayment(orderId, _releasedBy) {
        const order = await Order_1.default.findById(orderId).populate('seller');
        if (!order) {
            throw new errors_1.NotFoundError('Order not found');
        }
        // Get payment
        const payment = await Payment_1.default.findOne({ order: orderId });
        if (!payment) {
            throw new errors_1.NotFoundError('Payment not found');
        }
        // Check if already released
        if (payment.escrowStatus === 'released') {
            throw new errors_1.BadRequestError('Payment already released');
        }
        // Check if paid
        if (!order.isPaid) {
            throw new errors_1.BadRequestError('Order must be paid before releasing payment');
        }
        // Check order status
        const canRelease = order.status === Order_1.OrderStatus.COMPLETED ||
            (order.customerConfirmedDelivery && order.sellerConfirmedDelivery);
        if (!canRelease) {
            throw new errors_1.BadRequestError('Order must be completed before releasing payment');
        }
        // Update payment
        payment.status = types_1.PaymentStatus.RELEASED;
        payment.escrowStatus = 'released';
        payment.releasedAt = new Date();
        payment.vendorPaidAt = new Date();
        await payment.save();
        // Credit seller wallet
        const seller = await User_1.default.findById(order.seller);
        if (seller) {
            const previousBalance = seller.walletBalance || 0;
            const amountToCredit = payment.vendorAmount || 0;
            seller.walletBalance = previousBalance + amountToCredit;
            await seller.save();
            // ✅ CREATE TRANSACTION FOR SELLER EARNING
            await Transaction_1.default.create({
                user: seller._id,
                type: types_1.TransactionType.ORDER_EARNING,
                amount: amountToCredit,
                balanceBefore: previousBalance,
                balanceAfter: seller.walletBalance,
                status: types_1.PaymentStatus.COMPLETED,
                reference: `TXN-ORDER-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
                description: `Earnings from order #${order.orderNumber}`,
                order: order._id,
                payment: payment._id,
                metadata: {
                    platformFee: payment.platformFee,
                    commissionRate: payment.commissionRate,
                    originalAmount: payment.amount,
                },
            });
            logger_1.default.info(`✅ Transaction created for order earning: ${amountToCredit}`);
            // ✅ Notify seller about payment received
            try {
                await notificationHelper_1.default.notifyPaymentReceived(payment, seller._id.toString());
            }
            catch (notifyError) {
                logger_1.default.error('Failed to notify seller about payment release:', notifyError);
            }
        }
        // Update order
        order.escrowStatus = 'released';
        order.escrowReleaseDate = new Date();
        await order.save();
        logger_1.default.info(`Order payment released to seller: ${payment.reference}`);
        return payment;
    }
    /**
     * Refund order payment
     */
    async refundOrderPayment(orderId, refundedBy, reason) {
        const order = await Order_1.default.findById(orderId).populate('customer');
        if (!order) {
            throw new errors_1.NotFoundError('Order not found');
        }
        // Get payment
        const payment = await Payment_1.default.findOne({ order: orderId });
        if (!payment) {
            throw new errors_1.NotFoundError('Payment not found');
        }
        // Check if already refunded
        if (payment.escrowStatus === 'refunded') {
            throw new errors_1.BadRequestError('Payment already refunded');
        }
        // Check if already released to seller
        if (payment.escrowStatus === 'released') {
            throw new errors_1.BadRequestError('Cannot refund payment that has been released to seller');
        }
        // Update payment
        payment.status = types_1.PaymentStatus.REFUNDED;
        payment.escrowStatus = 'refunded';
        payment.refundedAt = new Date();
        payment.refundAmount = payment.amount;
        payment.refundReason = reason;
        payment.refundedBy = refundedBy;
        await payment.save();
        // Credit customer wallet
        const customer = await User_1.default.findById(order.customer);
        if (customer) {
            const previousBalance = customer.walletBalance || 0;
            customer.walletBalance = previousBalance + payment.amount;
            await customer.save();
            // ✅ CREATE TRANSACTION FOR ORDER REFUND
            await Transaction_1.default.create({
                user: customer._id,
                type: types_1.TransactionType.ORDER_REFUND,
                amount: payment.amount,
                balanceBefore: previousBalance,
                balanceAfter: customer.walletBalance,
                status: types_1.PaymentStatus.COMPLETED,
                reference: `TXN-REFUND-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
                description: `Refund for cancelled order #${order.orderNumber}`,
                order: order._id,
                payment: payment._id,
                metadata: {
                    refundReason: reason,
                    refundedBy,
                },
            });
            logger_1.default.info(`✅ Transaction created for order refund: ${payment.amount}`);
            // ✅ Notify customer about refund
            try {
                await notificationHelper_1.default.notifyPaymentRefunded(payment, customer._id.toString());
            }
            catch (notifyError) {
                logger_1.default.error('Failed to notify customer about refund:', notifyError);
            }
        }
        // Update order
        order.escrowStatus = 'refunded';
        await order.save();
        logger_1.default.info(`Order payment refunded: ${payment.reference}`);
        return payment;
    }
    // ==================== TRANSFER/WITHDRAWAL HANDLERS ====================
    /**
     * Handle successful transfer (withdrawal)
     */
    async handleSuccessfulTransfer(data) {
        const { reference, transfer_code } = data;
        const Withdrawal = require('../models/Withdrawal').default;
        const withdrawal = await Withdrawal.findOne({ reference });
        if (withdrawal) {
            withdrawal.status = 'completed';
            withdrawal.completedAt = new Date();
            withdrawal.paystackTransferCode = transfer_code;
            await withdrawal.save();
            // ✅ Notify user about successful withdrawal
            try {
                await notificationHelper_1.default.notifyWithdrawalApproved(withdrawal, withdrawal.user.toString());
            }
            catch (notifyError) {
                logger_1.default.error('Failed to notify about withdrawal success:', notifyError);
            }
            logger_1.default.info(`Transfer successful: ${reference}`);
        }
    }
    /**
     * Handle failed transfer
     */
    async handleFailedTransfer(data) {
        const { reference, transfer_code } = data;
        const Withdrawal = require('../models/Withdrawal').default;
        const withdrawal = await Withdrawal.findOne({ reference });
        if (withdrawal) {
            withdrawal.status = 'failed';
            withdrawal.failedAt = new Date();
            withdrawal.failureReason = 'Transfer failed';
            withdrawal.paystackTransferCode = transfer_code;
            await withdrawal.save();
            // Refund to wallet
            const user = await User_1.default.findById(withdrawal.user);
            if (user) {
                user.walletBalance = (user.walletBalance || 0) + withdrawal.amount;
                await user.save();
            }
            // ✅ Notify user about failed withdrawal
            try {
                await notificationHelper_1.default.notifyWithdrawalRejected(withdrawal, withdrawal.user.toString(), 'Transfer failed - Amount refunded to wallet');
            }
            catch (notifyError) {
                logger_1.default.error('Failed to notify about withdrawal failure:', notifyError);
            }
            logger_1.default.error(`Transfer failed: ${reference}`);
        }
    }
}
exports.default = new PaymentService();
//# sourceMappingURL=payment.service.js.map