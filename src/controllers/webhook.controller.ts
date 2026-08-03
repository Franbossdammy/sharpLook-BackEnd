import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import socketService from '../socket/socket.service';
import walletFundingService from '../services/walletFunding.service';
import bookingService from '../services/booking.service';
import orderService from '../services/order.service';
import Payment from '../models/Payment';
import Booking from '../models/Booking';
import User from '../models/User';
import logger from '../utils/logger';
import config from '../config';
import { PaymentStatus } from '../types';

/**
 * Handle Paystack Webhook
 * POST /api/v1/webhooks/paystack
 */
export const handlePaystackWebhook = async (req: Request, res: Response): Promise<Response> => {
  try {
    // 1. Verify webhook signature
    const hash = crypto
      .createHmac('sha512', config.paystack.secretKey)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      logger.warn('⚠️ Invalid Paystack webhook signature');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const { event, data } = req.body;
    logger.info(`📩 Paystack webhook received: ${event}`);
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
        logger.info(`Unhandled webhook event: ${event}`);
    }

    // 3. Always respond 200 to Paystack
    return res.status(200).json({ received: true });

  } catch (error) {
    logger.error('❌ Webhook processing error:', error);
    // Still respond 200 to prevent retries
    return res.status(200).json({ received: true });
  }
};

/**
 * Handle successful charge (wallet funding or booking payment)
 */
