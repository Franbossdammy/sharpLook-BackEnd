// BACKEND: Fixed Paystack Webhook Handler
// File: controllers/webhook.controller.ts

import { Request, Response } from 'express';
import crypto from 'crypto';
import socketService from '../socket/socket.service';
import walletFundingService from '../services/walletFunding.service';
import bookingService from '../services/booking.service'; // ✅ ADD THIS IMPORT
import Payment from '../models/Payment';
import Booking from '../models/Booking'; // ✅ ADD THIS IMPORT
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

    // Check if it's an order payment
    const isOrderPayment = 
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

      const userId = payment.user.toString();

      // Update payment status
      payment.status = PaymentStatus.COMPLETED;
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
        
        logger.info(`✅ Order ${order._id} payment status updated to paid`);
      }

      socketService.sendToUser(userId, 'order:payment:success', {
        reference: reference,
        orderId: payment.order?.toString() || metadata?.orderId,
        orderNumber: metadata?.orderNumber,
        amount: amount / 100,
        message: 'Order payment successful',
        timestamp: new Date().toISOString(),
      });

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
      
      // Find and delete the pending booking
      const booking = await Booking.findOne({ paymentReference: reference });
      
      if (booking && booking.paymentStatus === 'pending') {
        const clientId = booking.client.toString();
        
        await Booking.findByIdAndDelete(booking._id);
        logger.info(`🗑️ Deleted unpaid booking: ${booking._id}`);

        // Emit failure event
        socketService.sendToUser(clientId, 'payment:failed', {
          reference: reference,
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

    // Handle order payment failure
    const isOrderPayment = 
      reference.startsWith('ORDER-') ||
      metadata?.type === 'order_payment';

    if (isOrderPayment) {
      const payment = await Payment.findOne({ reference });
      if (payment) {
        payment.status = PaymentStatus.FAILED;
        await payment.save();

        socketService.sendToUser(payment.user.toString(), 'order:payment:failed', {
          reference: reference,
          orderId: payment.order?.toString() || metadata?.orderId,
          reason: gateway_response || 'Payment failed',
          message: 'Order payment failed',
          timestamp: new Date().toISOString(),
        });

        logger.info(`📡 order:payment:failed event emitted`);
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