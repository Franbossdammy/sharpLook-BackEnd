"use strict";
// BACKEND: Fixed Paystack Webhook Handler
// File: controllers/webhook.controller.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePaystackWebhook = void 0;
const crypto_1 = __importDefault(require("crypto"));
const socket_service_1 = __importDefault(require("../socket/socket.service"));
const walletFunding_service_1 = __importDefault(require("../services/walletFunding.service"));
const booking_service_1 = __importDefault(require("../services/booking.service")); // ✅ ADD THIS IMPORT
const Payment_1 = __importDefault(require("../models/Payment"));
const Booking_1 = __importDefault(require("../models/Booking")); // ✅ ADD THIS IMPORT
const User_1 = __importDefault(require("../models/User"));
const logger_1 = __importDefault(require("../utils/logger"));
const config_1 = __importDefault(require("../config"));
const types_1 = require("../types");
/**
 * Handle Paystack Webhook
 * POST /api/v1/webhooks/paystack
 */
const handlePaystackWebhook = async (req, res) => {
    try {
        // 1. Verify webhook signature
        const hash = crypto_1.default
            .createHmac('sha512', config_1.default.paystack.secretKey)
            .update(JSON.stringify(req.body))
            .digest('hex');
        if (hash !== req.headers['x-paystack-signature']) {
            logger_1.default.warn('⚠️ Invalid Paystack webhook signature');
            return res.status(401).json({ message: 'Invalid signature' });
        }
        const { event, data } = req.body;
        logger_1.default.info(`📩 Paystack webhook received: ${event}`);
        console.log('📩 Webhook data:', JSON.stringify(data, null, 2));
        // 2. Handle different events
        switch (event) {
            case 'charge.success':
                await handleChargeSuccess(data);
                break;
            case 'charge.failed':
                await handleChargeFailed(data);
                break;
            case 'transfer.success':
                await handleTransferSuccess(data);
                break;
            case 'transfer.failed':
                await handleTransferFailed(data);
                break;
            default:
                logger_1.default.info(`Unhandled webhook event: ${event}`);
        }
        // 3. Always respond 200 to Paystack
        return res.status(200).json({ received: true });
    }
    catch (error) {
        logger_1.default.error('❌ Webhook processing error:', error);
        // Still respond 200 to prevent retries
        return res.status(200).json({ received: true });
    }
};
exports.handlePaystackWebhook = handlePaystackWebhook;
/**
 * Handle successful charge (wallet funding or booking payment)
 */