async function handleChargeSuccess(data: any) {
  const { reference, amount, authorization, metadata } = data;
  
  logger.info(`💰 Processing successful charge: ${reference}`);
  console.log('📦 Metadata:', metadata);

  try {
    // ✅ FIRST: Check if this is a BOOKING payment by reference prefix or metadata
    const isBookingPayment = 
      reference.startsWith('BOOKING-') || 
      reference.startsWith('BOOK-') ||
      metadata?.paymentType === 'booking' ||
      metadata?.bookingId;

    if (isBookingPayment) {
      logger.info(`📅 Processing BOOKING payment: ${reference}`);
      
      // ✅ Use booking service to verify and activate - this creates the Payment record!
      try {
        const result = await bookingService.verifyPaystackPayment(reference);
        
        logger.info(`✅ Booking payment processed: ${result.booking._id}`);
        logger.info(`   Payment Status: ${result.booking.paymentStatus}`);
        
        // ✅ Emit socket event to client (booking service emits 'booking:created:paid')
        // But we also emit 'payment:success' for backward compatibility
        const clientId = result.booking.client.toString();
        socketService.sendToUser(clientId, 'payment:success', {
          reference: reference,
          bookingId: result.booking._id.toString(),
          amount: amount / 100,
          message: 'Booking payment successful',
          timestamp: new Date().toISOString(),
        });
        
        logger.info(`📡 payment:success event emitted to user: ${clientId}`);
        return;
        
      } catch (bookingError: any) {
        // Check if it's a "booking not found" error - might be old format
        if (bookingError.message?.includes('not found')) {
          logger.warn(`⚠️ Booking not found for reference: ${reference}, trying Payment lookup...`);
          // Fall through to try Payment lookup below
        } else {
          throw bookingError;
        }
      }
    }

    // Check if it's a wallet funding payment
    const isWalletFunding = 
      reference.startsWith('WALLET-FUND-') ||
      metadata?.type === 'wallet_funding';

    if (isWalletFunding) {
      logger.info(`💳 Processing WALLET FUNDING: ${reference}`);
      
      await walletFundingService.processWalletFundingWebhook(data);

      // Get user for new balance
      const payment = await Payment.findOne({ reference });
      if (payment) {
        const user = await User.findById(payment.user);
        if (user) {
          socketService.sendToUser(payment.user.toString(), 'wallet:funded', {
            reference: reference,
            amount: amount / 100,
            newBalance: user.walletBalance,
            message: 'Wallet funded successfully',
            timestamp: new Date().toISOString(),
          });
          logger.info(`📡 wallet:funded event emitted to user: ${payment.user}`);
        }
      }
      return;
    }

    // Check if it's an order payment (payment-first flow: order not created yet)
    const isOrderPayment =
      reference.startsWith('ORD-PAY-') ||
      reference.startsWith('ORDER-') ||
      metadata?.type === 'order_payment' ||
      metadata?.orderId;

    if (isOrderPayment) {
      logger.info(`📦 Processing ORDER payment: ${reference}`);

      const payment = await Payment.findOne({ reference });
      if (!payment) {
        logger.warn(`⚠️ Payment not found for order reference: ${reference}`);
        return;
      }

      // Skip if already processed (idempotency)
      if (payment.status === PaymentStatus.COMPLETED) {
        logger.info(`ℹ️ Order payment ${reference} already processed, skipping`);
        return;
      }

      const userId = payment.user.toString();
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const pendingOrderData = payment.metadata?.pendingOrderData;

        if (!pendingOrderData) {
          // Legacy flow: order already exists, just update status
          payment.status = PaymentStatus.COMPLETED;
          payment.paidAt = new Date();
          payment.escrowStatus = 'held';
          payment.escrowedAt = new Date();
          payment.paystackReference = reference;
          payment.authorizationCode = authorization?.authorization_code;
          await payment.save({ session });

          const Order = require('../models/Order').default;
          const order = await Order.findById(payment.order || metadata?.orderId).session(session);
          if (order) {
            order.isPaid = true;
            order.paidAt = new Date();
            order.escrowStatus = 'locked';
            order.escrowedAt = new Date();
            order.status = 'processing';
            await order.save({ session });
          }

          await session.commitTransaction();
          socketService.sendToUser(userId, 'order:payment:success', {
            reference,
            orderId: payment.order?.toString() || metadata?.orderId,
            amount: amount / 100,
            message: 'Order payment successful',
            timestamp: new Date().toISOString(),
          });

          // Notify seller about payment for existing order
          try {
            if (order) {
              const notificationHelper = require('../utils/notificationHelper').default;
              await notificationHelper.notifySellerNewOrder(order);
            }
          } catch (notifyErr) {
            logger.error('Failed to notify seller about order payment:', notifyErr);
          }
          return;
        }

        // Payment-first flow: create the order now that payment is confirmed
        const order = await orderService.finalizeOrder(pendingOrderData, reference, session);

        payment.status = PaymentStatus.COMPLETED;
        payment.paidAt = new Date();
        payment.escrowStatus = 'held';
        payment.escrowedAt = new Date();
        payment.paystackReference = reference;
        payment.authorizationCode = authorization?.authorization_code;
        payment.order = order._id;
        await payment.save({ session });

        order.payment = payment._id;
        await order.save({ session });

        await session.commitTransaction();

        logger.info(`✅ Order ${order._id} created after card payment ${reference}`);
        socketService.sendToUser(userId, 'order:payment:success', {
          reference,
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          amount: amount / 100,
          message: 'Order payment successful',
          timestamp: new Date().toISOString(),
        });

        // Notify seller about new paid order
        try {
          const notificationHelper = require('../utils/notificationHelper').default;
          await notificationHelper.notifySellerNewOrder(order);
        } catch (notifyErr) {
          logger.error('Failed to notify seller about new order:', notifyErr);
        }
      } catch (err) {
        await session.abortTransaction();
        logger.error(`❌ Failed to finalize order for payment ${reference}:`, err);
        // Emit failure so the client knows to retry or contact support
        socketService.sendToUser(userId, 'order:payment:failed', {
          reference,
          reason: 'Order could not be created after payment. Support has been notified.',
          timestamp: new Date().toISOString(),
        });
      } finally {
        session.endSession();
      }

      logger.info(`📡 order:payment:success event emitted to user: ${userId}`);
      return;
    }

    // ✅ FALLBACK: Try to find existing Payment record (for other payment types)
    const payment = await Payment.findOne({ reference });
    
    if (!payment) {
      logger.warn(`⚠️ Payment not found for reference: ${reference}`);
      logger.warn(`   This might be an unhandled payment type`);
      return;
    }

    const userId = payment.user.toString();

    // Skip if already processed
    if (payment.status === PaymentStatus.COMPLETED) {
      logger.info(`ℹ️ Payment ${reference} already processed, skipping`);
      return;
    }

    // Update payment status
    payment.status = PaymentStatus.COMPLETED;
    payment.paidAt = new Date();
    payment.escrowStatus = 'held';
    payment.escrowedAt = new Date();
    payment.paystackReference = reference;
    payment.authorizationCode = authorization?.authorization_code;
    await payment.save();

    // Generic payment success event
    socketService.sendToUser(userId, 'payment:success', {
      reference: reference,
      amount: amount / 100,
      message: 'Payment successful',
      timestamp: new Date().toISOString(),
    });

    logger.info(`📡 payment:success event emitted to user: ${userId}`);

  } catch (error) {
    logger.error('❌ Error processing charge success:', error);
    throw error;
  }
}

