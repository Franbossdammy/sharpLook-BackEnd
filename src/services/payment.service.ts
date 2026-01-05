import Payment, { IPayment } from '../models/Payment';
import Booking from '../models/Booking';
import Order, { OrderStatus } from '../models/Order';
import User from '../models/User';
import Transaction from '../models/Transaction';
import subscriptionService from './subscription.service';
import transactionService from './transaction.service';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { PaymentStatus, BookingStatus, TransactionType } from '../types';
import config from '../config';
import { generateRandomString } from '../utils/helpers';
import axios from 'axios';
import crypto from 'crypto';
import logger from '../utils/logger';
import notificationHelper from '../utils/notificationHelper';

class PaymentService {

  private paystackSecretKey: string;
  private paystackBaseUrl: string;

  constructor() {
    this.paystackSecretKey = config.paystack.secretKey;
    this.paystackBaseUrl = 'https://api.paystack.co';
  }

  // ==================== BOOKING PAYMENT METHODS ====================

  /**
   * Initialize payment for booking
   */
  public async initializePayment(
    userId: string,
    bookingId: string,
    metadata?: any
  ): Promise<{ payment: IPayment; authorizationUrl: string; accessCode: string }> {
    // Get booking
    const booking = await Booking.findById(bookingId).populate('service');
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify ownership
    if (booking.client.toString() !== userId) {
      throw new BadRequestError('You can only pay for your own bookings');
    }

    // Check if already paid
    if (booking.paymentStatus === 'escrowed') {
      throw new BadRequestError('This booking has already been paid');
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get vendor's commission rate from subscription
    const commissionRate = await subscriptionService.getCommissionRate(
      booking.vendor.toString()
    );

    // Calculate fees
    const platformFee = Math.round((booking.totalAmount * commissionRate) / 100);
    const vendorAmount = booking.totalAmount - platformFee;

    // Generate payment reference
    const reference = `PAY-${Date.now()}-${generateRandomString(8)}`;

    // Initialize Paystack payment
    const paystackResponse = await axios.post(
      `${this.paystackBaseUrl}/transaction/initialize`,
      {
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
      },
      {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { authorization_url, access_code } = paystackResponse.data.data;

    // Create payment record
    const payment = await Payment.create({
      user: userId,
      booking: bookingId,
      amount: booking.totalAmount,
      currency: 'NGN',
      status: PaymentStatus.PENDING,
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

    logger.info(`Payment initialized: ${reference} for booking ${bookingId}`);

    return {
      payment,
      authorizationUrl: authorization_url,
      accessCode: access_code,
    };
  }

  /**
   * Verify Paystack payment webhook
   */
  public verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
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
public async handlePaystackWebhook(event: any): Promise<void> {
  const { event: eventType, data } = event;

  console.log('📩 Paystack webhook received:', eventType);
  console.log('📦 Webhook data:', JSON.stringify(data, null, 2));

  if (eventType === 'charge.success') {
    console.log('✅ Routing to handleSuccessfulPayment');
    await this.handleSuccessfulPayment(data);
    console.log('✅ handleSuccessfulPayment completed');
    
  } else if (eventType === 'transfer.success') {
    await this.handleSuccessfulTransfer(data);
    
  } else if (eventType === 'transfer.failed') {
    await this.handleFailedTransfer(data);
    
  } else {
    logger.info(`ℹ️ Unhandled webhook event: ${eventType}`);
  }
}

// ==================== YOUR handleSuccessfulPayment IS ALREADY GOOD! ====================
// BUT ADD THESE LOGS TO DEBUG:

private async handleSuccessfulPayment(data: any): Promise<void> {
  const { reference, authorization } = data;

  console.log('🔍 Processing payment for reference:', reference);

  // Find payment
  const payment = await Payment.findOne({ reference });
  if (!payment) {
    logger.error(`❌ Payment not found for reference: ${reference}`);
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
  payment.status = PaymentStatus.COMPLETED;
  payment.escrowStatus = 'held';
  payment.paidAt = new Date();
  payment.escrowedAt = new Date();
  payment.paystackReference = reference;
  payment.authorizationCode = authorization?.authorization_code;
  await payment.save();

  console.log('✅ Payment record updated to COMPLETED');

  // ✅ CREATE TRANSACTION FOR CLIENT PAYMENT
  const user = await User.findById(payment.user);
  if (user) {
    const balanceBefore = user.walletBalance || 0;
    const balanceAfter = balanceBefore;

    await Transaction.create({
      user: payment.user,
      type: payment.booking ? TransactionType.BOOKING_PAYMENT : TransactionType.ORDER_PAYMENT,
      amount: payment.amount,
      balanceBefore,
      balanceAfter,
      status: PaymentStatus.COMPLETED,
      reference: `TXN-PAY-${Date.now()}-${generateRandomString(8)}`,
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
    
    const booking = await Booking.findById(payment.booking);
    if (booking) {
      console.log('📋 Current booking payment status:', booking.paymentStatus);
      
      booking.paymentStatus = 'escrowed';
      await booking.save();

      console.log('✅✅✅ BOOKING PAYMENT STATUS UPDATED TO ESCROWED ✅✅✅');
      console.log('📋 Booking ID:', booking._id);
      console.log('💳 New Payment Status:', booking.paymentStatus);

      // ✅ Notify client about successful payment
      try {
        await notificationHelper.notifyPaymentSuccessful(
          payment,
          booking.client.toString()
        );
        console.log('✅ Client notification sent');
      } catch (notifyError) {
        logger.error('Failed to notify client about payment success:', notifyError);
      }

      // ✅ Notify vendor that payment is in escrow
      try {
        await notificationHelper.notifyPaymentReceived(
          payment,
          booking.vendor.toString()
        );
        console.log('✅ Vendor notification sent');
      } catch (notifyError) {
        logger.error('Failed to notify vendor about payment:', notifyError);
      }
    } else {
      console.error('❌ Booking not found with ID:', payment.booking);
    }
  } else {
    console.log('ℹ️ No booking associated with this payment');
  }

  // Update order if exists
  if (payment.order) {
    console.log('📦 Processing order payment...');
    const order = await Order.findById(payment.order);
    if (order) {
      order.isPaid = true;
      order.paidAt = new Date();
      order.escrowStatus = 'locked';
      order.escrowedAt = new Date();
      order.status = OrderStatus.PROCESSING;
      order.statusHistory.push({
        status: OrderStatus.PROCESSING,
        updatedBy: order.customer,
        updatedAt: new Date(),
        note: 'Payment confirmed via webhook',
      });
      await order.save();

      console.log('✅ Order payment status updated');

      // ✅ Notify customer about successful order payment
      try {
        await notificationHelper.notifyPaymentSuccessful(
          payment,
          order.customer.toString()
        );
      } catch (notifyError) {
        logger.error('Failed to notify customer about payment success:', notifyError);
      }
    }
  }

  logger.info(`Payment successful: ${reference}`);
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
  public async verifyPayment(reference: string): Promise<IPayment> {
    // Verify with Paystack
    const paystackResponse = await axios.get(
      `${this.paystackBaseUrl}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
        },
      }
    );

    const { status, authorization } = paystackResponse.data.data;

    // Find payment
    const payment = await Payment.findOne({ reference });
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Update payment based on status
    if (status === 'success') {
      payment.status = PaymentStatus.COMPLETED;
      payment.escrowStatus = 'held';
      payment.paidAt = new Date();
      payment.escrowedAt = new Date();
      payment.paystackReference = reference;
      payment.authorizationCode = authorization?.authorization_code;
      await payment.save();

      // Update booking
      const booking = await Booking.findById(payment.booking);
      if (booking) {
        booking.paymentStatus = 'escrowed';
        await booking.save();

        // ✅ Notify about successful payment
        try {
          await notificationHelper.notifyPaymentSuccessful(
            payment,
            booking.client.toString()
          );
        } catch (notifyError) {
          logger.error('Failed to notify about payment success:', notifyError);
        }
      }
    } else {
      payment.status = PaymentStatus.FAILED;
      await payment.save();

      // ✅ Notify about failed payment
      if (payment.user) {
        try {
          await notificationHelper.notifyPaymentFailed(
            payment,
            payment.user.toString(),
            'Payment verification failed'
          );
        } catch (notifyError) {
          logger.error('Failed to notify about payment failure:', notifyError);
        }
      }
    }

    logger.info(`Payment verified: ${reference} - ${status}`);

    return payment;
  }

  /**
   * Release payment to vendor - CREATE TRANSACTION FOR VENDOR EARNING
   */
  public async releasePayment(bookingId: string): Promise<IPayment> {
    const booking = await Booking.findById(bookingId).populate('vendor');
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Get payment
    const payment = await Payment.findOne({ booking: bookingId });
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Check if already released
    if (payment.escrowStatus === 'released') {
      throw new BadRequestError('Payment already released');
    }

    // Check booking status
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestError('Booking must be completed before releasing payment');
    }

    // Update payment
    payment.status = PaymentStatus.RELEASED;
    payment.escrowStatus = 'released';
    payment.releasedAt = new Date();
    payment.vendorPaidAt = new Date();
    await payment.save();

    // Credit vendor wallet
    const vendor = await User.findById(booking.vendor);
    if (vendor) {
      const previousBalance = vendor.walletBalance || 0;
      const amountToCredit = payment.vendorAmount || 0;
      vendor.walletBalance = previousBalance + amountToCredit;
      await vendor.save();

      // ✅ CREATE TRANSACTION FOR VENDOR EARNING
      await Transaction.create({
        user: vendor._id,
        type: TransactionType.BOOKING_EARNING,
        amount: amountToCredit,
        balanceBefore: previousBalance,
        balanceAfter: vendor.walletBalance,
        status: PaymentStatus.COMPLETED,
        reference: `TXN-EARN-${Date.now()}-${generateRandomString(8)}`,
        description: `Earnings from booking #${booking._id.toString().slice(-8)}`,
        booking: booking._id,
        payment: payment._id,
        metadata: {
          platformFee: payment.platformFee,
          commissionRate: payment.commissionRate,
          originalAmount: payment.amount,
        },
      });

      logger.info(`✅ Transaction created for vendor earning: ${amountToCredit}`);

      // ✅ Notify vendor about payment received in wallet
      try {
        await notificationHelper.notifyPaymentReceived(
          payment,
          vendor._id.toString()
        );
      } catch (notifyError) {
        logger.error('Failed to notify vendor about payment release:', notifyError);
      }
    }

    // Update booking
    booking.paymentStatus = 'released';
    await booking.save();

    logger.info(`Payment released to vendor: ${payment.reference}`);

    return payment;
  }

  /**
   * Refund payment - CREATE TRANSACTION FOR CLIENT REFUND
   */
  public async refundPayment(
    bookingId: string,
    refundedBy: string,
    reason?: string
  ): Promise<IPayment> {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Get payment
    const payment = await Payment.findOne({ booking: bookingId });
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Check if already refunded
    if (payment.escrowStatus === 'refunded') {
      throw new BadRequestError('Payment already refunded');
    }

    // Update payment
    payment.status = PaymentStatus.REFUNDED;
    payment.escrowStatus = 'refunded';
    payment.refundedAt = new Date();
    payment.refundAmount = payment.amount;
    payment.refundReason = reason;
    payment.refundedBy = refundedBy as any;
    await payment.save();

    // Credit client wallet
    const client = await User.findById(booking.client);
    if (client) {
      const previousBalance = client.walletBalance || 0;
      client.walletBalance = previousBalance + payment.amount;
      await client.save();

      // ✅ CREATE TRANSACTION FOR CLIENT REFUND
      await Transaction.create({
        user: client._id,
        type: TransactionType.BOOKING_REFUND,
        amount: payment.amount,
        balanceBefore: previousBalance,
        balanceAfter: client.walletBalance,
        status: PaymentStatus.COMPLETED,
        reference: `TXN-REFUND-${Date.now()}-${generateRandomString(8)}`,
        description: `Refund for cancelled booking #${booking._id.toString().slice(-8)}`,
        booking: booking._id,
        payment: payment._id,
        metadata: {
          refundReason: reason,
          refundedBy,
        },
      });

      logger.info(`✅ Transaction created for refund: ${payment.amount}`);

      // ✅ Notify client about refund
      try {
        await notificationHelper.notifyPaymentRefunded(
          payment,
          client._id.toString()
        );
      } catch (notifyError) {
        logger.error('Failed to notify client about refund:', notifyError);
      }
    }

    // Update booking
    booking.paymentStatus = 'refunded';
    await booking.save();

    logger.info(`Payment refunded: ${payment.reference}`);

    return payment;
  }

  /**
   * Get payment by ID
   */
  public async getPaymentById(paymentId: string): Promise<IPayment> {
    const payment = await Payment.findById(paymentId)
      .populate('user', 'firstName lastName email')
      .populate('booking')
      .populate('order');

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    return payment;
  }

  /**
   * Get user payments
   */
  public async getUserPayments(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ payments: IPayment[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find({ user: userId })
        .populate('booking', 'service scheduledDate status')
        .populate('order', 'orderNumber status totalAmount')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Payment.countDocuments({ user: userId }),
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
  public async payOrderFromWallet(
    orderId: string,
    customerId: string
  ): Promise<{ order: any; payment: any }> {
    // Get order
    const order = await Order.findById(orderId).populate('seller');
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Verify ownership
    if (order.customer.toString() !== customerId) {
      throw new BadRequestError('You can only pay for your own orders');
    }

    // Check if already paid
    if (order.isPaid) {
      throw new BadRequestError('This order has already been paid');
    }

    // Get customer
    const customer = await User.findById(customerId);
    if (!customer) {
      throw new NotFoundError('User not found');
    }

    // Check wallet balance
    if ((customer.walletBalance || 0) < order.totalAmount) {
      throw new BadRequestError(
        `Insufficient wallet balance. Your balance: ₦${(customer.walletBalance || 0).toLocaleString()}, Required: ₦${order.totalAmount.toLocaleString()}`
      );
    }

    // Calculate platform fee
    const platformFeeRate = 5; // 5% platform fee
    const platformFee = Math.round((order.totalAmount * platformFeeRate) / 100);
    const sellerAmount = order.totalAmount - platformFee;

    // Generate payment reference
    const reference = `WALLET-ORD-${Date.now()}-${generateRandomString(8)}`;

    // Deduct from wallet
    const previousBalance = customer.walletBalance || 0;
    customer.walletBalance = previousBalance - order.totalAmount;
    await customer.save();

    // Create payment record
    const payment = await Payment.create({
      user: customerId,
      order: orderId,
      amount: order.totalAmount,
      currency: 'NGN',
      status: PaymentStatus.COMPLETED,
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
    await transactionService.createTransaction({
      userId: customerId,
      type: TransactionType.ORDER_PAYMENT,
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
    order.status = OrderStatus.PROCESSING;
    order.paymentReference = reference;
    
    order.statusHistory.push({
      status: OrderStatus.PROCESSING,
      updatedBy: order.customer,
      updatedAt: new Date(),
      note: 'Payment confirmed via wallet',
    });
    
    await order.save();

    logger.info(`💰 Wallet payment successful: ${reference} for order ${orderId}`);

    // Notify customer
    await notificationHelper.notifyPaymentSuccessful(payment, customerId);

    // Notify seller (payment in escrow)
    if (order.seller) {
      logger.info(`Seller ${order.seller._id} notified about new paid order`);
    }

    return { order, payment };
  }

  /**
   * Check if customer can pay order from wallet
   */
  public async canPayOrderFromWallet(
    orderId: string,
    customerId: string
  ): Promise<{ canPay: boolean; balance: number; required: number; shortfall: number }> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.customer.toString() !== customerId) {
      throw new BadRequestError('Not authorized');
    }

    const customer = await User.findById(customerId);
    if (!customer) {
      throw new NotFoundError('User not found');
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
  public async initializeOrderPayment(
    userId: string,
    orderId: string,
    metadata?: any
  ): Promise<{ payment: IPayment; authorizationUrl: string; reference: string; accessCode: string }> {
    // Get order
    const order = await Order.findById(orderId)
      .populate('customer', 'email firstName lastName')
      .populate('seller', 'email firstName lastName');
      
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Verify ownership
    if (order.customer._id.toString() !== userId) {
      throw new BadRequestError('You can only pay for your own orders');
    }

    // Check if already paid
    if (order.isPaid) {
      throw new BadRequestError('This order has already been paid');
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Calculate platform fee (5% default or from config)
    const platformFeeRate = config.platformFeeRate || 5;
    const platformFee = Math.round((order.totalAmount * platformFeeRate) / 100);
    const sellerAmount = order.totalAmount - platformFee;

    // Use existing payment reference or generate new one
    const reference = order.paymentReference || `ORD-PAY-${Date.now()}-${generateRandomString(8)}`;

    // Initialize Paystack payment
    const paystackResponse = await axios.post(
      `${this.paystackBaseUrl}/transaction/initialize`,
      {
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
      },
      {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { authorization_url, access_code } = paystackResponse.data.data;

    // Create payment record
    const payment = await Payment.create({
      user: userId,
      order: orderId,
      amount: order.totalAmount,
      currency: 'NGN',
      status: PaymentStatus.PENDING,
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

    logger.info(`Order payment initialized: ${reference} for order ${orderId}`);

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
  public async verifyOrderPayment(
    orderId: string,
    reference: string
  ): Promise<{ payment: IPayment; order: any }> {
    // Verify with Paystack
    const paystackResponse = await axios.get(
      `${this.paystackBaseUrl}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
        },
      }
    );

    const { status, authorization } = paystackResponse.data.data;

    // Find payment
    const payment = await Payment.findOne({ reference });
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Get order
    const order = await Order.findById(orderId)
      .populate('customer', 'firstName lastName email')
      .populate('seller', 'firstName lastName email')
      .populate('items.product', 'name images');
      
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Update payment and order based on status
    if (status === 'success') {
      payment.status = PaymentStatus.COMPLETED;
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
      order.status = OrderStatus.PROCESSING;
      
      // Add status update to history
      order.statusHistory.push({
        status: OrderStatus.PROCESSING,
        updatedBy: order.customer._id,
        updatedAt: new Date(),
        note: 'Payment confirmed - order confirmed',
      });
      
      await order.save();

      // ✅ Notify customer about successful payment
      try {
        await notificationHelper.notifyPaymentSuccessful(
          payment,
          order.customer._id.toString()
        );
      } catch (notifyError) {
        logger.error('Failed to notify customer about payment success:', notifyError);
      }

      logger.info(`Order payment successful: ${reference} for order ${orderId}`);
    } else if (status === 'failed') {
      payment.status = PaymentStatus.FAILED;
      await payment.save();

      // ✅ Notify about failed payment
      try {
        await notificationHelper.notifyPaymentFailed(
          payment,
          order.customer._id.toString(),
          'Payment verification failed'
        );
      } catch (notifyError) {
        logger.error('Failed to notify about payment failure:', notifyError);
      }
      
      logger.warn(`Order payment failed: ${reference} for order ${orderId}`);
    }

    return { payment, order };
  }

  /**
   * Release payment to seller after order completion
   */
  public async releaseOrderPayment(
    orderId: string,
    _releasedBy: string
  ): Promise<IPayment> {
    const order = await Order.findById(orderId).populate('seller');
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Get payment
    const payment = await Payment.findOne({ order: orderId });
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Check if already released
    if (payment.escrowStatus === 'released') {
      throw new BadRequestError('Payment already released');
    }

    // Check if paid
    if (!order.isPaid) {
      throw new BadRequestError('Order must be paid before releasing payment');
    }

    // Check order status
    const canRelease = 
      order.status === OrderStatus.COMPLETED || 
      (order.customerConfirmedDelivery && order.sellerConfirmedDelivery);
      
    if (!canRelease) {
      throw new BadRequestError('Order must be completed before releasing payment');
    }

    // Update payment
    payment.status = PaymentStatus.RELEASED;
    payment.escrowStatus = 'released';
    payment.releasedAt = new Date();
    payment.vendorPaidAt = new Date();
    await payment.save();

    // Credit seller wallet
    const seller = await User.findById(order.seller);
    if (seller) {
      const previousBalance = seller.walletBalance || 0;
      const amountToCredit = payment.vendorAmount || 0;
      seller.walletBalance = previousBalance + amountToCredit;
      await seller.save();

      // ✅ CREATE TRANSACTION FOR SELLER EARNING
      await Transaction.create({
        user: seller._id,
        type: TransactionType.ORDER_EARNING,
        amount: amountToCredit,
        balanceBefore: previousBalance,
        balanceAfter: seller.walletBalance,
        status: PaymentStatus.COMPLETED,
        reference: `TXN-ORDER-${Date.now()}-${generateRandomString(8)}`,
        description: `Earnings from order #${order.orderNumber}`,
        order: order._id,
        payment: payment._id,
        metadata: {
          platformFee: payment.platformFee,
          commissionRate: payment.commissionRate,
          originalAmount: payment.amount,
        },
      });

      logger.info(`✅ Transaction created for order earning: ${amountToCredit}`);

      // ✅ Notify seller about payment received
      try {
        await notificationHelper.notifyPaymentReceived(
          payment,
          seller._id.toString()
        );
      } catch (notifyError) {
        logger.error('Failed to notify seller about payment release:', notifyError);
      }
    }

    // Update order
    order.escrowStatus = 'released';
    order.escrowReleaseDate = new Date();
    await order.save();

    logger.info(`Order payment released to seller: ${payment.reference}`);

    return payment;
  }

  /**
   * Refund order payment
   */
  public async refundOrderPayment(
    orderId: string,
    refundedBy: string,
    reason?: string
  ): Promise<IPayment> {
    const order = await Order.findById(orderId).populate('customer');
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Get payment
    const payment = await Payment.findOne({ order: orderId });
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Check if already refunded
    if (payment.escrowStatus === 'refunded') {
      throw new BadRequestError('Payment already refunded');
    }

    // Check if already released to seller
    if (payment.escrowStatus === 'released') {
      throw new BadRequestError('Cannot refund payment that has been released to seller');
    }

    // Update payment
    payment.status = PaymentStatus.REFUNDED;
    payment.escrowStatus = 'refunded';
    payment.refundedAt = new Date();
    payment.refundAmount = payment.amount;
    payment.refundReason = reason;
    payment.refundedBy = refundedBy as any;
    await payment.save();

    // Credit customer wallet
    const customer = await User.findById(order.customer);
    if (customer) {
      const previousBalance = customer.walletBalance || 0;
      customer.walletBalance = previousBalance + payment.amount;
      await customer.save();

      // ✅ CREATE TRANSACTION FOR ORDER REFUND
      await Transaction.create({
        user: customer._id,
        type: TransactionType.ORDER_REFUND,
        amount: payment.amount,
        balanceBefore: previousBalance,
        balanceAfter: customer.walletBalance,
        status: PaymentStatus.COMPLETED,
        reference: `TXN-REFUND-${Date.now()}-${generateRandomString(8)}`,
        description: `Refund for cancelled order #${order.orderNumber}`,
        order: order._id,
        payment: payment._id,
        metadata: {
          refundReason: reason,
          refundedBy,
        },
      });

      logger.info(`✅ Transaction created for order refund: ${payment.amount}`);

      // ✅ Notify customer about refund
      try {
        await notificationHelper.notifyPaymentRefunded(
          payment,
          customer._id.toString()
        );
      } catch (notifyError) {
        logger.error('Failed to notify customer about refund:', notifyError);
      }
    }

    // Update order
    order.escrowStatus = 'refunded';
    await order.save();

    logger.info(`Order payment refunded: ${payment.reference}`);

    return payment;
  }

  // ==================== TRANSFER/WITHDRAWAL HANDLERS ====================

  /**
   * Handle successful transfer (withdrawal)
   */
  private async handleSuccessfulTransfer(data: any): Promise<void> {
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
        await notificationHelper.notifyWithdrawalApproved(
          withdrawal,
          withdrawal.user.toString()
        );
      } catch (notifyError) {
        logger.error('Failed to notify about withdrawal success:', notifyError);
      }
      
      logger.info(`Transfer successful: ${reference}`);
    }
  }

  /**
   * Handle failed transfer
   */
  private async handleFailedTransfer(data: any): Promise<void> {
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
      const user = await User.findById(withdrawal.user);
      if (user) {
        user.walletBalance = (user.walletBalance || 0) + withdrawal.amount;
        await user.save();
      }

      // ✅ Notify user about failed withdrawal
      try {
        await notificationHelper.notifyWithdrawalRejected(
          withdrawal,
          withdrawal.user.toString(),
          'Transfer failed - Amount refunded to wallet'
        );
      } catch (notifyError) {
        logger.error('Failed to notify about withdrawal failure:', notifyError);
      }
      
      logger.error(`Transfer failed: ${reference}`);
    }
  }
}

export default new PaymentService();