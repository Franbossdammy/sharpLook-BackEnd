import axios from 'axios';
import User from '../models/User';
import Transaction, { ITransaction } from '../models/Transaction';
import Withdrawal, { IWithdrawal } from '../models/Withdrawal';
import config from '../config';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { generateRandomString, parsePaginationParams } from '../utils/helpers';
import { TransactionType, PaymentStatus } from '../types';
import logger from '../utils/logger';

class WalletService {
  private paystackSecretKey: string;
  private paystackBaseUrl: string;

  constructor() {
    this.paystackSecretKey = config.paystack.secretKey;
    this.paystackBaseUrl = 'https://api.paystack.co';
  }

  /**
   * Get wallet balance
   */
  public async getBalance(userId: string): Promise<number> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user.walletBalance || 0;
  }

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
        .populate('booking', 'service scheduledDate'),
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
   * Request withdrawal
 // FIX: Update requestWithdrawal in wallet.service.ts
// The issue is that withdrawalPin is not being selected from the database

/**
 * Request withdrawal
 */
public async requestWithdrawal(
  userId: string,
  data: {
    amount: number;
    bankName: string;
        bankCode: string; // ✅ Get this from frontend

    accountNumber: string;
    accountName: string;
    pin: string;
  }
): Promise<IWithdrawal> {
  // ✅ FIX: Add .select('+withdrawalPin') to include the PIN field
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
  
  // ✅ Now this check will work correctly
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
    bankCode: data.bankCode, // ✅ Store it directly

    accountNumber: data.accountNumber,
    accountName: data.accountName,
    reference,
    withdrawalFee,
    netAmount,
    status: 'pending',
    requestedAt: new Date(),
  });

  // Deduct from wallet balance (held until processed)
  user.walletBalance = balance - data.amount;
  await user.save();

  // Create transaction record
  await Transaction.create({
    user: userId,
    type: TransactionType.WITHDRAWAL,
    amount: -data.amount,
    balanceBefore: balance,
    balanceAfter: user.walletBalance,
    status: PaymentStatus.PENDING,
    reference: `TXN-${Date.now()}-${generateRandomString(8)}`,
    description: `Withdrawal to ${data.bankName} - ${data.accountNumber}`,
    withdrawal: withdrawal._id,
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
    const bankCode = withdrawal.bankCode || this.getBankCode(withdrawal.bankName);
    
    // ✅ STEP 1: Verify the account details first
    logger.info(`Verifying account details for withdrawal: ${withdrawal.reference}`);
    
    const verifyResponse = await axios.get(
      `${this.paystackBaseUrl}/bank/resolve`,
      {
        params: {
          account_number: withdrawal.accountNumber,
          bank_code: bankCode,
        },
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
        },
      }
    );

    const verifiedAccountName = verifyResponse.data.data.account_name;
    
    // Optional: Check if names match
    logger.info(`Account verified: ${verifiedAccountName}`);
    
    // ✅ STEP 2: Create transfer recipient with verified details
    logger.info(`Creating transfer recipient for withdrawal: ${withdrawal.reference}`);
    
    const recipientResponse = await axios.post(
      `${this.paystackBaseUrl}/transferrecipient`,
      {
        type: 'nuban',
        name: verifiedAccountName, // Use the verified name from Paystack
        account_number: withdrawal.accountNumber,
        bank_code: bankCode,
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

    // ✅ STEP 3: Initiate transfer
    logger.info(`Initiating transfer for withdrawal: ${withdrawal.reference}`);
    
    const transferResponse = await axios.post(
      `${this.paystackBaseUrl}/transfer`,
      {
        source: 'balance',
        amount: withdrawal.netAmount * 100,
        recipient: recipientCode,
        reference: withdrawal.reference,
        reason: `Withdrawal for vendor`,
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
    if (axios.isAxiosError(error)) {
      logger.error(`Paystack API Error for withdrawal ${withdrawal.reference}:`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      const errorMessage = error.response?.data?.message || error.message;
      withdrawal.failureReason = errorMessage;
    } else {
      logger.error(`Withdrawal processing error for ${withdrawal.reference}:`, error);
      withdrawal.failureReason = error.message;
    }

    withdrawal.status = 'failed';
    withdrawal.failedAt = new Date();
    await withdrawal.save();

    // Refund to wallet
    const user = await User.findById(withdrawal.user);
    if (user) {
      user.walletBalance = (user.walletBalance || 0) + withdrawal.amount;
      await user.save();
      logger.info(`Refunded ${withdrawal.amount} to user ${user._id} wallet`);
    }

    throw error;
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

    // Check status
    if (withdrawal.status !== 'pending') {
      throw new BadRequestError('Only pending withdrawals can be rejected');
    }

    // Update status
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

    // Verify ownership (unless admin)
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

  /**
   * Get wallet statistics
   */
  public async getWalletStats(userId: string): Promise<any> {
    const balance = await this.getBalance(userId);

    const [totalReceived, totalWithdrawn, pendingWithdrawals] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            user: userId as any,
            type: { $in: [TransactionType.BOOKING_PAYMENT, TransactionType.DEPOSIT] },
            status: PaymentStatus.COMPLETED,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
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
      Withdrawal.aggregate([
        { $match: { user: userId as any, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      balance,
      totalReceived: totalReceived[0]?.total || 0,
      totalWithdrawn: totalWithdrawn[0]?.total || 0,
      pendingWithdrawals: pendingWithdrawals[0]?.total || 0,
    };
  }

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
    };

    return bankCodes[bankName] || '044'; // Default to Access Bank
  }
}

export default new WalletService();