/**
 * Handle failed charge
 */
async function handleChargeFailed(data: any) {
  const { reference, gateway_response, metadata } = data;
  
  logger.info(`❌ Processing failed charge: ${reference}`);

  try {
    // ✅ Check if it's a booking payment
    const isBookingPayment = 
      reference.startsWith('BOOKING-') || 
      reference.startsWith('BOOK-') ||
      metadata?.paymentType === 'booking' ||
      metadata?.bookingId;

    if (isBookingPayment) {
      logger.info(`📅 Processing failed BOOKING payment: ${reference}`);

      // Mark the pending payment as failed (payment-first flow: no booking created yet)
      const pendingPayment = await Payment.findOne({ reference });
      if (pendingPayment && pendingPayment.status !== PaymentStatus.COMPLETED) {
        pendingPayment.status = PaymentStatus.FAILED;
        await pendingPayment.save();

        socketService.sendToUser(pendingPayment.user.toString(), 'payment:failed', {
          reference,
          reason: gateway_response || 'Payment failed',
          message: 'Booking payment failed',
          timestamp: new Date().toISOString(),
        });

        logger.info(`💳 Pending booking payment marked as failed: ${reference}`);
        return;
      }

      // Legacy flow: booking was created before payment — delete it
      const booking = await Booking.findOne({ paymentReference: reference });
      if (booking && booking.paymentStatus === 'pending') {
        const clientId = booking.client.toString();

        await Booking.findByIdAndDelete(booking._id);
        logger.info(`🗑️ Deleted unpaid booking: ${booking._id}`);

        socketService.sendToUser(clientId, 'payment:failed', {
          reference,
          bookingId: booking._id.toString(),
          reason: gateway_response || 'Payment failed',
          message: 'Booking payment failed',
          timestamp: new Date().toISOString(),
        });

        logger.info(`📡 payment:failed event emitted to user: ${clientId}`);
      }
      return;
    }

    // Handle wallet funding failure
    const isWalletFunding = 
      reference.startsWith('WALLET-FUND-') ||
      metadata?.type === 'wallet_funding';

    if (isWalletFunding) {
      const payment = await Payment.findOne({ reference });
      if (payment) {
        payment.status = PaymentStatus.FAILED;
        await payment.save();

        socketService.sendToUser(payment.user.toString(), 'wallet:funding:failed', {
          reference: reference,
          reason: gateway_response || 'Payment failed',
          message: 'Wallet funding failed',
          timestamp: new Date().toISOString(),
        });

        logger.info(`📡 wallet:funding:failed event emitted`);
      }
      return;
    }

    // Handle order payment failure (payment-first flow: no order was created yet)
    const isOrderPayment =
      reference.startsWith('ORD-PAY-') ||
      reference.startsWith('ORDER-') ||
      metadata?.type === 'order_payment';

    if (isOrderPayment) {
      const payment = await Payment.findOne({ reference });
      if (payment) {
        payment.status = PaymentStatus.FAILED;
        await payment.save();

        // No order exists to cancel — the order is only created on charge.success
        socketService.sendToUser(payment.user.toString(), 'order:payment:failed', {
          reference,
          reason: gateway_response || 'Payment failed',
          message: 'Payment failed. No order was created.',
          timestamp: new Date().toISOString(),
        });

        logger.info(`📡 order:payment:failed emitted, no order to roll back`);
      }
      return;
    }

    // Fallback: Try to find payment record
    const payment = await Payment.findOne({ reference });
    
    if (payment) {
      const userId = payment.user.toString();
      payment.status = PaymentStatus.FAILED;
      await payment.save();

      socketService.sendToUser(userId, 'payment:failed', {
        reference: reference,
        reason: gateway_response || 'Payment failed',
        message: 'Payment failed',
        timestamp: new Date().toISOString(),
      });

      logger.info(`📡 payment:failed event emitted to user: ${userId}`);
    }

  } catch (error) {
    logger.error('❌ Error processing charge failed:', error);
    throw error;
  }
}

