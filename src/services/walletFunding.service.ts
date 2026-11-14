import axios from 'axios';
import User from '../models/User';
import Payment, { IPayment } from '../models/Payment';
import Transaction from '../models/Transaction';
import config from '../config';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { generateRandomString } from '../utils/helpers';
import { TransactionType, PaymentStatus } from '../types';
import logger from '../utils/logger';
import notificationHelper from '../utils/notificationHelper';

class WalletFundingService {
  private paystackSecretKey: string;
  private paystackBaseUrl: string;

  constructor() {
    this.paystackSecretKey = config.paystack.secretKey;
    this.paystackBaseUrl = 'https://api.paystack.co';
  }

  /**
   * Initialize wallet funding via Paystack
   */
  public async initializeWalletFunding(
    userId: string,
    amount: number,
    metadata?: any
  ): Promise<{
    payment: IPayment;
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  }> {
    // Validate amount
    if (amount < 100) {
      throw new BadRequestError('Minimum funding amount is ₦100');
    }

    if (amount > 1000000) {
      throw new BadRequestError('Maximum funding amount is ₦1,000,000');
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Generate payment reference
    const reference = `WALLET-FUND-${Date.now()}-${generateRandomString(8)}`;

    try {
      // Initialize Paystack payment
      const paystackResponse = await axios.post(
        `${this.paystackBaseUrl}/transaction/initialize`,
        {
          email: user.email,
          amount: amount * 100, // Convert to kobo
          reference,
          currency: 'NGN',
          callback_url: `lookreal://wallet/funding/verify`,
          metadata: {
            userId: user._id.toString(),
            type: 'wallet_funding',
            purpose: 'Wallet Top-up',
            ...metadata,
          },
          channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { authorization_url, access_code } = paystackResponse.data.data;

      // ✅ NEW (add paymentType):
const payment = await Payment.create({
  user: userId,
  amount,
  currency: 'NGN',
  paymentMethod: 'card',
  status: 'pending',
  reference,
  paymentType: 'wallet_funding', // ✅ ADD THIS LINE
  metadata: {
    ...metadata,
    authorizationUrl: paystackResponse.data.authorization_url,
    accessCode: paystackResponse.data.access_code,
  },
});

      logger.info(`Wallet funding initialized: ${reference} for user ${userId} - Amount: ₦${amount}`);

      return {
        payment,
        authorizationUrl: authorization_url,
        accessCode: access_code,
        reference,
      };
    } catch (error: any) {
      logger.error('Wallet funding initialization failed:', error);
      
      if (error.response?.data) {
        throw new BadRequestError(
          error.response.data.message || 'Failed to initialize wallet funding'
        );
      }
      
      throw new BadRequestError('Failed to initialize wallet funding. Please try again.');
    }
  }

  /**
   * Verify wallet funding payment
   */
  public async verifyWalletFunding(reference: string): Promise<{
    payment: IPayment;
    user: any;
    success: boolean;
  }> {
    try {
      // Verify with Paystack
      const paystackResponse = await axios.get(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        }
      );

      const { status, authorization, amount } = paystackResponse.data.data;

      // Find payment
      const payment = await Payment.findOne({ reference });
      if (!payment) {
        throw new NotFoundError('Payment not found');
      }

      // Get user
      const user = await User.findById(payment.user);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Update payment and credit wallet based on status
      if (status === 'success') {
        // Prevent double crediting
        if (payment.status === PaymentStatus.COMPLETED) {
          logger.warn(`Payment already completed: ${reference}`);
          return { payment, user, success: true };
        }

        const fundAmount = amount / 100; // Convert from kobo to naira

        const result = await this.completeFundingAndCredit(
          payment._id,
          reference,
          authorization,
          fundAmount,
          'verify'
        );

        if (!result) {
          // Another process (webhook or reconciliation) completed it first
          logger.warn(`Payment already completed: ${reference}`);
          const fresh = await Payment.findById(payment._id);
          const freshUser = await User.findById(payment.user);
          return { payment: fresh || payment, user: freshUser || user, success: true };
        }

        logger.info(
          `✅ Wallet funded successfully: ${reference} - User: ${result.user._id} - Amount: ₦${fundAmount} - New Balance: ₦${result.user.walletBalance}`
        );

        // Notify user about successful funding
        try {
          await notificationHelper.notifyWalletFunded(result.payment, result.user._id.toString(), fundAmount);
        } catch (notifyError) {
          logger.error('Failed to notify user about wallet funding:', notifyError);
        }

        return { payment: result.payment, user: result.user, success: true };
      } else if (status !== 'failed' && status !== 'reversed') {
        // Still in progress on Paystack ('ongoing', 'pending', 'processing',
        // 'abandoned' = checkout not finished yet, e.g. a bank transfer that
        // hasn't landed). Leave it PENDING so the webhook or the reconciliation
        // cron can still finish it — marking it failed here used to strand it.
        logger.info(`Wallet funding not complete yet: ${reference} - Paystack status: ${status}`);
        return { payment, user, success: false };
      } else {
        // Payment failed. The app re-checks automatically, so only mark and
        // notify once — don't push "funding failed" on every check.
        if (payment.status === PaymentStatus.FAILED) {
          return { payment, user, success: false };
        }
        payment.status = PaymentStatus.FAILED;
        await payment.save();

        logger.warn(`Wallet funding failed: ${reference} - Status: ${status}`);

        // Notify user about failed funding
        try {
          await notificationHelper.notifyPaymentFailed(
            payment,
            user._id.toString(),
            'Wallet funding failed'
          );
        } catch (notifyError) {
          logger.error('Failed to notify user about funding failure:', notifyError);
        }

        return { payment, user, success: false };
      }
    } catch (error: any) {
      logger.error('Wallet funding verification failed:', error);
      
      if (error.response?.data) {
        throw new BadRequestError(
          error.response.data.message || 'Failed to verify wallet funding'
        );
      }
      
      throw error;
    }
  }

  /**
   * Process wallet funding from webhook (called by Paystack)
   */
  public async processWalletFundingWebhook(data: any): Promise<void> {
    const { reference, authorization } = data;

    // Find payment
    const payment = await Payment.findOne({ reference });
    if (!payment) {
      logger.error(`Payment not found for webhook reference: ${reference}`);
      return;
    }

    // Check if it's a wallet funding payment. Don't rely on metadata.type alone:
    // it's only present when the app passes it, and top-ups started from the
    // booking and checkout screens never did — so the webhook (and the
    // reconciliation cron) silently skipped them and wallets were never credited.
    const isWalletFunding =
      payment.paymentType === 'wallet_funding' ||
      payment.metadata?.type === 'wallet_funding' ||
      reference.startsWith('WALLET-FUND-');
    if (!isWalletFunding) {
      logger.info(`Skipping non-wallet-funding payment: ${reference}`);
      return;
    }

    // Prevent double processing
    if (payment.status === PaymentStatus.COMPLETED) {
      logger.warn(`Payment already processed: ${reference}`);
      return;
    }

    // Get user
    const user = await User.findById(payment.user);
    if (!user) {
      logger.error(`User not found for payment: ${reference}`);
      return;
    }

    const result = await this.completeFundingAndCredit(
      payment._id,
      reference,
      authorization,
      payment.amount,
      'webhook'
    );

    if (!result) {
      // Another process (app verify or reconciliation) completed it first
      logger.warn(`Payment already processed: ${reference}`);
      return;
    }

    logger.info(
      `✅ Wallet funded via webhook: ${reference} - User: ${result.user._id} - Amount: ₦${payment.amount}`
    );

    // Notify user
    try {
      await notificationHelper.notifyWalletFunded(result.payment, result.user._id.toString(), payment.amount);
    } catch (notifyError) {
      logger.error('Failed to notify user about wallet funding:', notifyError);
    }
  }

  /**
   * Atomically mark a wallet-funding payment completed and credit the wallet.
   * Returns null if the payment was already completed by someone else, so the
   * webhook, the app's verify call and the reconciliation cron can never credit
   * the same payment twice. The balance uses $inc so concurrent wallet changes
   * aren't overwritten.
   */
  private async completeFundingAndCredit(
    paymentId: any,
    reference: string,
    authorization: any,
    fundAmount: number,
    processedVia: 'verify' | 'webhook'
  ): Promise<{ payment: IPayment; user: any } | null> {
    const payment = await Payment.findOneAndUpdate(
      { _id: paymentId, status: { $ne: PaymentStatus.COMPLETED } },
      {
        $set: {
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
          paystackReference: reference,
          authorizationCode: authorization?.authorization_code,
        },
      },
      { new: true }
    );
    if (!payment) return null;

    const user = await User.findByIdAndUpdate(
      payment.user,
      { $inc: { walletBalance: fundAmount } },
      { new: true }
    );
    if (!user) {
      logger.error(`⚠️ Payment ${reference} marked completed but user ${payment.user} not found — wallet NOT credited`);
      throw new NotFoundError('User not found');
    }

    const newBalance = user.walletBalance || 0;

    // DEPOSIT = user paid via card themselves
    await Transaction.create({
      user: user._id,
      type: TransactionType.DEPOSIT,
      amount: fundAmount,
      balanceBefore: newBalance - fundAmount,
      balanceAfter: newBalance,
      status: PaymentStatus.COMPLETED,
      reference: `TXN-FUND-${Date.now()}-${generateRandomString(8)}`,
      description: `Wallet top-up via ${payment.paymentMethod}`,
      payment: payment._id,
      metadata: {
        paymentMethod: payment.paymentMethod,
        paystackReference: reference,
        fundingType: 'card_payment',
        processedVia,
      },
    });

    return { payment, user };
  }

  /**
   * Recent successful card payments and manual credits for a user (Admin only).
   * Shown on the admin Wallet Top-Up page so admins can see a user has already
   * paid before crediting them manually.
   */
  public async getCreditCheck(userId: string, days: number = 14): Promise<{
    cardPayments: any[];
    manualCredits: any[];
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [cardPayments, manualCredits] = await Promise.all([
      Payment.find({
        user: userId,
        paymentMethod: 'card',
        status: PaymentStatus.COMPLETED,
        createdAt: { $gte: since },
      })
        .select('reference amount paymentType paidAt createdAt booking order metadata.paymentType')
        .populate('booking', 'status scheduledDate totalAmount')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Transaction.find({
        user: userId,
        type: TransactionType.WALLET_CREDIT,
        createdAt: { $gte: since },
      })
        .select('reference amount description createdAt')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    return {
      cardPayments: cardPayments.map((p: any) => ({
        reference: p.reference,
        amount: p.amount,
        paymentType: p.paymentType || p.metadata?.paymentType || null,
        paidAt: p.paidAt || p.createdAt,
        booking: p.booking
          ? { _id: p.booking._id, status: p.booking.status, scheduledDate: p.booking.scheduledDate }
          : null,
        hasOrder: !!p.order,
      })),
      manualCredits,
    };
  }

  /**
   * Direct wallet credit (Admin only)
   * Used for manual credits, bonuses, refunds, etc.
   */
  public async creditWallet(
    userId: string,
    amount: number,
    description: string,
    adminId: string,
    metadata?: any
  ): Promise<{
    user: any;
    transaction: any;
    previousBalance: number;
    newBalance: number;
  }> {
    // Validate amount
    if (amount <= 0) {
      throw new BadRequestError('Credit amount must be greater than zero');
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Credit wallet
    const previousBalance = user.walletBalance || 0;
    user.walletBalance = previousBalance + amount;
    await user.save();

    // Create transaction record
    const transaction = await Transaction.create({
      user: userId,
      type: TransactionType.WALLET_CREDIT,
      amount,
      balanceBefore: previousBalance,
      balanceAfter: user.walletBalance,
      status: PaymentStatus.COMPLETED,
      reference: `TXN-CREDIT-${Date.now()}-${generateRandomString(8)}`,
      description: description || `Wallet credited by admin`,
      metadata: {
        creditedBy: adminId,
        creditType: 'manual_credit',
        ...metadata,
      },
    });

    logger.info(
      `✅ Wallet credited manually: User ${userId} - Amount: ₦${amount} - By Admin: ${adminId}`
    );

    return {
      user,
      transaction,
      previousBalance,
      newBalance: user.walletBalance,
    };
  }

  /**
   * Direct wallet debit (Admin only)
   * Used for manual debits, corrections, chargebacks, etc.
   */
  public async debitWallet(
    userId: string,
    amount: number,
    description: string,
    adminId: string,
    metadata?: any
  ): Promise<{
    user: any;
    transaction: any;
    previousBalance: number;
    newBalance: number;
  }> {
    // Validate amount
    if (amount <= 0) {
      throw new BadRequestError('Debit amount must be greater than zero');
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check balance
    const currentBalance = user.walletBalance || 0;
    if (currentBalance < amount) {
      throw new BadRequestError(
        `Insufficient balance. Current: ₦${currentBalance}, Required: ₦${amount}`
      );
    }

    // Debit wallet
    const previousBalance = user.walletBalance;
    user.walletBalance = previousBalance - amount;
    await user.save();

    // Create transaction record
    const transaction = await Transaction.create({
      user: userId,
      type: TransactionType.WALLET_DEBIT,
      amount,
      balanceBefore: previousBalance,
      balanceAfter: user.walletBalance,
      status: PaymentStatus.COMPLETED,
      reference: `TXN-DEBIT-${Date.now()}-${generateRandomString(8)}`,
      description: description || `Wallet debited by admin`,
      metadata: {
        debitedBy: adminId,
        debitType: 'manual_debit',
        ...metadata,
      },
    });

    logger.info(
      `✅ Wallet debited manually: User ${userId} - Amount: ₦${amount} - By Admin: ${adminId}`
    );

    return {
      user,
      transaction,
      previousBalance,
      newBalance: user.walletBalance,
    };
  }

  /**
   * Get wallet funding history
   */
  public async getFundingHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    transactions: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const query = {
      user: userId,
      type: TransactionType.WALLET_CREDIT,
      status: PaymentStatus.COMPLETED,
    };

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('payment', 'reference paymentMethod amount')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Transaction.countDocuments(query),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export default new WalletFundingService();