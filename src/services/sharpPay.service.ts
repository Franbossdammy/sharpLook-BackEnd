import axios from 'axios';
import User from '../models/User';
import Transaction, { ITransaction } from '../models/Transaction';
import Withdrawal, { IWithdrawal } from '../models/Withdrawal';
import config from '../config';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { generateRandomString, parsePaginationParams } from '../utils/helpers';
import { TransactionType, PaymentStatus } from '../types';
import logger from '../utils/logger';
import notificationHelper from '../utils/notificationHelper';

class SharpPayService {
  private paystackSecretKey: string;
  private paystackBaseUrl: string;

  constructor() {
    this.paystackSecretKey = config.paystack.secretKey;
    this.paystackBaseUrl = 'https://api.paystack.co';
  }

  // ==================== WALLET BALANCE ====================

  /**
   * Get wallet balance
   */
  public async getBalance(userId: string): Promise<{
    balance: number;
    currency: string;
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      balance: user.walletBalance || 0,
      currency: 'NGN',
    };
  }

  // ==================== DEPOSIT/FUND WALLET ====================

  /**
   * Initialize wallet deposit/funding
   */
  public async initializeDeposit(
    userId: string,
    amount: number,
    metadata?: any
  ): Promise<{
    authorizationUrl: string;
    reference: string;
    accessCode: string;
  }> {
    // Validate amount
    if (amount < 100) {
      throw new BadRequestError('Minimum deposit is ₦100');
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Generate reference
    const reference = `WALLET-DEP-${Date.now()}-${generateRandomString(8)}`;

    // Initialize Paystack payment
    const paystackResponse = await axios.post(
      `${this.paystackBaseUrl}/transaction/initialize`,
      {
        email: user.email,
        amount: amount * 100, // Convert to kobo
        reference,
        currency: 'NGN',
        callback_url: `sharpLook://wallet/deposit/verify`,
        metadata: {
          userId: user._id.toString(),
          type: 'wallet_deposit',
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

    // Create pending transaction
    await Transaction.create({
      user: userId,
      type: TransactionType.DEPOSIT,
      amount: amount,
      balanceBefore: user.walletBalance || 0,
      balanceAfter: (user.walletBalance || 0) + amount,
      status: PaymentStatus.PENDING,
      reference,
      description: `Wallet deposit of ₦${amount.toLocaleString()}`,
      metadata: {
        paystackReference: reference,
        depositType: 'card',
      },
    });

    logger.info(`Wallet deposit initialized: ${reference} for user ${userId}`);

    return {
      authorizationUrl: authorization_url,
      reference,
      accessCode: access_code,
    };
  }

  /**
   * Verify wallet deposit
   */
  public async verifyDeposit(reference: string): Promise<{
    success: boolean;
    transaction: ITransaction;
    newBalance: number;
  }> {
    // Verify with Paystack
    const paystackResponse = await axios.get(
      `${this.paystackBaseUrl}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
        },
      }
    );

    const { status } = paystackResponse.data.data;

    // Find transaction
    const transaction = await Transaction.findOne({ reference });
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (status === 'success') {
      // Update transaction
      transaction.status = PaymentStatus.COMPLETED;
      await transaction.save();

      // Credit user wallet
      const user = await User.findById(transaction.user);
      if (user) {
        const previousBalance = user.walletBalance || 0;
        user.walletBalance = previousBalance + transaction.amount;
        await user.save();

        // Update transaction balance
        transaction.balanceAfter = user.walletBalance;
        await transaction.save();

        // ✅ Notify user about successful deposit
        try {
          await notificationHelper.notifyWalletCredited(
            transaction,
            user._id.toString()
          );
        } catch (error) {
          logger.error('Failed to notify about deposit:', error);
        }

        logger.info(`Wallet funded: ${reference} - ₦${transaction.amount}`);

        return {
          success: true,
          transaction,
          newBalance: user.walletBalance,
        };
      }
    }

    // Failed deposit
    transaction.status = PaymentStatus.FAILED;
    await transaction.save();

    throw new BadRequestError('Deposit verification failed');
  }

  // ==================== TRANSACTIONS ====================

  /**
   * Get wallet transactions
   */
  public async getTransactions(
    userId: string,
    filters?: {
      type?: TransactionType;
      status?: PaymentStatus;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{
    transactions: ITransaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = { user: userId };

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('booking', 'service scheduledDate status')
        .populate('order', 'orderNumber status')
        .populate('withdrawal', 'status bankName accountNumber'),
      Transaction.countDocuments(query),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get wallet statistics
   */
  public async getWalletStats(userId: string): Promise<any> {
    const balance = await this.getBalance(userId);

    const [
      totalDeposits,
      totalEarnings,
      totalWithdrawals,
      totalSpent,
      pendingWithdrawals,
    ] = await Promise.all([
      // Total deposits
      Transaction.aggregate([
        {
          $match: {
            user: userId as any,
            type: TransactionType.DEPOSIT,
            status: PaymentStatus.COMPLETED,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Total earnings
      Transaction.aggregate([
        {
          $match: {
            user: userId as any,
            type: {
              $in: [
                TransactionType.BOOKING_EARNING,
                TransactionType.ORDER_EARNING,
                TransactionType.PAYMENT_RECEIVED,
              ],
            },
            status: PaymentStatus.COMPLETED,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Total withdrawals
      Transaction.aggregate([
        {
          $match: {
            user: userId as any,
            type: TransactionType.WITHDRAWAL,
            status: PaymentStatus.COMPLETED,
          },
        },
        { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
      ]),
      // Total spent
      Transaction.aggregate([
        {
          $match: {
            user: userId as any,
            type: {
              $in: [TransactionType.BOOKING_PAYMENT, TransactionType.ORDER_PAYMENT],
            },
            status: PaymentStatus.COMPLETED,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Pending withdrawals
      Withdrawal.aggregate([
        { $match: { user: userId as any, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      currentBalance: balance.balance,
      totalDeposits: totalDeposits[0]?.total || 0,
      totalEarnings: totalEarnings[0]?.total || 0,
      totalWithdrawals: totalWithdrawals[0]?.total || 0,
      totalSpent: totalSpent[0]?.total || 0,
      pendingWithdrawals: pendingWithdrawals[0]?.total || 0,
      availableBalance: balance.balance - (pendingWithdrawals[0]?.total || 0),
    };
  }

  // ==================== WITHDRAWALS ====================

  /**
   * Request withdrawal
   */
  public async requestWithdrawal(
    userId: string,
    data: {
      amount: number;
      bankName: string;
      accountNumber: string;
      accountName: string;
      pin: string;
    }
  ): Promise<IWithdrawal> {
    // Get user
    const user = await User.findById(userId).select('+withdrawalPin');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if vendor
    if (!user.isVendor) {
      throw new BadRequestError('Only vendors can withdraw funds');
    }

    // Verify withdrawal PIN
    const bcrypt = require('bcryptjs');
    if (!user.withdrawalPin) {
      throw new BadRequestError('Please set up your withdrawal PIN first');
    }

    const isPinValid = await bcrypt.compare(data.pin, user.withdrawalPin);
    if (!isPinValid) {
      throw new BadRequestError('Invalid withdrawal PIN');
    }

    // Check balance
    const balance = user.walletBalance || 0;
    if (balance < data.amount) {
      throw new BadRequestError('Insufficient wallet balance');
    }

    // Check minimum withdrawal
    if (data.amount < 1000) {
      throw new BadRequestError('Minimum withdrawal is ₦1,000');
    }

    // Generate reference
    const reference = `WTH-${Date.now()}-${generateRandomString(8)}`;

    // Calculate withdrawal fee
    const withdrawalFee = 100;
    const netAmount = data.amount - withdrawalFee;

    // Create withdrawal request
    const withdrawal = await Withdrawal.create({
      user: userId,
      amount: data.amount,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      accountName: data.accountName,
      reference,
      withdrawalFee,
      netAmount,
      status: 'pending',
      requestedAt: new Date(),
    });

    // Deduct from wallet balance (held until processed)
    const previousBalance = user.walletBalance || 0;
    user.walletBalance = balance - data.amount;
    await user.save();

    // Create transaction record
    await Transaction.create({
      user: userId,
      type: TransactionType.WITHDRAWAL,
      amount: data.amount,
      balanceBefore: previousBalance,
      balanceAfter: user.walletBalance,
      status: PaymentStatus.PENDING,
      reference: `TXN-WTH-${Date.now()}-${generateRandomString(8)}`,
      description: `Withdrawal to ${data.bankName} - ${data.accountNumber}`,
      withdrawal: withdrawal._id,
      metadata: {
        withdrawalFee,
        netAmount,
      },
    });

    logger.info(`Withdrawal requested: ${reference} by user ${userId}`);

    return withdrawal;
  }

  /**
   * Process withdrawal (Admin)
   */
  public async processWithdrawal(
    withdrawalId: string,
    adminId: string
  ): Promise<IWithdrawal> {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      throw new NotFoundError('Withdrawal not found');
    }

    if (withdrawal.status !== 'pending') {
      throw new BadRequestError('Only pending withdrawals can be processed');
    }

    withdrawal.status = 'processing';
    withdrawal.processedBy = adminId as any;
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    try {
      // Create transfer recipient
      const recipientResponse = await axios.post(
        `${this.paystackBaseUrl}/transferrecipient`,
        {
          type: 'nuban',
          name: withdrawal.accountName,
          account_number: withdrawal.accountNumber,
          bank_code: this.getBankCode(withdrawal.bankName),
          currency: 'NGN',
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const recipientCode = recipientResponse.data.data.recipient_code;
      withdrawal.paystackRecipientCode = recipientCode;
      await withdrawal.save();

      // Initiate transfer
      const transferResponse = await axios.post(
        `${this.paystackBaseUrl}/transfer`,
        {
          source: 'balance',
          amount: withdrawal.netAmount * 100,
          recipient: recipientCode,
          reference: withdrawal.reference,
          reason: `SharpPay withdrawal`,
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const transferCode = transferResponse.data.data.transfer_code;
      withdrawal.paystackTransferCode = transferCode;
      await withdrawal.save();

      logger.info(`Withdrawal transfer initiated: ${withdrawal.reference}`);
    } catch (error: any) {
      withdrawal.status = 'failed';
      withdrawal.failedAt = new Date();
      withdrawal.failureReason = error.message;
      await withdrawal.save();

      // Refund to wallet
      const user = await User.findById(withdrawal.user);
      if (user) {
        user.walletBalance = (user.walletBalance || 0) + withdrawal.amount;
        await user.save();

        // Update transaction
        await Transaction.updateOne(
          { withdrawal: withdrawal._id },
          { status: PaymentStatus.FAILED }
        );
      }

      logger.error(`Withdrawal failed: ${withdrawal.reference}`, error);
    }

    return withdrawal;
  }

  /**
   * Reject withdrawal (Admin)
   */
  public async rejectWithdrawal(
    withdrawalId: string,
    adminId: string,
    reason: string
  ): Promise<IWithdrawal> {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      throw new NotFoundError('Withdrawal not found');
    }

    if (withdrawal.status !== 'pending') {
      throw new BadRequestError('Only pending withdrawals can be rejected');
    }

    withdrawal.status = 'rejected';
    withdrawal.rejectedAt = new Date();
    withdrawal.rejectionReason = reason;
    withdrawal.processedBy = adminId as any;
    await withdrawal.save();

    // Refund to wallet
    const user = await User.findById(withdrawal.user);
    if (user) {
      user.walletBalance = (user.walletBalance || 0) + withdrawal.amount;
      await user.save();

      // Update transaction
      await Transaction.updateOne(
        { withdrawal: withdrawal._id },
        { status: PaymentStatus.REFUNDED }
      );
    }

    logger.info(`Withdrawal rejected: ${withdrawal.reference}`);

    return withdrawal;
  }

  /**
   * Get withdrawal by ID
   */
  public async getWithdrawalById(withdrawalId: string, userId: string): Promise<IWithdrawal> {
    const withdrawal = await Withdrawal.findById(withdrawalId).populate(
      'user',
      'firstName lastName email'
    );

    if (!withdrawal) {
      throw new NotFoundError('Withdrawal not found');
    }

    if (withdrawal.user._id.toString() !== userId) {
      throw new BadRequestError('Not authorized to view this withdrawal');
    }

    return withdrawal;
  }

  /**
   * Get user withdrawals
   */
  public async getUserWithdrawals(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    withdrawals: IWithdrawal[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { skip } = parsePaginationParams(page, limit);

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find({ user: userId }).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Withdrawal.countDocuments({ user: userId }),
    ]);

    return {
      withdrawals,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all withdrawals (Admin)
   */
  public async getAllWithdrawals(
    filters?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{
    withdrawals: IWithdrawal[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(query)
        .populate('user', 'firstName lastName email vendorProfile')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Withdrawal.countDocuments(query),
    ]);

    return {
      withdrawals,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== HELPERS ====================

  /**
   * Helper: Get bank code from bank name
   */
  private getBankCode(bankName: string): string {
    const bankCodes: { [key: string]: string } = {
      'Access Bank': '044',
      'GTBank': '058',
      'First Bank': '011',
      'UBA': '033',
      'Zenith Bank': '057',
      'Fidelity Bank': '070',
      'FCMB': '214',
      'Sterling Bank': '232',
      'Union Bank': '032',
      'Wema Bank': '035',
      'Polaris Bank': '076',
      'Stanbic IBTC': '221',
      'Standard Chartered': '068',
      'Keystone Bank': '082',
      'Unity Bank': '215',
      'Jaiz Bank': '301',
      'Heritage Bank': '030',
      'Ecobank': '050',
      'Kuda Bank': '50211',
      'Opay': '999992',
      'Palmpay': '999991',
      'Moniepoint': '50515',
    };

    return bankCodes[bankName] || '044';
  }
}

export default new SharpPayService();