async function handleChargeSuccess(data) {
    const { reference, amount, authorization, metadata } = data;
    logger_1.default.info(`💰 Processing successful charge: ${reference}`);
    console.log('📦 Metadata:', metadata);
    try {
        // ✅ FIRST: Check if this is a BOOKING payment by reference prefix or metadata
        const isBookingPayment = reference.startsWith('BOOKING-') ||
            reference.startsWith('BOOK-') ||
            metadata?.paymentType === 'booking' ||
            metadata?.bookingId;
        if (isBookingPayment) {
            logger_1.default.info(`📅 Processing BOOKING payment: ${reference}`);
            // ✅ Use booking service to verify and activate - this creates the Payment record!
            try {
                const result = await booking_service_1.default.verifyPaystackPayment(reference);
                logger_1.default.info(`✅ Booking payment processed: ${result.booking._id}`);
                logger_1.default.info(`   Payment Status: ${result.booking.paymentStatus}`);
                // ✅ Emit socket event to client (booking service emits 'booking:created:paid')
                // But we also emit 'payment:success' for backward compatibility
                const clientId = result.booking.client.toString();
                socket_service_1.default.sendToUser(clientId, 'payment:success', {
                    reference: reference,
                    bookingId: result.booking._id.toString(),
                    amount: amount / 100,
                    message: 'Booking payment successful',
                    timestamp: new Date().toISOString(),
                });
                logger_1.default.info(`📡 payment:success event emitted to user: ${clientId}`);
                return;
            }
            catch (bookingError) {
                // Check if it's a "booking not found" error - might be old format
                if (bookingError.message?.includes('not found')) {
                    logger_1.default.warn(`⚠️ Booking not found for reference: ${reference}, trying Payment lookup...`);
                    // Fall through to try Payment lookup below
                }
                else {
                    throw bookingError;
                }
            }
        }
        // Check if it's a wallet funding payment
        const isWalletFunding = reference.startsWith('WALLET-FUND-') ||
            metadata?.type === 'wallet_funding';
        if (isWalletFunding) {
            logger_1.default.info(`💳 Processing WALLET FUNDING: ${reference}`);
            await walletFunding_service_1.default.processWalletFundingWebhook(data);
            // Get user for new balance
            const payment = await Payment_1.default.findOne({ reference });
            if (payment) {
                const user = await User_1.default.findById(payment.user);
                if (user) {
                    socket_service_1.default.sendToUser(payment.user.toString(), 'wallet:funded', {
                        reference: reference,
                        amount: amount / 100,
                        newBalance: user.walletBalance,
                        message: 'Wallet funded successfully',
                        timestamp: new Date().toISOString(),
                    });
                    logger_1.default.info(`📡 wallet:funded event emitted to user: ${payment.user}`);
                }
            }
            return;
        }
        // Check if it's an order payment
        const isOrderPayment = reference.startsWith('ORDER-') ||
            metadata?.type === 'order_payment' ||
            metadata?.orderId;
        if (isOrderPayment) {
            logger_1.default.info(`📦 Processing ORDER payment: ${reference}`);
            const payment = await Payment_1.default.findOne({ reference });
            if (!payment) {
                logger_1.default.warn(`⚠️ Payment not found for order reference: ${reference}`);
                return;
            }
            const userId = payment.user.toString();
            // Update payment status
            payment.status = types_1.PaymentStatus.COMPLETED;
            payment.paidAt = new Date();
            payment.escrowStatus = 'held';
            payment.escrowedAt = new Date();
            payment.paystackReference = reference;
            payment.authorizationCode = authorization?.authorization_code;
            await payment.save();
            // Update order status
            const Order = require('../models/Order').default;
            const order = await Order.findById(payment.order || metadata?.orderId);
            if (order) {
                order.isPaid = true;
                order.paidAt = new Date();
                order.escrowStatus = 'locked';
                order.escrowedAt = new Date();
                order.status = 'processing';
                await order.save();
                logger_1.default.info(`✅ Order ${order._id} payment status updated to paid`);
            }
            socket_service_1.default.sendToUser(userId, 'order:payment:success', {
                reference: reference,
                orderId: payment.order?.toString() || metadata?.orderId,
                orderNumber: metadata?.orderNumber,
                amount: amount / 100,
                message: 'Order payment successful',
                timestamp: new Date().toISOString(),
            });
            logger_1.default.info(`📡 order:payment:success event emitted to user: ${userId}`);
            return;
        }
        // ✅ FALLBACK: Try to find existing Payment record (for other payment types)
        const payment = await Payment_1.default.findOne({ reference });
        if (!payment) {
            logger_1.default.warn(`⚠️ Payment not found for reference: ${reference}`);
            logger_1.default.warn(`   This might be an unhandled payment type`);
            return;
        }
        const userId = payment.user.toString();
        // Skip if already processed
        if (payment.status === types_1.PaymentStatus.COMPLETED) {
            logger_1.default.info(`ℹ️ Payment ${reference} already processed, skipping`);
            return;
        }
        // Update payment status
        payment.status = types_1.PaymentStatus.COMPLETED;
        payment.paidAt = new Date();
        payment.escrowStatus = 'held';
        payment.escrowedAt = new Date();
        payment.paystackReference = reference;
        payment.authorizationCode = authorization?.authorization_code;
        await payment.save();
        // Generic payment success event
        socket_service_1.default.sendToUser(userId, 'payment:success', {
            reference: reference,
            amount: amount / 100,
            message: 'Payment successful',
            timestamp: new Date().toISOString(),
        });
        logger_1.default.info(`📡 payment:success event emitted to user: ${userId}`);
    }
    catch (error) {
        logger_1.default.error('❌ Error processing charge success:', error);
        throw error;
    }
}
/**
 * Handle failed charge
 */
