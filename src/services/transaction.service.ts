import Transaction, { ITransaction } from '../models/Transaction';
import User from '../models/User';
import { TransactionType, PaymentStatus } from '../types';
import { generateRandomString } from '../utils/helpers';
import { NotFoundError } from '../utils/errors';
import { parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';

class TransactionService {
  /**
   * Create a transaction record
   */
  public async createTransaction(data: {
    userId: string;
    type: TransactionType;
    amount: number;
    description: string;
    booking?: string;
    order?: string;
    payment?: string;
    withdrawal?: string;
    metadata?: any;
  }): Promise<ITransaction> {
    // Get user to check balance
    const user = await User.findById(data.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const balanceBefore = user.walletBalance || 0;
    
    // Calculate balance after based on transaction type.
    // BOOKING_PAYMENT and ORDER_PAYMENT are external card→escrow flows and
    // never touch the user's wallet, so walletBalance stays the same for those.
    let balanceAfter = balanceBefore;
    if ([
      TransactionType.BOOKING_EARNING,
      TransactionType.ORDER_EARNING,
      TransactionType.PAYMENT_RECEIVED,
      TransactionType.REFUND,
      TransactionType.BOOKING_REFUND,
      TransactionType.ORDER_REFUND,
      TransactionType.WALLET_CREDIT,
      TransactionType.DEPOSIT,
      TransactionType.ESCROW_RELEASE,
      TransactionType.REFERRAL_BONUS,
    ].includes(data.type)) {
      balanceAfter = balanceBefore + data.amount;
    } else if ([
      TransactionType.WITHDRAWAL,
      TransactionType.WITHDRAWAL_FEE,
      TransactionType.COMMISSION_DEDUCTION,
      TransactionType.PLATFORM_FEE,
      TransactionType.WALLET_DEBIT,
      TransactionType.ESCROW_LOCK,
      TransactionType.CANCELLATION_PENALTY,
    ].includes(data.type)) {
      balanceAfter = balanceBefore - data.amount;
    }
    // BOOKING_PAYMENT, ORDER_PAYMENT, SUBSCRIPTION_PAYMENT → wallet neutral (card→escrow)

    // Generate reference
    const reference = `TXN-${Date.now()}-${generateRandomString(8)}`;

    // Create transaction
    const transaction = await Transaction.create({
      user: data.userId,
      type: data.type,
      amount: data.amount,
      balanceBefore,
      balanceAfter,
      status: PaymentStatus.COMPLETED,
      reference,
      description: data.description,
      booking: data.booking,
      order: data.order,
      payment: data.payment,
      withdrawal: data.withdrawal,
      metadata: data.metadata,
    });

    logger.info(`Transaction created: ${reference} for user ${data.userId}`);

    return transaction;
  }

  /**
   * Get user transactions
   */
  public async getUserTransactions(
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
        .populate('booking', 'bookingNumber status')
        .populate('order', 'orderNumber status')
        .populate('payment', 'reference amount')
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

  /**
   * Get transaction statistics
   */
  public async getTransactionStats(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const query: any = { user: userId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const [
      totalIncome,
      totalExpense,
      totalBookingEarnings,
      totalOrderEarnings,
      totalWithdrawals,
      totalRefunds,
      transactionCount,
    ] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            ...query,
            type: {
              $in: [
                TransactionType.BOOKING_EARNING,
                TransactionType.ORDER_EARNING,
                TransactionType.PAYMENT_RECEIVED,
                TransactionType.WALLET_CREDIT,
              ],
            },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            ...query,
            type: {
              $in: [
                TransactionType.WITHDRAWAL,
                TransactionType.COMMISSION_DEDUCTION,
                TransactionType.WALLET_DEBIT,
              ],
            },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            ...query,
            type: TransactionType.BOOKING_EARNING,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            ...query,
            type: TransactionType.ORDER_EARNING,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            ...query,
            type: TransactionType.WITHDRAWAL,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            ...query,
            type: TransactionType.REFUND,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.countDocuments(query),
    ]);

    return {
      totalIncome: totalIncome[0]?.total || 0,
      totalExpense: totalExpense[0]?.total || 0,
      totalBookingEarnings: totalBookingEarnings[0]?.total || 0,
      totalOrderEarnings: totalOrderEarnings[0]?.total || 0,
      totalWithdrawals: totalWithdrawals[0]?.total || 0,
      totalRefunds: totalRefunds[0]?.total || 0,
      transactionCount,
      netIncome: (totalIncome[0]?.total || 0) - (totalExpense[0]?.total || 0),
    };
  }

  /**
   * Get transaction by ID
   */
  public async getTransactionById(
    transactionId: string,
    userId: string
  ): Promise<ITransaction> {
    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: userId,
    })
      .populate('booking', 'bookingNumber status')
      .populate('order', 'orderNumber status')
      .populate('payment', 'reference amount');

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    return transaction;
  }


  /**
 * Get all transactions (admin)
 */
public async getAllTransactions(
  filters?: {
    userId?: string;
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

  const query: any = {};

  if (filters?.userId) {
    query.user = filters.userId;
  }

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
      .populate('user', 'firstName lastName email phone')
      .populate({
        path: 'booking',
        select: 'bookingNumber status totalAmount bookingType servicePrice distanceCharge offer client vendor',
        populate: [
          { path: 'offer', select: 'title proposedPrice status' },
          { path: 'client', select: 'firstName lastName email' },
          { path: 'vendor', select: 'firstName lastName email' },
        ],
      })
      .populate('order', 'orderNumber status totalAmount')
      .populate('payment', 'reference amount status paymentMethod')
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

/**
 * Get platform transaction statistics (admin)
 */
public async getPlatformStats(
  startDate?: Date,
  endDate?: Date
): Promise<any> {
  const query: any = {};

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  const [
    totalTransactions,
    totalVolume,
    totalIncome,
    totalExpense,
    totalCommissions,
    totalWithdrawals,
    totalRefunds,
    bookingEarnings,
    orderEarnings,
    totalCreditsIssued,
    transactionsByType,
  ] = await Promise.all([
    Transaction.countDocuments(query),
    Transaction.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    // Income = real earned/received money (excludes manual credits which are platform debt)
    Transaction.aggregate([
      {
        $match: {
          ...query,
          type: {
            $in: [
              TransactionType.BOOKING_EARNING,
              TransactionType.ORDER_EARNING,
              TransactionType.PAYMENT_RECEIVED,
              TransactionType.DEPOSIT,       // user-funded wallet top-ups via card
              TransactionType.REFERRAL_BONUS,
            ],
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          ...query,
          type: {
            $in: [
              TransactionType.WITHDRAWAL,
              TransactionType.COMMISSION_DEDUCTION,
              TransactionType.WALLET_DEBIT,
            ],
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          ...query,
          type: TransactionType.COMMISSION_DEDUCTION,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          ...query,
          type: TransactionType.WITHDRAWAL,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          ...query,
          type: { $in: [TransactionType.REFUND, TransactionType.BOOKING_REFUND, TransactionType.ORDER_REFUND] },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          ...query,
          type: TransactionType.BOOKING_EARNING,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          ...query,
          type: TransactionType.ORDER_EARNING,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    // Credits issued = platform liability (money given to users, not earned)
    Transaction.aggregate([
      {
        $match: {
          ...query,
          type: TransactionType.WALLET_CREDIT,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const byType = transactionsByType.reduce((acc: any, item: any) => {
    acc[item._id] = {
      count: item.count,
      total: item.total,
    };
    return acc;
  }, {});

  const incomeTotal = totalIncome[0]?.total || 0;
  const expenseTotal = totalExpense[0]?.total || 0;
  const creditsTotal = totalCreditsIssued[0]?.total || 0;

  return {
    totalTransactions,
    totalVolume: totalVolume[0]?.total || 0,
    totalIncome: incomeTotal,
    totalExpense: expenseTotal,
    totalCommissions: totalCommissions[0]?.total || 0,
    totalWithdrawals: totalWithdrawals[0]?.total || 0,
    totalRefunds: totalRefunds[0]?.total || 0,
    bookingEarnings: bookingEarnings[0]?.total || 0,
    orderEarnings: orderEarnings[0]?.total || 0,
    totalCreditsIssued: creditsTotal,
    netRevenue: incomeTotal - expenseTotal - creditsTotal,
    byType,
  };
}

/**
 * Get transaction by ID (admin)
 */
public async getTransactionByIdAdmin(transactionId: string): Promise<ITransaction> {
  const transaction = await Transaction.findById(transactionId)
    .populate('user', 'firstName lastName email phone')
    .populate({
      path: 'booking',
      select: 'bookingNumber status totalAmount bookingType servicePrice distanceCharge offer client vendor clientNotes',
      populate: [
        { path: 'offer', select: 'title proposedPrice status description' },
        { path: 'client', select: 'firstName lastName email' },
        { path: 'vendor', select: 'firstName lastName email' },
      ],
    })
    .populate('order', 'orderNumber status totalAmount')
    .populate('payment', 'reference amount status paymentMethod');

  if (!transaction) {
    throw new NotFoundError('Transaction not found');
  }

  return transaction;
}
}

export default new TransactionService();