/**
 * Handle successful transfer (withdrawal)
 */
async function handleTransferSuccess(data: any) {
  const { reference, transfer_code } = data;
  logger.info(`💸 Processing successful transfer: ${reference}`);
  
  try {
    const Withdrawal = require('../models/Withdrawal').default;
    const withdrawal = await Withdrawal.findOne({ reference });
    
    if (!withdrawal) {
      logger.warn(`⚠️ Withdrawal not found for reference: ${reference}`);
      return;
    }

    const userId = withdrawal.user.toString();

    // Update withdrawal status
    withdrawal.status = 'completed';
    withdrawal.transferCode = transfer_code;
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    const user = await User.findById(userId);

    // Emit socket event
    socketService.sendToUser(userId, 'withdrawal:success', {
      reference: withdrawal.reference,
      amount: withdrawal.netAmount,
      newBalance: user?.walletBalance || 0,
      bankName: withdrawal.bankName,
      accountNumber: withdrawal.accountNumber,
      message: 'Withdrawal processed successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info(`✅ Withdrawal ${reference} completed for user ${userId}`);
  } catch (error) {
    logger.error('❌ Error processing transfer success:', error);
  }
}

/**
 * Handle failed transfer (withdrawal)
 */
async function handleTransferFailed(data: any) {
  const { reference, gateway_response } = data;
  logger.info(`❌ Processing failed transfer: ${reference}`);
  
  try {
    const Withdrawal = require('../models/Withdrawal').default;
    const withdrawal = await Withdrawal.findOne({ reference });
    
    if (!withdrawal) {
      logger.warn(`⚠️ Withdrawal not found for reference: ${reference}`);
      return;
    }

    const userId = withdrawal.user.toString();

    // Refund the amount back to user's wallet
    const user = await User.findById(userId);
    if (user) {
      user.walletBalance = (user.walletBalance || 0) + withdrawal.amount;
      await user.save();
    }

    // Update withdrawal status
    withdrawal.status = 'failed';
    withdrawal.failureReason = gateway_response || 'Transfer failed';
    await withdrawal.save();

    // Emit socket event
    socketService.sendToUser(userId, 'withdrawal:failed', {
      reference: withdrawal.reference,
      reason: withdrawal.failureReason,
      refundedAmount: withdrawal.amount,
      newBalance: user?.walletBalance || 0,
      message: 'Withdrawal failed - amount refunded to wallet',
      timestamp: new Date().toISOString(),
    });

    logger.info(`❌ Withdrawal ${reference} failed for user ${userId}, amount refunded`);
  } catch (error) {
    logger.error('❌ Error processing transfer failed:', error);
  }
}

export default {
  handlePaystackWebhook,
};