async function handleChargeFailed(data) {
    const { reference, gateway_response, metadata } = data;
    logger_1.default.info(`❌ Processing failed charge: ${reference}`);
    try {
        // ✅ Check if it's a booking payment
        const isBookingPayment = reference.startsWith('BOOKING-') ||
            reference.startsWith('BOOK-') ||
            metadata?.paymentType === 'booking' ||
            metadata?.bookingId;
        if (isBookingPayment) {
            logger_1.default.info(`📅 Processing failed BOOKING payment: ${reference}`);
            // Find and delete the pending booking
            const booking = await Booking_1.default.findOne({ paymentReference: reference });
            if (booking && booking.paymentStatus === 'pending') {
                const clientId = booking.client.toString();
                await Booking_1.default.findByIdAndDelete(booking._id);
                logger_1.default.info(`🗑️ Deleted unpaid booking: ${booking._id}`);
                // Emit failure event
                socket_service_1.default.sendToUser(clientId, 'payment:failed', {
                    reference: reference,
                    bookingId: booking._id.toString(),
                    reason: gateway_response || 'Payment failed',
                    message: 'Booking payment failed',
                    timestamp: new Date().toISOString(),
                });
                logger_1.default.info(`📡 payment:failed event emitted to user: ${clientId}`);
            }
            return;
        }
        // Handle wallet funding failure
        const isWalletFunding = reference.startsWith('WALLET-FUND-') ||
            metadata?.type === 'wallet_funding';
        if (isWalletFunding) {
            const payment = await Payment_1.default.findOne({ reference });
            if (payment) {
                payment.status = types_1.PaymentStatus.FAILED;
                await payment.save();
                socket_service_1.default.sendToUser(payment.user.toString(), 'wallet:funding:failed', {
                    reference: reference,
                    reason: gateway_response || 'Payment failed',
                    message: 'Wallet funding failed',
                    timestamp: new Date().toISOString(),
                });
                logger_1.default.info(`📡 wallet:funding:failed event emitted`);
            }
            return;
        }
        // Handle order payment failure
        const isOrderPayment = reference.startsWith('ORDER-') ||
            metadata?.type === 'order_payment';
        if (isOrderPayment) {
            const payment = await Payment_1.default.findOne({ reference });
            if (payment) {
                payment.status = types_1.PaymentStatus.FAILED;
                await payment.save();
                socket_service_1.default.sendToUser(payment.user.toString(), 'order:payment:failed', {
                    reference: reference,
                    orderId: payment.order?.toString() || metadata?.orderId,
                    reason: gateway_response || 'Payment failed',
                    message: 'Order payment failed',
                    timestamp: new Date().toISOString(),
                });
                logger_1.default.info(`📡 order:payment:failed event emitted`);
            }
            return;
        }
        // Fallback: Try to find payment record
        const payment = await Payment_1.default.findOne({ reference });
        if (payment) {
            const userId = payment.user.toString();
            payment.status = types_1.PaymentStatus.FAILED;
            await payment.save();
            socket_service_1.default.sendToUser(userId, 'payment:failed', {
                reference: reference,
                reason: gateway_response || 'Payment failed',
                message: 'Payment failed',
                timestamp: new Date().toISOString(),
            });
            logger_1.default.info(`📡 payment:failed event emitted to user: ${userId}`);
        }
    }
    catch (error) {
        logger_1.default.error('❌ Error processing charge failed:', error);
        throw error;
    }
}
/**
 * Handle successful transfer (withdrawal)
 */
async function handleTransferSuccess(data) {
    const { reference, transfer_code } = data;
    logger_1.default.info(`💸 Processing successful transfer: ${reference}`);
    try {
        const Withdrawal = require('../models/Withdrawal').default;
        const withdrawal = await Withdrawal.findOne({ reference });
        if (!withdrawal) {
            logger_1.default.warn(`⚠️ Withdrawal not found for reference: ${reference}`);
            return;
        }
        const userId = withdrawal.user.toString();
        // Update withdrawal status
        withdrawal.status = 'completed';
        withdrawal.transferCode = transfer_code;
        withdrawal.processedAt = new Date();
        await withdrawal.save();
        const user = await User_1.default.findById(userId);
        // Emit socket event
        socket_service_1.default.sendToUser(userId, 'withdrawal:success', {
            reference: withdrawal.reference,
            amount: withdrawal.netAmount,
            newBalance: user?.walletBalance || 0,
            bankName: withdrawal.bankName,
            accountNumber: withdrawal.accountNumber,
            message: 'Withdrawal processed successfully',
            timestamp: new Date().toISOString(),
        });
        logger_1.default.info(`✅ Withdrawal ${reference} completed for user ${userId}`);
    }
    catch (error) {
        logger_1.default.error('❌ Error processing transfer success:', error);
    }
}
/**
 * Handle failed transfer (withdrawal)
 */
async function handleTransferFailed(data) {
    const { reference, gateway_response } = data;
    logger_1.default.info(`❌ Processing failed transfer: ${reference}`);
    try {
        const Withdrawal = require('../models/Withdrawal').default;
        const withdrawal = await Withdrawal.findOne({ reference });
        if (!withdrawal) {
            logger_1.default.warn(`⚠️ Withdrawal not found for reference: ${reference}`);
            return;
        }
        const userId = withdrawal.user.toString();
        // Refund the amount back to user's wallet
        const user = await User_1.default.findById(userId);
        if (user) {
            user.walletBalance = (user.walletBalance || 0) + withdrawal.amount;
            await user.save();
        }
        // Update withdrawal status
        withdrawal.status = 'failed';
        withdrawal.failureReason = gateway_response || 'Transfer failed';
        await withdrawal.save();
        // Emit socket event
        socket_service_1.default.sendToUser(userId, 'withdrawal:failed', {
            reference: withdrawal.reference,
            reason: withdrawal.failureReason,
            refundedAmount: withdrawal.amount,
            newBalance: user?.walletBalance || 0,
            message: 'Withdrawal failed - amount refunded to wallet',
            timestamp: new Date().toISOString(),
        });
        logger_1.default.info(`❌ Withdrawal ${reference} failed for user ${userId}, amount refunded`);
    }
    catch (error) {
        logger_1.default.error('❌ Error processing transfer failed:', error);
    }
}
exports.default = {
    handlePaystackWebhook: exports.handlePaystackWebhook,
};
//# sourceMappingURL=webhook.controller.js.map